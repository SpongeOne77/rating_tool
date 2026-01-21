import mysql from "mysql2/promise";
import { DB_CONFIG_DEVICE, DB_CONFIG_DUTY, DB_CONFIG_USER } from "./config.ts";
import { CompanyMonthlyReport } from "./report/types.ts";

const pool = mysql.createPool(DB_CONFIG_USER);

export const getCompanyLoginData = async (
  startTme: string,
  endTme: string,
  activeIds: string[],
) => {
  const [result, fields] = await pool.query(
    `
        SELECT
            spu.company_id as companyId,
            sc.name AS companyName,
            COUNT(sll.ACCOUNT) AS loginFrequency
        FROM
            ff_user.sys_log_login sll
                JOIN ff_user.sys_user su ON
                sll.ACCOUNT = su.account
                LEFT JOIN ff_user.sys_project_user spu ON
                su.id = spu.user_id
                LEFT JOIN ff_user.sys_company sc ON
                spu.company_id = sc.id
        WHERE
            spu.project_no = 'bjsx001'
          AND sll.CREATE_TIME BETWEEN ? AND ?
          AND spu.company_id IN (?)
          AND sc.DELETED = '0'
        GROUP BY
            spu.company_id,
            sc.name
        ORDER BY
            loginFrequency DESC;
    `,
    [startTme, endTme, activeIds],
  );

  return result as {
    companyId: string;
    companyName: string;
    loginFrequency: number;
  }[];
};

const alarmPool = mysql.createPool(DB_CONFIG_DUTY);

export const getCompanyAlarmData = async (
  startTme: string,
  endTme: string,
  activeIds: string[],
) => {
  const [result, fields] = await alarmPool.query(
    `
    SELECT 
        oa.COMPANY_ID as companyId,
        oa.TYPE as alarmType,
        oa.DELAY_LEVEL as delayLevel,
        oa.ALARM_TIME as alarmTime,
        oa.DEVICE_NAME as DeviceName,
        oa.DISPOSE_TIME as disposedTime,
        oa.DEVICE_ID as deviceId,
        oa.DEVICE_POSITION as devicePosition,
        oa.SUB_TYPE as subType
      FROM ff_duty.odt_alarm oa
      WHERE oa.PROJECT_NO = 'bjsx001'
        AND oa.CREATE_TIME BETWEEN ? AND ?
        AND oa.COMPANY_ID IN (?)
    `,
    [startTme, endTme, activeIds],
  );

  return result as {
    companyId: string;
    alarmType: string;
    delayLevel: number;
    deviceName: string;
    alarmTime: string;
    disposedTime: string | null;
    deviceId: string;
    devicePosition: string;
    subType: string;
  }[];
};

const devicePool = mysql.createPool(DB_CONFIG_DEVICE);
export const getDeviceInfo = async (
  activeIds: string[],
) => {
  const [result, fields] = await devicePool.query(
    `SELECT dpd.COMPANY_ID as companyId, dd.ID as deviceId, dd.TYPE as deviceType, dd.POSITION as position, dd.STATUS as status, dd.OFFLINE_TIME as offlineTime
             FROM dev_device dd
                      JOIN dev_project_device dpd ON dpd.DEVICE_ID = dd.ID AND dpd.PROJECT_NO = 'bjsx001'
             WHERE dd.TYPE IN ('transmissionDevice', 'fireControlHost')
               AND dpd.COMPANY_ID IN (?)`,
    [activeIds],
  );

  return result as {
    companyId: string;
    deviceId: string;
    deviceType: string;
    position: string;
    status: string;
    offlineTime: string;
  }[];
};

export async function getAiRemark(report: CompanyMonthlyReport) {
  try {
    const response = await fetch(
      "http://81.69.251.57:12543/xfyun/api/message",
      {
        method: "POST", // 指定请求方法（默认 GET）
        headers: {
          "Content-Type": "application/json", // 告诉服务器请求体是 JSON
            // "Authorization": `Bearer MffHbNSvWxFaAcapjUHu:NfCrPfjPtolDCFTZljWk`
        },
        body: JSON.stringify({message: JSON.stringify(report)}), // 将对象转为 JSON 字符串
      },
    );

    // if (!response.ok) throw new Error(`请求失败：${response}`);
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("POST 请求失败：", error);
    return null;
  }
}

