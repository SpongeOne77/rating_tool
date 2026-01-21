export interface ActiveUnit {
    id: string;
    name: string;
}

export interface LoginRecord {
    companyId: string;
    companyName: string;
    loginFrequency: number;
}
export interface AlarmRecord {
    companyId: string;
    companyName: string;
    alarmType: string;
    delayLevel: number;
    alarmTime: string;
    disposedTime: string | null;
    deviceId: string;
    devicePosition: string;
    subType: string;
}

export interface DeviceInfo {
    companyId: string;
    deviceId: string;
    deviceType: string;
    position: string;
    status: string;
    offlineTime: string;
}

export interface ReportMeta {
    companyId: string;
    companyName: string;
    reportMonth: string;
    generateTime: string;
}

export interface ScoreDetail {
    loginFrequency: number;
    loginScore: number;
    alarmFrequency: number;
    alarmScore: number;
    handlingRate: number;
    handlingScore: number;
    timelinessWithDelay: number;
    timelinessScore: number;
}

export interface ScoreOverview {
    finalScore: number;
    scoreLevel: string;
    ranking: number;
    detail: ScoreDetail;
}

export interface AlarmTypeStats {
    type: string;
    count: number;
    rate: string;
}

export interface AlarmStats {
    total: number;
    handled: number;
    unhandled: number;
    handlingRate: string;
    avgResponseDuration: string;
    topAlarmTypes: AlarmTypeStats[];
    deviceAlarmRanking: DeviceAlarmRankingItem[];
}

export interface CompanyMonthlyReport {
    reportMeta: ReportMeta;
    scoreOverview: ScoreOverview;
    alarmStats: AlarmStats;
    aiComment?: string;
}

// 新增逾期时长统计接口
export interface DelayStats {
    totalDelayMinutes: number;
    delayLevel1: number; // 一级逾期时长
    delayLevel2: number; // 二级逾期时长
    delayLevel3: number; // 三级逾期时长
}



export interface DeviceAlarmRankingItem {
    deviceId: string;
    deviceType: string;
    position: string;
    alarmCount: number;
    rank: number;
    isOffline?: boolean; // 新增：标记离线设备
    offlineDuration?: string; // 新增：离线时长
}

export interface CompanyScore {
    companyName: string;
    companyId: string;
    loginFrequency: number;
    alarmFrequency: number;
    alarmHandlingRate: number;
    alarmTimelinessRate: number;
    normalizedLoginFrequency: number;
    normalizedAlarmFrequency: number;
    normalizedAlarmHandlingRate: number;
    normalizedAlarmTimelinessRate: number;
    scoreLevel: string;
    weightedScore: number;
    finalScore: number;
    ranking: number;
    hasOfflineDevices?: boolean; // 新增：是否有离线设备
    offlineDeviceCount?: number; // 新增：离线设备数量
    totalDeviceCount?: number; // 新增：总设备数量
    offlineRatio?: number; // 新增：离线设备比例
}