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
  alarmType: string;
  delayLevel: number;
  deviceName: string;
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

export interface DeviceAlarmStats {
    deviceName: string;
    deviceLocation: string;
    total: number;
}

export interface AlarmTypeStats {
    alarmType: string;
    total: number;
}

export interface CompanyAlarmStats {
    companyId: string;
    topDeviceAlarms: DeviceAlarmStats[]; // 按设备统计top3
    alarmTypeStats: AlarmTypeStats[];    // 按告警类型统计
}

export interface CompanyData {
  companyId: string;
  companyName: string;
  loginData?: LoginRecord;
  alarmData: AlarmRecord[];
  deviceData: DeviceInfo[];
}

export interface ScoringConfig {
  weights: {
    loginFrequency: number;
    alarmFrequency: number;
    alarmHandlingRate: number;
    alarmTimelinessRate: number;
  };
  benchmarks: {
    loginFrequency: {
      excellent: number;
      good: number;
      baseline: number;
      poor: number;
    };
    alarmFrequency: {
      excellent: number;
      good: number;
      baseline: number;
      poor: number;
    };
  };
  offlineDevice: {
    longOfflineThresholdHours: number;
    offlineRatioThreshold: number;
    minDeviceCountForPenalty: number;
  };
}

export interface CompanyScore {
    companyId: string;
    companyName: string;
    loginFrequency: number;
    alarmFrequency: number;
    alarmHandlingRate: number;
    alarmTimelinessRate: number;
    normalizedLoginFrequency: number;
    normalizedAlarmFrequency: number;
    normalizedAlarmHandlingRate: number;
    normalizedAlarmTimelinessRate: number;
    weightedScore: number;
    finalScore: number;
    ranking: number;
    scoreLevel: string;
    hasOfflineDevices: boolean;
    offlineDeviceCount: number;
    totalDeviceCount: number;
    offlineRatio: number;
    alarmStats: CompanyAlarmStats[];
}

export interface ProcessingResult {
    scores: CompanyScore[];
    alarmData: AlarmRecord[];
    deviceData: DeviceInfo[];
    alarmStats: CompanyAlarmStats[];
}