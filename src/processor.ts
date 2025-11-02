// src/processor.ts
import {SCORING_WEIGHTS, SCORING_BENCHMARKS, OFFLINE_DEVICE_CONFIG} from "./config.ts";
import {ActiveUnit, AlarmRecord, CompanyScore, DelayStats, LoginRecord, DeviceInfo} from "./report/types.ts";
import {activeUnits} from "./mork.ts";
import {getCompanyAlarmData, getCompanyLoginData, getDeviceInfo} from "./db.ts";

// 计算逾期统计
function calculateDelayStats(alarmStats: AlarmRecord[]): DelayStats {
    let totalDelayMinutes = 0;
    let delayLevel1 = 0;
    let delayLevel2 = 0;
    let delayLevel3 = 0;

    alarmStats.forEach(stat => {
        // 假设每个级别对应不同的基础时长，实际值需根据业务调整
        const baseMinutes = stat.delayLevel === 1 ? 60 :
            stat.delayLevel === 2 ? 120 : 240;
        const delayMinutes = baseMinutes * (stat.totalAlarms - stat.handledAlarms);

        totalDelayMinutes += delayMinutes;

        if (stat.delayLevel === 1) delayLevel1 += delayMinutes;
        else if (stat.delayLevel === 2) delayLevel2 += delayMinutes;
        else if (stat.delayLevel === 3) delayLevel3 += delayMinutes;
    });

    return { totalDelayMinutes, delayLevel1, delayLevel2, delayLevel3 };
}

/**
 * process data and calculate scores for each company
 */
export async function processData(
  startTime: string,
  endTime: string,
): Promise<{ scores: CompanyScore[], alarmData: AlarmRecord[], deviceData: DeviceInfo[] }> {
  let _activeUnitIds: string[] = activeUnits.map((unit) => unit.id);
  const [loginData, alarmStats, deviceData] = await Promise.all([
    getCompanyLoginData(startTime, endTime, _activeUnitIds),
    getCompanyAlarmData(startTime, endTime, _activeUnitIds),
    getDeviceInfo(_activeUnitIds), // 新增：获取设备数据
  ]);

    let _companyScores: CompanyScore[] = []
    activeUnits.forEach((unit) => {
        const _loginData = loginData.filter(data => data.companyId === unit.id);
        const _alarmStats: AlarmRecord[] = alarmStats.filter(data => data.companyId === unit.id);
        const _deviceData: DeviceInfo[] = deviceData?.filter(data => data.COMPANY_ID === unit.id) || [];
        
        const score = calculateCompanyScore(unit.id, unit.name, _loginData, _alarmStats, _deviceData);
        _companyScores.push(score);
    })

    return {
        scores: normalizeAndRankScores(_companyScores),
        alarmData: alarmStats,
        deviceData: deviceData || []
    };
}

/**
 * 检测设备是否长期离线
 */
function isDeviceLongOffline(device: DeviceInfo): boolean {
    if (device.STATUS !== '2') return false; // 不是离线状态
    
    if (!device.OFFLINE_TIME) return false;
    
    try {
        const offlineTime = new Date(device.OFFLINE_TIME);
        const now = new Date();
        const offlineHours = (now.getTime() - offlineTime.getTime()) / (1000 * 60 * 60);
        
        return offlineHours >= OFFLINE_DEVICE_CONFIG.longOfflineThresholdHours;
    } catch {
        return false;
    }
}

/**
 * 计算离线设备统计信息
 */
function calculateOfflineDeviceStats(devices: DeviceInfo[]): {
    totalDevices: number;
    offlineDevices: number;
    longOfflineDevices: number;
    offlineRatio: number;
    shouldPenalize: boolean;
} {
    if (devices.length === 0) {
        return {
            totalDevices: 0,
            offlineDevices: 0,
            longOfflineDevices: 0,
            offlineRatio: 0,
            shouldPenalize: false
        };
    }
    
    const offlineDevices = devices.filter(d => d.STATUS === '2');
    const longOfflineDevices = offlineDevices.filter(d => isDeviceLongOffline(d));
    const offlineRatio = longOfflineDevices.length / devices.length;
    
    // 判断是否应该标记（长期离线设备超过阈值）
    const shouldPenalize = 
        longOfflineDevices.length >= OFFLINE_DEVICE_CONFIG.minDeviceCountForPenalty &&
        offlineRatio >= OFFLINE_DEVICE_CONFIG.offlineRatioThreshold;
    
    return {
        totalDevices: devices.length,
        offlineDevices: offlineDevices.length,
        longOfflineDevices: longOfflineDevices.length,
        offlineRatio,
        shouldPenalize
    };
}

