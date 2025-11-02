import { processData, separateCompaniesWithData } from "./processor.ts";
import { showWelcome } from "./cli.ts";
import { activeUnits } from "./mork.ts";
import { AlarmRecord, CompanyScore } from "./report/types.ts";
import {
  batchGenerateReports,
  exportBatchReports,
  exportNoDataList,
} from "./report/monthlyReport.ts";
import { exportToCsv } from "./exporter.ts";

async function main() {
  showWelcome();
  const startTime = "2025-09-23 00:00:00";
  const endTime = "2025-10-21 23:59:59";
  const reportMonth = "2025-10";

  const { scores: allScores, alarmData, deviceData } = await processData(
    startTime,
    endTime,
  );
  const { scored, noData } = separateCompaniesWithData(activeUnits, allScores);

  const baseMeta = {
    reportMonth,
    projectNo: "fc_v1",
    generateTime: new Date().toLocaleString(),
  };
  const report = await batchGenerateReports(scored, alarmData, deviceData || [], baseMeta);

  // export
  await exportToCsv(allScores);
  const reportPaths = await exportBatchReports(
    report,
    "./reports",
    reportMonth,
  );
  console.log(`已导出${reportPaths.length}份报告`);

  // export unit with no data
  if (noData.length > 0) {
    const noDataPath = await exportNoDataList(noData, reportMonth);
    console.log(`已导出无数据单位列表: ${noDataPath}`);
  }
  
  // 导出离线设备单位列表
  const offlineCompanies = allScores.filter(s => s.hasOfflineDevices);
  if (offlineCompanies.length > 0) {
    console.log(`\n⚠️  发现 ${offlineCompanies.length} 个单位存在大量离线设备，不参与排名：`);
    offlineCompanies.forEach(c => {
      console.log(`  - ${c.companyName}: ${c.offlineDeviceCount}/${c.totalDeviceCount} 台设备离线 (${(c.offlineRatio! * 100).toFixed(1)}%)`);
    });
  }
}

// 执行主程序
main().catch(console.error);
