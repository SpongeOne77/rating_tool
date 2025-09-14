// src/exporter.ts
import { CompanyScore } from './processor.ts';
import { format } from 'https://deno.land/std@0.192.0/datetime/mod.ts';

// 确保目录存在
export const ensureDirExists = async (dirPath: string) => {
  try {
    await Deno.stat(dirPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await Deno.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
};

// 导出为JSON文件
export const exportToJson = async (scores: CompanyScore[], outputDir = './output') => {
  await ensureDirExists(outputDir);
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filePath = `${outputDir}/scores_${timestamp}.json`;

  await Deno.writeTextFile(filePath, JSON.stringify(scores, null, 2));
  console.log(`评分结果已导出至 ${filePath}`);

  return filePath;
};

// 导出为CSV文件
export const exportToCsv = async (scores: CompanyScore[], outputDir = './output') => {
  await ensureDirExists(outputDir);
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filePath = `${outputDir}/scores_${timestamp}.csv`;

  const header = '企业名称,登录频次,告警频次,告警处理率(%),告警及时率(%),总分(%)\n';
  const rows = scores
    .map(
      (score) =>
        `${score.companyName},${score.loginFrequency},${score.alarmFrequency},${(
          score.alarmHandlingRate * 100
        ).toFixed(2)},${(score.alarmTimelinessRate * 100).toFixed(2)},${(score.finalScore).toFixed(2)}`
    )
    .join('\n');

  await Deno.writeTextFile(filePath, header + rows);
  console.log(`评分结果已导出至 ${filePath}`);

  return filePath;
};

// 打印评分摘要
export const printSummary = (scores: CompanyScore[]) => {
  console.log('\n===== 企业评分摘要 =====');

  const sortedScores = [...scores].sort((a, b) => b.finalScore - a.finalScore);

  sortedScores.forEach((score, index) => {
    console.log(`${index + 1}. 企业ID: ${score.companyId}, 总分: ${(score.finalScore).toFixed(2)}%`);
  });
};