// 新增：保存月度报告到数据库
export async function saveMonthlyReportToDatabase(report: CompanyMonthlyReport) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. 插入主报告记录
        const [result] = await connection.execute(
            `INSERT INTO monthly_reports 
             (company_id, company_name, report_month, final_score, score_level, ranking, 
              has_offline_devices, offline_device_count, total_device_count, ai_comment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             final_score = VALUES(final_score), score_level = VALUES(score_level),
             ranking = VALUES(ranking), has_offline_devices = VALUES(has_offline_devices),
             offline_device_count = VALUES(offline_device_count), 
             total_device_count = VALUES(total_device_count), ai_comment = VALUES(ai_comment)`,
            [
                report.reportMeta.companyId,
                report.reportMeta.companyName,
                report.reportMeta.reportMonth,
                report.scoreOverview.finalScore,
                report.scoreOverview.scoreLevel,
                report.scoreOverview.ranking,
                report.scoreOverview.hasOfflineDevices,
                report.scoreOverview.offlineDeviceCount,
                report.scoreOverview.totalDeviceCount,
                report.aiComment
            ]
        );

        const reportId = 'insertId' in result ? result.insertId :
                        await getExistingReportId(connection, report.reportMeta.companyId, report.reportMeta.reportMonth);

        // 2. 插入告警统计
        await connection.execute(
            `INSERT INTO monthly_alarm_stats 
             (report_id, total_alarms, handled_alarms, unhandled_alarms, handling_rate, avg_response_duration)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             total_alarms = VALUES(total_alarms), handled_alarms = VALUES(handled_alarms),
             unhandled_alarms = VALUES(unhandled_alarms), handling_rate = VALUES(handling_rate),
             avg_response_duration = VALUES(avg_response_duration)`,
            [
                reportId,
                report.alarmStats.total,
                report.alarmStats.handled,
                report.alarmStats.unhandled,
                report.alarmStats.handlingRate,
                report.alarmStats.avgResponseDuration
            ]
        );

        // 3. 插入评分详情
        await connection.execute(
            `INSERT INTO monthly_score_details 
             (report_id, login_frequency, login_score, alarm_frequency, alarm_score, 
              handling_rate, handling_score, timeliness_with_delay, timeliness_score)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             login_frequency = VALUES(login_frequency), login_score = VALUES(login_score),
             alarm_frequency = VALUES(alarm_frequency), alarm_score = VALUES(alarm_score),
             handling_rate = VALUES(handling_rate), handling_score = VALUES(handling_score),
             timeliness_with_delay = VALUES(timeliness_with_delay), timeliness_score = VALUES(timeliness_score)`,
            [
                reportId,
                report.scoreOverview.detail.loginFrequency,
                report.scoreOverview.detail.loginScore,
                report.scoreOverview.detail.alarmFrequency,
                report.scoreOverview.detail.alarmScore,
                report.scoreOverview.detail.handlingRate,
                report.scoreOverview.detail.handlingScore,
                report.scoreOverview.detail.timelinessWithDelay,
                report.scoreOverview.detail.timelinessScore
            ]
        );

        // 4. 插入告警类型统计
        await connection.execute(
            'DELETE FROM monthly_alarm_types WHERE report_id = ?',
            [reportId]
        );

        for (const alarmType of report.alarmStats.topAlarmTypes) {
            await connection.execute(
                `INSERT INTO monthly_alarm_types (report_id, alarm_type, alarm_count, alarm_rate)
                 VALUES (?, ?, ?, ?)`,
                [reportId, alarmType.type, alarmType.count, alarmType.rate]
            );
        }

        // 5. 插入设备告警排名
        await connection.execute(
            'DELETE FROM monthly_device_rankings WHERE report_id = ?',
            [reportId]
        );

        for (const device of report.alarmStats.deviceAlarmRanking) {
            await connection.execute(
                `INSERT INTO monthly_device_rankings 
                 (report_id, device_id, device_type, position, alarm_count, ranking, is_offline, offline_duration)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    reportId,
                    device.deviceId,
                    device.deviceType,
                    device.position,
                    device.alarmCount,
                    device.rank,
                    device.isOffline,
                    device.offlineDuration
                ]
            );
        }

        await connection.commit();
        console.log(`✅ 已入库: ${report.reportMeta.companyName} ${report.reportMeta.reportMonth}月报`);

    } catch (error) {
        await connection.rollback();
        console.error(`❌ 入库失败: ${report.reportMeta.companyName}`, error);
        throw error;
    } finally {
        connection.release();
    }
}

// 辅助函数：获取已存在的报告ID
async function getExistingReportId(connection: any, companyId: string, reportMonth: string): Promise<number> {
    const [rows] = await connection.execute(
        'SELECT id FROM monthly_reports WHERE company_id = ? AND report_month = ?',
        [companyId, reportMonth]
    );
    return rows[0]?.id;
}

