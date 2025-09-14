import { processData } from './processor.ts';
import {
  showWelcome,
  showMainMenu,
  showScoreTable,
  handleExportData,
  handleViewHistory,
  waitForConfirmation,
} from './cli.ts';
import {
  bgBlue,
  red,
  white,
} from 'https://deno.land/std@0.192.0/fmt/colors.ts';

async function main() {
  try {
    showWelcome();

    // 处理数据
    const scores = await processData('2025-09-01 00:00:00', '2025-09-08 23:59:59');

    // 主循环
    let currentScores = scores;

    while (true) {
      const action = await showMainMenu();

      switch (action) {
        case '1':
        case 'showScores':
          showScoreTable(currentScores);
          await waitForConfirmation();
          break;

        case '2':
        case 'exportData':
          // 需要文件写入权限
          await handleExportData(currentScores);
          await waitForConfirmation();
          break;

        case '3':
        case 'viewHistory':
          const historyScores = await handleViewHistory();
          if (historyScores) {
            currentScores = historyScores;
            showScoreTable(currentScores);
            await waitForConfirmation();
            currentScores = scores; // 恢复当前评分
          } else {
            await waitForConfirmation();
          }
          break;

        case '4':
        case 'exit':
          console.log(white('\n感谢使用消防云平台评分系统！'));
          console.log(bgBlue(' '.repeat(80)));
          return;

        default:
          console.log(red('无效选择，请重新输入！'));
          await waitForConfirmation();
      }
    }
  } catch (error) {
    console.error(red(`程序执行出错:${error}`));
    Deno.exit(1);
  }
}

// 执行主程序
main();