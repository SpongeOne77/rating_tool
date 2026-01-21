import {ActiveUnit, AlarmRecord, CompanyData, DeviceInfo, LoginRecord} from "./types.ts";

export function aggregateCompanyData(
    companies: ActiveUnit[],
    loginData: LoginRecord[],
    alarmData: AlarmRecord[],
    deviceData: DeviceInfo[]
): Map<string, CompanyData> {
    const companyMap = new Map<string, CompanyData>();

    // 初始化公司数据
    for (const company of companies) {
        companyMap.set(company.id, {
            companyId: company.id,
            companyName: company.name,
            alarmData: [],
            deviceData: []
        });
    }

    // 聚合登录数据
    for (const login of loginData) {
        const data = companyMap.get(login.companyId);
        if (data) {
            data.loginData = login;
        }
    }

    // 聚合告警数据
    for (const alarm of alarmData) {
        const data = companyMap.get(alarm.companyId);
        if (data) {
            data.alarmData.push(alarm);
        }
    }

    // 聚合设备数据
    for (const device of deviceData) {
        const data = companyMap.get(device.companyId);
        if (data) {
            data.deviceData.push(device);
        }
    }

    return companyMap;
}