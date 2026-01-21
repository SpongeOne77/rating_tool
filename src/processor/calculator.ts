import {AlarmRecord, AlarmTypeStats, CompanyAlarmStats, DeviceAlarmStats, DeviceInfo, ScoringConfig} from "./types.ts";
import {ALARM_SUB_TYPES} from "../config.ts";

export function calculateAlarmStats(alarmData: AlarmRecord[]): {
    totalAlarms: number;
    handledAlarms: number;
    unhandledAlarms: number;
    handlingRate: number;
    timelinessRate: number;
} {
    if (alarmData.length === 0) {
        return { totalAlarms: 0, handledAlarms: 0, unhandledAlarms: 0, handlingRate: 1, timelinessRate: 1 };
    }

    let handledAlarms = 0;
    let timelyHandledAlarms = 0;

    for (const alarm of alarmData) {
        if (alarm.disposedTime) {
            handledAlarms++;
            if (alarm.delayLevel === 0) {
                timelyHandledAlarms++;
            }
        }
    }

    const handlingRate = handledAlarms / alarmData.length;
    const timelinessRate = handledAlarms > 0 ? timelyHandledAlarms / handledAlarms : 0;

    return {
        totalAlarms: alarmData.length,
        handledAlarms,
        unhandledAlarms: alarmData.length - handledAlarms,
        handlingRate,
        timelinessRate
    };
}

/**
 * calculate offline device stats
 * @param deviceData
 */
export function calculateOfflineDeviceStats(deviceData: DeviceInfo[]): {
    totalDevices: number;
    offlineDevices: number;
    longOfflineDevices: number;
    offlineRatio: number;
    shouldPenalize: boolean;
} {
    if (deviceData.length === 0) {
        return { totalDevices: 0, offlineDevices: 0, longOfflineDevices: 0, offlineRatio: 0, shouldPenalize: false };
    }

    const now = new Date();
    let offlineDevices = 0;
    let longOfflineDevices = 0;

    for (const device of deviceData) {
        if (device.status === '2') { // 离线状态
            offlineDevices++;

            if (device.offlineTime) {
                const offlineTime = new Date(device.offlineTime);
                const offlineHours = (now.getTime() - offlineTime.getTime()) / (1000 * 60 * 60);

                if (offlineHours >= 72) { // 3天
                    longOfflineDevices++;
                }
            }
        }
    }

    const offlineRatio = longOfflineDevices / deviceData.length;
    const shouldPenalize = longOfflineDevices >= 2 && offlineRatio >= 0.5;

    return {
        totalDevices: deviceData.length,
        offlineDevices,
        longOfflineDevices,
        offlineRatio,
        shouldPenalize
    };
}

export function calculateLoginScore(loginFrequency: number, config: ScoringConfig): number {
    const { excellent, good, baseline, poor } = config.benchmarks.loginFrequency;

    if (loginFrequency >= excellent) return 100;
    if (loginFrequency >= good) return 80 + 20 * (loginFrequency - good) / (excellent - good);
    if (loginFrequency >= baseline) return 60 + 20 * (loginFrequency - baseline) / (good - baseline);
    if (loginFrequency >= poor) return 40 + 20 * (loginFrequency - poor) / (baseline - poor);
    if (loginFrequency > 0) return 20 + 20 * loginFrequency / poor;
    return 0;
}

// 告警频率评分（反向评分，越少越好）
export function calculateAlarmScore(alarmFrequency: number, config: ScoringConfig): number {
    const { excellent, good, baseline, poor } = config.benchmarks.alarmFrequency;

    if (alarmFrequency <= excellent) return 100;
    if (alarmFrequency <= good) return 90 + 10 * (good - alarmFrequency) / (good - excellent);
    if (alarmFrequency <= baseline) return 70 + 20 * (baseline - alarmFrequency) / (baseline - good);
    if (alarmFrequency <= poor) return 50 + 20 * (poor - alarmFrequency) / (poor - baseline);

    // 超过40次，按比例递减，最低20分
    const excessRatio = (alarmFrequency - poor) / poor;
    return Math.max(20, 50 - 30 * Math.min(1, excessRatio));
}

