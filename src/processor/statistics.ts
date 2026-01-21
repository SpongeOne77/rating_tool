import { AlarmRecord, CompanyAlarmStats, DeviceAlarmStats, AlarmTypeStats } from "./types.ts";
import { ALARM_SUB_TYPES } from "../config.ts";

/**
 * 计算告警统计数据 - Pipeline模式入口
 * @param alarmData 告警数据
 * @returns 公司告警统计数据数组
 */
export function calculateAlarmStats(alarmData: AlarmRecord[]): CompanyAlarmStats[] {
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
