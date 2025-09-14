// src/db.ts
import { Client } from 'https://deno.land/x/mysql@v2.11.0/mod.ts';
import { DB_CONFIG } from './config.ts';


export const createDbClient = () => new Client();


export const getCompanyLoginData = async (startTme: string, endTme: string) => {
  const client = createDbClient();
  try {
    await client.connect(DB_CONFIG);
    const result = await client.execute(`
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
        GROUP BY
            spu.company_id,
            sc.name
        ORDER BY
            loginFrequency DESC;
    `, [startTme, endTme]);
    return result.rows as {companyId: string; companyName: string; loginFrequency: number }[];
  } finally {
    await client.close();
  }
};

export const getCompanyAlarmData = async (startTme: string, endTme: string) => {
  const client = createDbClient();
  try {
    await client.connect(DB_CONFIG);

    const result = await client.execute(`
    SELECT 
        sc.NAME as companyName,
        oa.COMPANY_ID as companyId,
        oa.SUB_TYPE as alarmType,
        oa.DELAY_LEVEL as delayLevel,
        COUNT(oa.ID) as totalAlarms,
        SUM(CASE WHEN oa.STATUS = 2 THEN 1 ELSE 0 END) as handledAlarms,
        SUM(CASE WHEN oa.STATUS = 2 AND oa.DELAY_LEVEL = 0 THEN 1 ELSE 0 END) as timelyHandled
      FROM ff_duty.odt_alarm oa
      LEFT JOIN ff_user.sys_company sc ON sc.ID = oa.COMPANY_ID
      WHERE oa.PROJECT_NO = 'bjsx001'
        AND oa.CREATE_TIME BETWEEN ? AND ?
      GROUP BY oa.COMPANY_ID, oa.SUB_TYPE, oa.DELAY_LEVEL
    `, [startTme, endTme]);

    return result.rows as {
      companyId: string;
      companyName: string;
      alarmType: string;
      delayLevel: number;
      totalAlarms: number;
      handledAlarms: number;
      timelyHandled: number;
    }[];
  } finally {
    await client.close();
  }
}