// 上下文感知的处理率评分
export function calculateHandlingScore(
    alarmCount: number,
    handlingRate: number,
    timelinessRate: number
): { handlingScore: number; timelinessScore: number } {
    if (alarmCount === 0) {
        return { handlingScore: 100, timelinessScore: 100 };
    }

    // 根据告警数量调整基础分和权重
    let baseScore = 0;
    let weight = 0;

    if (alarmCount <= 10) {
        baseScore = 70; weight = 0.3;
    } else if (alarmCount <= 20) {
        baseScore = 50; weight = 0.5;
    } else if (alarmCount <= 40) {
        baseScore = 30; weight = 0.7;
    } else {
        baseScore = 0; weight = 1.0;
    }

    const handlingScore = Math.min(100, baseScore + handlingRate * 100 * weight);
    const timelinessScore = Math.min(100, baseScore + timelinessRate * 100 * weight);

    return {
        handlingScore: Number(handlingScore.toFixed(2)),
        timelinessScore: Number(timelinessScore.toFixed(2))
    };
}

/**
 * 计算告警分布统计数据
 * @param alarmData 告警数据
 * @returns 公司告警统计数据数组
 */
export function calculateAlarmDistributionStats(alarmData: AlarmRecord[]): CompanyAlarmStats[] {
    // 按公司分组
    const alarmsByCompany = groupAlarmsByCompany(alarmData);

    // 转换为公司统计对象
    return Array.from(alarmsByCompany.entries()).map(([companyId, companyAlarms]) => {
        const deviceStats = calculateDeviceAlarmStats(companyAlarms);
        const typeStats = calculateAlarmTypeStats(companyAlarms);

        return {
            companyId,
            topDeviceAlarms: deviceStats.slice(0, 3), // 取top3
            alarmTypeStats: typeStats
        };
    });
}

/**
 * 按公司分组告警数据
 * @param alarmData 告警数据
 * @returns 按公司ID分组的告警数据Map
 */
function groupAlarmsByCompany(alarmData: AlarmRecord[]): Map<string, AlarmRecord[]> {
    const map = new Map<string, AlarmRecord[]>();

    for (const alarm of alarmData) {
        if (!map.has(alarm.companyId)) {
            map.set(alarm.companyId, []);
        }
        map.get(alarm.companyId)!.push(alarm);
    }

    return map;
}

/**
 * 计算设备告警统计数据
 * @param alarms 某公司的告警数据
 * @returns 设备告警统计数组（已按总数降序排列）
 */
function calculateDeviceAlarmStats(alarms: AlarmRecord[]): DeviceAlarmStats[] {
    const deviceMap = new Map<string, DeviceAlarmStats>();

    for (const alarm of alarms) {
        // 使用设备名称和位置作为唯一标识
        const key = `${alarm.deviceName}|${alarm.devicePosition}`;

        if (!deviceMap.has(key)) {
            deviceMap.set(key, {
                deviceName: alarm.deviceName,
                deviceLocation: alarm.devicePosition,
                total: 0
            });
        }
        deviceMap.get(key)!.total++;
    }

    // 按总数降序排列
    return Array.from(deviceMap.values())
        .sort((a, b) => b.total - a.total);
}

/**
 * 计算告警类型统计数据
 * @param alarms 某公司的告警数据
 * @returns 告警类型统计数组（已按总数降序排列）
 */
function calculateAlarmTypeStats(alarms: AlarmRecord[]): AlarmTypeStats[] {
    // 创建子类型码到名称的映射
    const subtypeMap = new Map<string, string>();
    for (const subtype of ALARM_SUB_TYPES) {
        subtypeMap.set(subtype.CODE, subtype.NAME);
    }

    const typeMap = new Map<string, AlarmTypeStats>();

    for (const alarm of alarms) {
        // 优先使用子类型映射，否则使用原告警类型
        const displayType = subtypeMap.get(alarm.subType) || alarm.alarmType;

        if (!typeMap.has(displayType)) {
            typeMap.set(displayType, {
                alarmType: displayType,
                total: 0
            });
        }
        typeMap.get(displayType)!.total++;
    }

    // 按总数降序排列
    return Array.from(typeMap.values())
        .sort((a, b) => b.total - a.total);
}