// 计算单家公司评分（包含离线设备检测）
function calculateCompanyScore(
    companyId: string,
    companyName: string,
    loginData: LoginRecord[],
    alarmStats: AlarmRecord[],
    deviceData: DeviceInfo[]
): CompanyScore & { delayStats: DelayStats } {
    // 获取登录数据
    const loginRecord = loginData.find(r => r.companyId === companyId) || {
        companyId,
        companyName,
        loginFrequency: 0
    };

    // 计算离线设备统计
    const offlineStats = calculateOfflineDeviceStats(deviceData);

    // 计算告警统计
    const totalAlarms = alarmStats.length || 0;
    const handledAlarms = alarmStats.reduce((sum, stat) => {
        if (stat.disposedTime) {
            sum += 1;
        }
        return sum;
    }, 0);
    const timelyHandled = alarmStats.reduce((sum, stat) => {
        if (stat.delayLevel === '0') {
            sum +=1;
        }
        return sum;
    }, 0);

    // 计算处理率和及时率
    const alarmHandlingRate = totalAlarms > 0 ? handledAlarms / totalAlarms : 1.0;
    const alarmTimelinessRate = totalAlarms > 0 
        ? (handledAlarms > 0 ? timelyHandled / handledAlarms : 0) 
        : 1.0;

    // 计算逾期统计
    const delayStats = calculateDelayStats(alarmStats);

    // 计算及时处理得分
    const maxPossibleDelay = 30 * 24 * 60;
    const timelinessWithDelay = totalAlarms > 0 
        ? Math.max(0, 100 - (delayStats.totalDelayMinutes / maxPossibleDelay) * 100)
        : 100;

    return {
        companyId,
        companyName,
        loginFrequency: loginRecord.loginFrequency,
        alarmFrequency: totalAlarms,
        alarmHandlingRate,
        alarmTimelinessRate,
        normalizedLoginFrequency: 0,
        normalizedAlarmFrequency: 0,
        normalizedAlarmHandlingRate: 0,
        normalizedAlarmTimelinessRate: 0,
        weightedScore: 0,
        finalScore: 0,
        ranking: 0,
        scoreLevel: "",
        delayStats,
        timelinessWithDelay,
        // 新增：离线设备信息
        hasOfflineDevices: offlineStats.shouldPenalize,
        offlineDeviceCount: offlineStats.longOfflineDevices,
        totalDeviceCount: offlineStats.totalDevices,
        offlineRatio: offlineStats.offlineRatio
    };
}

// 标准化评分并计算排名（处理离线设备）
function normalizeAndRankScores(scores: CompanyScore[]): CompanyScore[] {
    if (scores.length === 0) return [];

    // 分离有大量离线设备的公司和正常公司
    const normalScores = scores.filter(s => !s.hasOfflineDevices);
    const offlineScores = scores.filter(s => s.hasOfflineDevices);

    // 对正常公司进行标准化评分
    normalScores.forEach(score => {
        score.normalizedLoginFrequency = calculateLoginScore(score.loginFrequency);
        score.normalizedAlarmFrequency = calculateAlarmFrequencyScore(score.alarmFrequency);

        const handlingScores = calculateContextAwareHandlingScores(
            score.alarmFrequency,
            score.alarmHandlingRate,
            score.alarmTimelinessRate
        );
        
        score.normalizedAlarmHandlingRate = handlingScores.handlingScore;
        score.normalizedAlarmTimelinessRate = handlingScores.timelinessScore;

        score.weightedScore = Number((
            score.normalizedLoginFrequency * SCORING_WEIGHTS.loginFrequency +
            score.normalizedAlarmFrequency * SCORING_WEIGHTS.alarmFrequency +
            score.normalizedAlarmHandlingRate * SCORING_WEIGHTS.alarmHandlingRate +
            score.normalizedAlarmTimelinessRate * SCORING_WEIGHTS.alarmTimelinessRate
        ).toFixed(2));
    });

    // 对离线设备公司：给予"不参与排名"标记
    offlineScores.forEach(score => {
        score.normalizedLoginFrequency = 0;
        score.normalizedAlarmFrequency = 0;
        score.normalizedAlarmHandlingRate = 0;
        score.normalizedAlarmTimelinessRate = 0;
        score.weightedScore = 0;
        score.finalScore = 0;
        score.scoreLevel = "设备离线";
        score.ranking = 9999; // 不参与排名
    });

    // 对正常公司排序
    const sortedNormalScores = [...normalScores].sort((a, b) => b.weightedScore - a.weightedScore);

    sortedNormalScores.forEach((score, index) => {
        score.ranking = index + 1;
        score.finalScore = Number(score.weightedScore.toFixed(2));
        score.scoreLevel = getScoreLevel(score.finalScore);
    });

    // 合并结果：正常公司在前，离线公司在后
    return [...sortedNormalScores, ...offlineScores];
}


/**
 * 上下文感知的处理率评分
 * 当告警数量很少时，不应过度惩罚未处理的告警
 */
