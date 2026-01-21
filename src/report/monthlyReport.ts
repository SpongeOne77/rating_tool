import {
    ActiveUnit,
    CompanyMonthlyReport,
    ReportMeta,
    CompanyScore,
    DeviceInfo,
    DeviceAlarmRankingItem,
    ScoreDetail, AlarmRecord,
} from "./types.ts";
import { generateReportHtml } from "./htmlTemplate.ts";
import { ensureDirExists } from "../exporter.ts";
import {DELAY_THRESHOLDS} from "../config.ts";
import {ProgressBar} from "../utils/progress.ts";
import {getAiRemark} from "../db.ts";

// 工具函数：格式化时长（分钟转天时分）
const formatDuration = (minutes: number): string => {
  if (!minutes || minutes < 0) return "0时0分";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.floor(minutes % 60);
  return `${days > 0 ? `${days}天` : ""}${
    hours > 0 ? `${hours}时` : ""
  }${mins}分`;
};

const getDeviceTypeChinese = (deviceType: string): string => {
    const typeMap: Record<string, string> = {
        'transmissionDevice': '用户传输装置',
        'fireControlHost': '火警报警主机'
    };
    return typeMap[deviceType] || deviceType;
};

// 生成单家公司月度报告
export async function generateCompanyReport(
    company: CompanyScore & { delayStats?: any },
    alarmRecords: AlarmRecord[],
    deviceData: DeviceInfo[],
    reportMeta: ReportMeta
): Promise<CompanyMonthlyReport> {
    // 计算告警统计
    const totalAlarms = company.alarmFrequency;
    const handledAlarms = alarmRecords.reduce((sum, stat) => {
        if (stat.disposedTime) {
            sum ++;
        }
        return sum;
    }, 0);
    const unhandledAlarms = totalAlarms - handledAlarms;
    const handlingRate = (company.alarmHandlingRate * 100).toFixed(1) + '%';

    // 计算平均响应时长（假设从alarmRecords中获取）
    const totalResponseMinutes = alarmRecords.reduce((sum, stat) => {
        const responseTime = DELAY_THRESHOLDS[stat.alarmType][stat.delayLevel] || 0;
        return sum += responseTime;
    }, 0);
    const avgResponseDuration = handledAlarms > 0
        ? formatDuration(Math.round(totalResponseMinutes / handledAlarms))
        : '0时0分';

    // 统计告警类型分布
    let typeMap: Record<string, number> = {};
    alarmRecords.forEach(stat => {
        typeMap[stat.alarmType] = (typeMap[stat.alarmType] || 0) + 1;
    });

    // 转换为排序后的告警类型统计
    const topAlarmTypes: AlarmTypeStats[] = Object.entries(typeMap)
        .map(([type, count]) => ({
            type,
            count,
            rate: ((count / totalAlarms) * 100).toFixed(1) + '%'
        }))
        .sort((a, b) => b.count - a.count);

    // 统计设备告警并排名（新增离线标记）
    const deviceAlarmMap: Record<string, {
        deviceId: string;
        deviceType: string;
        position: string;
        alarmCount: number;
        isOffline: boolean;
        offlineDuration: string;
    }> = {};

    // 先添加所有设备信息
    deviceData.forEach(device => {
        const isOffline = device.status === '2';
        let offlineDuration = '';

        if (isOffline && device.offlineTime) {
            try {
                const offlineTime = new Date(device.offlineTime);
                const now = new Date();
                const hours = Math.floor((now.getTime() - offlineTime.getTime()) / (1000 * 60 * 60));
                const days = Math.floor(hours / 24);

                if (days > 0) {
                    offlineDuration = `${days}天${hours % 24}小时`;
                } else {
                    offlineDuration = `${hours}小时`;
                }
            } catch {
                offlineDuration = '未知';
            }
        }

        deviceAlarmMap[device.companyId] = {
            deviceId: device.deviceId,
            deviceType: device.deviceType,
            position: device.position || '未知位置',
            alarmCount: 0,
            isOffline,
            offlineDuration
        };
    });

    alarmRecords.forEach(record => {
        const deviceId = record.deviceId;
        if (deviceAlarmMap[deviceId]) {
            deviceAlarmMap[deviceId].alarmCount++;
        } else {
            // 如果设备信息中没有，从告警记录创建
            deviceAlarmMap[deviceId] = {
                deviceId: deviceId,
                deviceType: '', // 未知设备类型
                position: record.devicePosition || '未知位置',
                alarmCount: 1,
                isOffline: false,
                offlineDuration: ''
            };
        }
    });

    // 转换为排序后的设备告警排名
    const deviceAlarmRanking: DeviceAlarmRankingItem[] = Object.values(deviceAlarmMap)
        .sort((a, b) => {
            // 离线设备排在最后
            if (a.isOffline && !b.isOffline) return 1;
            if (!a.isOffline && b.isOffline) return -1;
            // 同类型设备按告警数排序
            return b.alarmCount - a.alarmCount;
        })
        .map((device, index) => ({
            deviceId: device.deviceId,
            deviceType: device.deviceType,
            position: device.position,
            alarmCount: device.alarmCount,
            rank: index + 1,
            isOffline: device.isOffline,
            offlineDuration: device.offlineDuration
        }));

    // 构建评分详情
    const scoreDetail: ScoreDetail = {
        loginFrequency: company.loginFrequency,
        loginScore: Number(company.normalizedLoginFrequency.toFixed(2)),
        alarmFrequency: company.alarmFrequency,
        alarmScore: Number(company.normalizedAlarmFrequency.toFixed(2)),
        handlingRate: company.alarmHandlingRate * 100,
        handlingScore: Number(company.normalizedAlarmHandlingRate.toFixed(2)),
        timelinessWithDelay: company.timelinessWithDelay || 0,
        timelinessScore: Number(company.normalizedAlarmTimelinessRate.toFixed(2))
    };
//TODO add di comment
    let companyReport: CompanyMonthlyReport = {
        reportMeta,
        scoreOverview: {
            finalScore: company.finalScore,
            scoreLevel: company.scoreLevel,
            ranking: company.ranking,
            detail: scoreDetail,
            hasOfflineDevices: company.hasOfflineDevices,
            offlineDeviceCount: company.offlineDeviceCount,
            totalDeviceCount: company.totalDeviceCount

        },
        alarmStats: {
            total: totalAlarms,
            handled: handledAlarms,
            unhandled: unhandledAlarms,
            handlingRate,
            avgResponseDuration,
            topAlarmTypes,
            deviceAlarmRanking
        }
    };
    const aiReview = await getAiRemark(companyReport);
    console.log(aiReview);
    companyReport.aiComment = aiReview;
    return companyReport;
}

