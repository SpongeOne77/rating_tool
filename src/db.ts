// src/db.ts
import mysql from "mysql2/promise";
import {DB_CONFIG_DEVICE, DB_CONFIG_DUTY, DB_CONFIG_USER} from "./config.ts";

export const getCompanyLoginData = async (
  startTme: string,
  endTme: string,
  activeIds: string[],
) => {
  const client = await mysql.createConnection(DB_CONFIG_USER, {
    connectTimeout: 30000,
  });
  try {
    const [result, fields] = await client.query(
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
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
};

export const getCompanyAlarmData = async (
  startTme: string,
  endTme: string,
  activeIds: string[],
) => {
  const connection = await mysql.createConnection(DB_CONFIG_DUTY, {
    connectTimeout: 300000,
  });
  try {
    const [result, fields] = await connection.query(
      `
    SELECT 
        oa.COMPANY_ID as companyId,
        oa.TYPE as alarmType,
        oa.DELAY_LEVEL as delayLevel,
        oa.ALARM_TIME as alarmTime,
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
      delayLevel: string;
      alarmTime: string;
      disposedTime: string | null;
      deviceId: string;
      devicePosition: string;
      subType: string;
    }[];
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
  }
};

export const getDeviceInfo = async (
    activeIds: string[],
) => {
    const connection = await mysql.createConnection(DB_CONFIG_DEVICE);

    try {
        const [result, fields] = await connection.query(
            `SELECT dpd.COMPANY_ID, dd.ID, dd.TYPE, dd.POSITION, dd.STATUS, dd.OFFLINE_TIME
             FROM dev_device dd
                      JOIN dev_project_device dpd ON dpd.DEVICE_ID = dd.ID AND dpd.PROJECT_NO = 'bjsx001'
             WHERE dd.TYPE IN ('transmissionDevice', 'fireControlHost')
               AND dd.TRANSFER = '1'
               AND dpd.COMPANY_ID IN (?)`, [activeIds]
        );

        return result as {
            companyId: string;
            deviceId: string;
            deviceType: string;
            position: string;
            status: string;
            offlineTime: string;
        }[];
    } catch (error) {
        console.error(error);
    } finally {
        await connection.close();
    }
}