function calculateContextAwareHandlingScores(
    alarmCount: number,
    handlingRate: number,
    timelinessRate: number
): { handlingScore: number; timelinessScore: number } {
    
    // 如果没有告警，给满分
    if (alarmCount === 0) {
        return {
            handlingScore: 100,
            timelinessScore: 100
        };
    }
    
    // 计算未处理告警数量
    const unhandledCount = Math.round(alarmCount * (1 - handlingRate));
    
    // 定义告警数量的影响权重
    // 告警越少，处理率的权重越低，基础分越高
    let baseHandlingScore = 0;
    let baseTimelinessScore = 0;
    let handlingRateWeight = 0;
    let timelinessRateWeight = 0;
    
    if (alarmCount <= 10) {
        // 1-10个告警：给予较高基础分，处理率影响较小
        baseHandlingScore = 70;
        baseTimelinessScore = 70;
        handlingRateWeight = 0.3;
        timelinessRateWeight = 0.3;
    } else if (alarmCount <= 20) {
        // 10-20个告警：中等基础分，处理率影响适中
        baseHandlingScore = 50;
        baseTimelinessScore = 50;
        handlingRateWeight = 0.5;
        timelinessRateWeight = 0.5;
    } else if (alarmCount <= 40) {
        // 20-40个告警：较低基础分，处理率影响较大
        baseHandlingScore = 30;
        baseTimelinessScore = 30;
        handlingRateWeight = 0.7;
        timelinessRateWeight = 0.7;
    } else {
        // >40个告警：无基础分，完全由处理率决定
        baseHandlingScore = 0;
        baseTimelinessScore = 0;
        handlingRateWeight = 1.0;
        timelinessRateWeight = 1.0;
    }
    
    // 计算最终得分
    const handlingScore = Number((
        baseHandlingScore + handlingRate * 100 * handlingRateWeight
    ).toFixed(2));
    
    const timelinessScore = Number((
        baseTimelinessScore + timelinessRate * 100 * timelinessRateWeight
    ).toFixed(2));
    
    return {
        handlingScore: Math.min(100, handlingScore),
        timelinessScore: Math.min(100, timelinessScore)
    };
}

/**
 * 计算登录频率得分（基于绝对基准）
 * 使用分段线性函数
 */
function calculateLoginScore(loginFrequency: number): number {
    const bench = SCORING_BENCHMARKS.loginFrequency;
    
    if (loginFrequency >= bench.excellent) {
        return 100;
    } else if (loginFrequency >= bench.good) {
        // 15-20次：80-100分
        return Number((80 + 20 * (loginFrequency - bench.good) / (bench.excellent - bench.good)).toFixed(2));
    } else if (loginFrequency >= bench.baseline) {
        // 10-15次：60-80分
        return Number((60 + 20 * (loginFrequency - bench.baseline) / (bench.good - bench.baseline)).toFixed(2));
    } else if (loginFrequency >= bench.poor) {
        // 5-10次：40-60分
        return Number((40 + 20 * (loginFrequency - bench.poor) / (bench.baseline - bench.poor)).toFixed(2));
    } else if (loginFrequency > 0) {
        // 1-5次：20-40分
        return Number((20 + 20 * loginFrequency / bench.poor).toFixed(2));
    } else {
        // 0次：0分
        return 0;
    }
}

/**
 * 计算告警频率得分（基于绝对基准）
 * 告警越少越好
 */
function calculateAlarmFrequencyScore(alarmFrequency: number): number {
    const bench = SCORING_BENCHMARKS.alarmFrequency;
    
    if (alarmFrequency <= bench.excellent) {
        return 100;
    } else if (alarmFrequency <= bench.good) {
        // 0-5次：90-100分
        return Number((100 - 10 * (alarmFrequency - bench.excellent) / (bench.good - bench.excellent)).toFixed(2));
    } else if (alarmFrequency <= bench.baseline) {
        // 5-15次：70-90分
        return Number((90 - 20 * (alarmFrequency - bench.good) / (bench.baseline - bench.good)).toFixed(2));
    } else if (alarmFrequency <= bench.poor) {
        // 15-30次：50-70分
        return Number((70 - 20 * (alarmFrequency - bench.baseline) / (bench.poor - bench.baseline)).toFixed(2));
    } else {
        // >30次：按比例递减，最低20分
        const excessRatio = (alarmFrequency - bench.poor) / bench.poor;
        return Number(Math.max(20, 50 - 30 * Math.min(1, excessRatio)).toFixed(2));
    }
}

/**
 * 根据分数获取评级
 */
function getScoreLevel(score: number): string {
  if (score >= 90) return "优秀";
  if (score >= 80) return "良好";
  if (score >= 70) return "中等";
  if (score >= 60) return "合格";
  return "不合格";
}

// 分离有数据和无数据的单位
export function separateCompaniesWithData(
    activeUnits: ActiveUnit[],
    scores: CompanyScore[]
): { scored: CompanyScore[], noData: ActiveUnit[] } {
    const scoredIds = scores.map(s => s.companyId);
    const noDataCompanies = activeUnits.filter(unit => !scoredIds.includes(unit.id));

    return {
        scored: scores,
        noData: noDataCompanies
    };
}
