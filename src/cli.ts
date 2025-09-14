// src/cli.ts
import { CompanyScore } from './processor.ts';
import { exportToCsv, exportToJson } from './exporter.ts';
import {
  bgMagenta,
  bgBlue,
  bold,
  cyan,
  green,
  magenta,
  red,
  yellow,
  gray,
  brightYellow,
  white,
} from 'https://deno.land/std@0.192.0/fmt/colors.ts';

const readLine = async (): Promise<string> => {
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf) || 0;
  return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

// 显示欢迎界面
export const showWelcome = () => {
  console.clear();

  // 赛博朋克风格标题
  console.log(bgMagenta('FIRE ALARM SCORING'));
  console.log(bgBlue(' '.repeat(80)));

  console.log(`
${cyan('>>')} 欢迎使用消防云平台评分系统 v2.0 ${cyan('<<')}
${magenta('>>')} Deno原生 · 赛博风格 · 数据驱动 ${magenta('<<')}
    `);
};

// 显示评分结果表格
export const showScoreTable = (scores: CompanyScore[]) => {
  console.clear();

  console.log(white('企业评分排名'));
  console.log(bgBlue(' '.repeat(80)));

  const sortedScores = [...scores].sort((a, b) => b.finalScore - a.finalScore);

  console.log(cyan(`
┌────────────┬────────────┬────────────┬────────────────┬────────────────┬─────────────┐
│ ${bold('登录频次').padEnd(10)} │ ${bold('告警频次').padEnd(10)} │ ${bold('告警处理率').padEnd(10)} │ ${bold('告警及时率').padEnd(14)} │ ${bold('总分').padEnd(11)} │ ${bold('企业ID').padEnd(45, '')}
├────────────┼────────────┼────────────┼────────────────┼────────────────┼─────────────┤`));

  sortedScores.forEach((score, index) => {
    const rankStyle =
      index === 0
        ? yellow
        : index === 1
          ? gray
          : index === 2
            ? brightYellow
            : white;
    const id = rankStyle(`#${index + 1}`.padEnd(13));
    const name = score.companyName;
    const login = score.loginFrequency.toString().padEnd(13);
    const alarm = score.alarmFrequency.toString().padEnd(13);
    const handlingRate = (score.alarmHandlingRate * 100).toFixed(1) + '%';
    const timelinessRate = (score.alarmTimelinessRate * 100).toFixed(1) + '%';

    const handlingRateColored = getRateColor(handlingRate);
    const timelinessRateColored = getRateColor(timelinessRate);
    const totalScore = getScoreColor(score.finalScore);

    console.log(
      `│ ${id.padEnd(10)} │ ${login.padEnd(10)} │ ${alarm.padEnd(10)} │ ${handlingRateColored.padEnd(10)} │ ${timelinessRateColored.padEnd(10)} │ ${totalScore.padEnd(10)} │  ${name} |`
    );
  });

  console.log(cyan(`└───────────────┴───────────────┴───────────────┴────────────────┴────────────────┴─────────────┘`));

  console.log(`
${magenta('评分说明：')}
- 登录频次：企业登录平台的次数
- 告警频次：企业收到的告警总数
- 告警处理率：已处理告警数/总告警数
- 告警及时率：按时处理的告警数/已处理告警数
`);
};

// 根据得分设置颜色
const getScoreColor = (score: number): string => {
  if (score >= 80) return green((score).toFixed(1) + '%');
  if (score >= 60) return yellow((score).toFixed(1) + '%');
  return red((score).toFixed(1) + '%');
};

// 根据比率设置颜色
const getRateColor = (rate: string): string => {
  const value = parseFloat(rate);
  if (value >= 90) return green(rate);
  if (value >= 70) return yellow(rate);
  return red(rate);
};

// 显示主菜单并返回用户选择
export const showMainMenu = async () => {
  console.log(magenta('>>') + ' 请选择操作：');
  console.log('1. 🔥 查看企业评分排名');
  console.log('2. 📊 导出评分数据');
  console.log('3. 🕒 查看历史记录');
  console.log('4. 🚪 退出系统');

  return await readLine();
};

// 导出数据
export const handleExportData = async (scores: CompanyScore[]) => {
  console.log(magenta('>>') + ' 选择导出格式：');
  console.log('1. JSON');
  console.log('2. CSV');
  console.log('3. 全部');

  const choice = await readLine();

  const results: string[] = [];

  if (choice === '1' || choice === '3') {
    const filePath = await exportToJson(scores);
    results.push(`JSON: ${filePath}`);
  }

  if (choice === '2' || choice === '3') {
    const filePath = await exportToCsv(scores);
    results.push(`CSV: ${filePath}`);
  }

  if (results.length > 0) {
    console.log(cyan('\n导出成功：'));
    results.forEach((result) => console.log(`- ${result}`));
  }
};

// 查看历史记录
export const handleViewHistory = async () => {
  const historyDir = './output';

  try {
    const files = Deno.readDir(historyDir);
    const scoreFiles = [];

    for await (const file of files) {
      if (file.isFile && (file.name.startsWith('scores_') && (file.name.endsWith('.json') || file.name.endsWith('.csv')))) {
        scoreFiles.push(file.name);
      }
    }

    if (scoreFiles.length === 0) {
      console.log(yellow('没有找到历史记录！'));
      return null;
    }

    console.log(magenta('>>') + ' 选择要查看的历史记录：');
    scoreFiles.forEach((file, index) => {
      const dateStr = file
        .replace('scores_', '')
        .replace('.json', '')
        .replace('.csv', '')
        .replace(/_/g, ' ')
        .replace(/-/g, ':');
      console.log(`${index + 1}. ${dateStr}`);
    });

    const answer = await readLine();
    const index = parseInt(answer.trim()) - 1;

    if (index >= 0 && index < scoreFiles.length) {
      const filePath = `${historyDir}/${scoreFiles[index]}`;

      if (filePath.endsWith('.json')) {
        const data = await Deno.readTextFile(filePath);
        const scores: CompanyScore[] = JSON.parse(data);
        return scores;
      }

      console.log(yellow('CSV格式暂不支持查看，请选择JSON格式的历史记录。'));
    } else {
      console.log(red('无效选择！'));
    }
  } catch (error) {
    console.error(red(`查看历史记录失败：${error}`));
  }

  return null;
};

// 等待用户确认
export const waitForConfirmation = async (message = '按Enter继续...') => {
  console.log(cyan(message));
  await readLine();
};