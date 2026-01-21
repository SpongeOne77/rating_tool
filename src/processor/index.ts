import {ActiveUnit, CompanyData, CompanyScore, ProcessingResult, ScoringConfig} from "./types.ts";
import {OFFLINE_DEVICE_CONFIG, SCORING_BENCHMARKS, SCORING_WEIGHTS} from "../config.ts";
import {
    calculateAlarmDistributionStats,
    calculateAlarmScore,
    calculateAlarmStats, calculateHandlingScore,
    calculateLoginScore,
    calculateOfflineDeviceStats
} from "./calculator.ts";
import {aggregateCompanyData} from "./aggregator.ts";
import {getCompanyAlarmData, getCompanyLoginData, getDeviceInfo} from "../db.ts";

const scoringConfig: ScoringConfig = {
    weights: SCORING_WEIGHTS,
    benchmarks: SCORING_BENCHMARKS,
    offlineDevice: OFFLINE_DEVICE_CONFIG,
};

function processCompany(companyData: CompanyData): CompanyScore {
    const loginFrequency = companyData.loginData?.loginFrequency || 0;

    // 计算各项指标
    const alarmStats = calculateAlarmStats(companyData.alarmData);
    const deviceStats = calculateOfflineDeviceStats(companyData.deviceData);
    const loginScore = calculateLoginScore(loginFrequency, scoringConfig);
    const alarmScore = calculateAlarmScore(alarmStats.totalAlarms, scoringConfig);
    const handlingScores = calculateHandlingScore(
        alarmStats.totalAlarms,
        alarmStats.handlingRate,
        alarmStats.timelinessRate
    );

    // 计算加权得分
    const weightedScore =
        loginScore * scoringConfig.weights.loginFrequency +
        alarmScore * scoringConfig.weights.alarmFrequency +
        handlingScores.handlingScore * scoringConfig.weights.alarmHandlingRate +
        handlingScores.timelinessScore * scoringConfig.weights.alarmTimelinessRate;

    // 确定是否参与排名
    const finalScore = deviceStats.shouldPenalize ? 0 : Number(weightedScore.toFixed(2));
    const scoreLevel = deviceStats.shouldPenalize ? "设备离线" : getScoreLevel(finalScore);

    return {
        companyId: companyData.companyId,
        companyName: companyData.companyName,
        loginFrequency,
        alarmFrequency: alarmStats.totalAlarms,
        alarmHandlingRate: alarmStats.handlingRate,
        alarmTimelinessRate: alarmStats.timelinessRate,
        normalizedLoginFrequency: loginScore,
        normalizedAlarmFrequency: alarmScore,
        normalizedAlarmHandlingRate: handlingScores.handlingScore,
        normalizedAlarmTimelinessRate: handlingScores.timelinessScore,
        weightedScore: Number(weightedScore.toFixed(2)),
        finalScore,
        ranking: 0, // 后续统一计算
        scoreLevel,
        hasOfflineDevices: deviceStats.shouldPenalize,
        offlineDeviceCount: deviceStats.longOfflineDevices,
        totalDeviceCount: deviceStats.totalDevices,
        offlineRatio: deviceStats.offlineRatio
    };
}

function getScoreLevel(score: number): string {
    if (score >= 90) return "优秀";
    if (score >= 80) return "良好";
    if (score >= 70) return "中等";
    if (score >= 60) return "合格";
    return "不合格";
}

// 计算排名
function calculateRankings(companies: CompanyScore[]): CompanyScore[] {
    // 分离正常公司和离线公司
    const normalCompanies = companies.filter(c => !c.hasOfflineDevices);
    const offlineCompanies = companies.filter(c => c.hasOfflineDevices);

    // 对正常公司排序并分配排名
    normalCompanies.sort((a, b) => b.finalScore - a.finalScore);
    normalCompanies.forEach((company, index) => {
        company.ranking = index + 1;
    });

    // 离线公司不参与排名
    offlineCompanies.forEach(company => {
        company.ranking = 9999;
    });

    return [...normalCompanies, ...offlineCompanies];
}

export async function processData(
    startTime: string,
    endTime: string,
    companies: ActiveUnit[]
): Promise<ProcessingResult> {
    // 获取原始数据
    const [loginData, alarmData, deviceData] = await Promise.all([
        getCompanyLoginData(startTime, endTime, companies.map(c => c.id)),
        getCompanyAlarmData(startTime, endTime, companies.map(c => c.id)),
        getDeviceInfo(companies.map(c => c.id))
    ]);

    // 聚合数据
    const companyDataMap = aggregateCompanyData(companies, loginData, alarmData, deviceData || []);

    const alarmDistribution = calculateAlarmDistributionStats(alarmData);

    // 处理每个公司
    const companyScores: CompanyScore[] = [];
    for (const companyData of companyDataMap.values()) {
        const companyAlarmStats = alarmDistribution.find(stats => stats.companyId === companyData.companyId);
        companyScores.push({
            ...processCompany(companyData),
            alarmStats: companyAlarmStats || []
        });
    }

    // 计算排名
    const rankedScores = calculateRankings(companyScores);

    // const alarmStats = calculateAlarmStats(alarmData);



    return {
        scores: rankedScores,
        deviceData: deviceData || [],
    };
}

export function separateCompaniesWithData(
    activeUnits: ActiveUnit[],
    scores: CompanyScore[]
): { scored: CompanyScore[]; noData: ActiveUnit[] } {
    const scoredIds = new Set(scores.map(s => s.companyId));
    const noDataCompanies = activeUnits.filter(unit => !scoredIds.has(unit.id));

    return {
        scored: scores,
        noData: noDataCompanies
    };
}