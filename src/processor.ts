// src/processor.ts
import { start } from "https://deno.land/x/mysql@v2.11.0/src/auth_plugin/caching_sha2_password.ts";
import {SCORING_WEIGHTS} from "./config.ts";
import {getCompanyAlarmData, getCompanyLoginData,} from "./db.ts";

// 数据类型定义
export interface LoginRecord { companyId: string; companyName: string; loginFrequency: number }
export interface AlarmRecord {
  companyId: string;
  companyName: string;
  alarmType: string;
  delayLevel: number;
  totalAlarms: number;
  handledAlarms: number;
  timelyHandled: number;
}


interface CompanyAlarmStats {
  companyName: string;
  alarms: {
    [alarmType: string]: {
      totalAlarms: number;
      handledAlarms: number;
      timelyHandled: number;
    }
  }
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
  ranking: number
}

/**
 * process data and calculate scores for each company
 */
export async function processData(startTime: string, endTime: string): Promise<CompanyScore[]> {
  const [loginData, alarmStats] = await Promise.all([
    getCompanyLoginData(startTime, endTime),
    getCompanyAlarmData(startTime, endTime)
  ]);

  const companyStatsMap = groupAlarmStatsByCompany(alarmStats);

  const scores = calculateScores(loginData, companyStatsMap);

  return normalizeAndRankScores(scores);
}

const groupAlarmStatsByCompany = (alarmStats: AlarmRecord[]): Map<string, CompanyAlarmStats> => {
  const result = new Map<string, CompanyAlarmStats>();

  alarmStats.forEach((stat) => {
    if (!result.has(stat.companyId)) {
      result.set(stat.companyId, {companyName: stat.companyName, alarms: {}})
    }


    const companyStats = result.get(stat.companyId)!;

    if (!companyStats.alarms[stat.alarmType]) {
      companyStats.alarms[stat.alarmType] = {
        totalAlarms: 0,
        handledAlarms: 0,
        timelyHandled: 0,
      }

      const typeStats = companyStats.alarms[stat.alarmType];
      typeStats.totalAlarms += stat.totalAlarms;
      typeStats.handledAlarms += stat.handledAlarms;
      typeStats.timelyHandled += stat.timelyHandled;
    }
  })

  return result;
}

/**
 * 计算每家公司的评分
 */
function calculateScores(
  loginData: LoginRecord[],
  companyStatsMap: Map<string, CompanyAlarmStats>
): CompanyScore[] {
  return Array.from(companyStatsMap.entries()).map(([companyId, alarmStats]) => {
    const _companyName = alarmStats.companyName;
    // 获取公司名称和登录频率
    const loginRecord = loginData.find(record => record.companyId === companyId) || {
      companyId,
      companyName: alarmStats.companyName,
      loginFrequency: 0,
    };

    // 计算告警频率（所有类型的告警总数）
    const alarmFrequency = Object.values(alarmStats.alarms).reduce(
      (sum, stats) => sum + stats.totalAlarms, 0
    );

    // 计算处理率（所有类型的平均处理率）
    const typeHandlingRates = Object.values(alarmStats.alarms).map(stats =>
      stats.totalAlarms > 0 ? stats.handledAlarms / stats.totalAlarms : 0
    );
    const alarmHandlingRate = typeHandlingRates.length > 0
      ? typeHandlingRates.reduce((sum, rate) => sum + rate, 0) / typeHandlingRates.length
      : 0;

    // 计算及时率（所有类型的平均及时率）
    const typeTimelinessRates = Object.values(alarmStats.alarms).map(stats =>
      stats.handledAlarms > 0 ? stats.timelyHandled / stats.handledAlarms : 0
    );
    const alarmTimelinessRate = typeTimelinessRates.length > 0
      ? typeTimelinessRates.reduce((sum, rate) => sum + rate, 0) / typeTimelinessRates.length
      : 0;

    return {
      companyId,
      companyName: _companyName,
      loginFrequency: loginRecord.loginFrequency,
      alarmFrequency,
      alarmHandlingRate,
      alarmTimelinessRate,
      normalizedLoginFrequency: 0, // 后续标准化
      normalizedAlarmFrequency: 0, // 后续标准化
      normalizedAlarmHandlingRate: 0, // 后续标准化
      normalizedAlarmTimelinessRate: 0, // 后续标准化
      weightedScore: 0, // 后续计算
      finalScore: 0, // 后续计算
      ranking: 0, // 后续排名
      scoreLevel: '', // 后续评级
    };
  });
}

/**
 * 标准化评分并计算最终排名
 */
function normalizeAndRankScores(scores: CompanyScore[]): CompanyScore[] {
  if (scores.length === 0) return [];

  // 1. 提取各指标的最大值和最小值
  const loginFreqMax = Math.max(...scores.map(s => s.loginFrequency));
  const loginFreqMin = Math.min(...scores.map(s => s.loginFrequency));

  const alarmFreqMax = Math.max(...scores.map(s => s.alarmFrequency));
  const alarmFreqMin = Math.min(...scores.map(s => s.alarmFrequency));

  // 2. 标准化各指标（0-100分）
  scores.forEach(score => {
    // 登录频率（越高越好）
    score.normalizedLoginFrequency = loginFreqMax > 0
      ? 100 * (score.loginFrequency - loginFreqMin) / (loginFreqMax - loginFreqMin)
      : 0;

    // 告警频率（越低越好）
    score.normalizedAlarmFrequency = alarmFreqMax > 0
      ? 100 * (alarmFreqMax - score.alarmFrequency) / (alarmFreqMax - alarmFreqMin)
      : 100;

    // 处理率和及时率（直接转换为百分比）
    score.normalizedAlarmHandlingRate = score.alarmHandlingRate * 100;
    score.normalizedAlarmTimelinessRate = score.alarmTimelinessRate * 100;

    // 计算加权得分
    score.weightedScore =
      score.normalizedLoginFrequency * SCORING_WEIGHTS.loginFrequency +
      score.normalizedAlarmFrequency * SCORING_WEIGHTS.alarmFrequency +
      score.normalizedAlarmHandlingRate * SCORING_WEIGHTS.alarmHandlingRate +
      score.normalizedAlarmTimelinessRate * SCORING_WEIGHTS.alarmTimelinessRate;
  });

  // 3. 按加权得分排序并排名
  const sortedScores = [...scores].sort((a, b) => b.weightedScore - a.weightedScore);

  sortedScores.forEach((score, index) => {
    score.ranking = index + 1;
    score.finalScore = Math.round(score.weightedScore);
    score.scoreLevel = getScoreLevel(score.finalScore);
  });

  return sortedScores;
}

/**
 * 根据分数获取评级
 */
function getScoreLevel(score: number): string {
  if (score >= 90) return '优秀';
  if (score >= 80) return '良好';
  if (score >= 70) return '中等';
  if (score >= 60) return '合格';
  return '不合格';
}