export async function batchGenerateReports(
    scoredCompanies: CompanyScore[],
    alarmDataMap: AlarmRecord[],
    deviceDataMap: DeviceInfo[],
    reportMonth: string
) {
    const reports: {companyId: string, companyName: string, html: string}[] = [];
    const length = scoredCompanies.length;

    const progressBar: ProgressBar = new ProgressBar({
        total: length,
        barLength: 30,
        prefix: "计算单位得分中",
        suffix: "所有单位得分计算完成"
    })

    for (let i = 0; i < scoredCompanies.length; i++) {
        const _companyId = scoredCompanies[i].companyId;
        const _companyName = scoredCompanies[i].companyName;
        const alarmRecords = alarmDataMap.filter(record => record.companyId === _companyId) || [];
        const deviceRecords = deviceDataMap.filter(device => device.companyId === _companyId) || [];
        const reportMeta: ReportMeta = {
            companyId: _companyId,
            companyName: _companyName,
            reportMonth,
            generateTime: new Date().toLocaleString(),
        };

        const report = await generateCompanyReport(scoredCompanies[i], alarmRecords, deviceRecords, reportMeta);
        const html = generateReportHtml(report);

        reports.push({
            companyId: _companyId,
            companyName: _companyName,
            html
        });
        progressBar.update()
    }
    progressBar.finish()
    return reports;
}

// 批量导出HTML报告
export async function exportBatchReports(
    reports: {companyId: string,companyName: string, html: string}[],
    outputDir: string = './reports',
    reportMonth: string
): Promise<string[]> {
    await ensureDirExists(outputDir);
    const filePaths: string[] = [];
    const progressBar = new ProgressBar({
        total: reports.length,
        barLength: 40,
        prefix: "【导出月度报告】",
        suffix: "月度报告导出完毕"
    });

    for (const report of reports) {
        const fileName = `${report.companyName}_${reportMonth}_report.html`.replaceAll("/", " ");
        const filePath = `${outputDir}/${fileName}`;

        await Deno.writeTextFile(filePath, report.html);
        filePaths.push(filePath);
        progressBar.update()
    }
    progressBar.finish()
    return filePaths;
}

// 导出无数据单位列表
export async function exportNoDataList(
    companies: ActiveUnit[],
    reportMonth: string,
    outputDir: string = './reports'
): Promise<string> {
    await ensureDirExists(outputDir);
    const filePath = `${outputDir}/无数据单位_${reportMonth}.txt`;

    const content = companies.map(c => `${c.id},${c.name}`).join('\n');
    await Deno.writeTextFile(filePath, content);
    return filePath;
}