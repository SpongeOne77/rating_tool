import "jsr:@std/dotenv/load";

export const DB_CONFIG_USER = {
  host: Deno.env.get("DB_HOST") || "localhost",
  port: parseInt(Deno.env.get("DB_PORT") || "3306"),
  user: Deno.env.get("DB_USER") || "your_username",
  password: Deno.env.get("DB_PASSWORD") || "your_password",
  database: Deno.env.get("DB_DATABASE") || "ff_user",
};

export const DB_CONFIG_DUTY = {
  host: Deno.env.get("DB_HOST") || "localhost",
  port: parseInt(Deno.env.get("DB_PORT") || "3306"),
  user: Deno.env.get("DB_USER") || "your_username",
  password: Deno.env.get("DB_PASSWORD") || "your_password",
  database: Deno.env.get("DB_DATABASE") || "ff_duty",
};

export const DB_CONFIG_DEVICE = {
    host: Deno.env.get("DB_HOST") || "localhost",
    port: parseInt(Deno.env.get("DB_PORT") || "3306"),
    user: Deno.env.get("DB_USER") || "your_username",
    password: Deno.env.get("DB_PASSWORD") || "your_password",
    database: Deno.env.get("DB_DATABASE") || "ff_device",
};

export const SCORING_WEIGHTS = {
  loginFrequency: 0.2,
  alarmFrequency: 0.3,
  alarmHandlingRate: 0.25,
  alarmTimelinessRate: 0.25,
};

export const DELAY_THRESHOLDS = {
  1: [10, 30, 120], // 分钟
  2: [120, 480, 1440], // 分钟
  3: [480, 1440, 10080], // 分钟
  4: [1440, 4320, 10080], // 分钟
};

// 新增：绝对评分基准
export const SCORING_BENCHMARKS = {
  // 登录频率基准（次/月）
  loginFrequency: {
    excellent: 20,  // ≥20次/月得满分
    good: 15,       // 15-20次线性插值
    baseline: 10,   // 10-15次线性插值
    poor: 5         // 5-10次线性插值
    // <5次得低分
  },
  // 告警频率基准（次/月）
  alarmFrequency: {
    excellent: 0,   // 0次得满分
    good: 10,       // 0-10次线性插值
    baseline: 20,   // 10-20次线性插值
    poor: 40        // 20-40次线性插值
    // >40次得低分
  }
};

// 新增：离线设备检测配置
export const OFFLINE_DEVICE_CONFIG = {
  // 离线时长阈值（小时）- 超过此时长视为长期离线
  longOfflineThresholdHours: 72, // 3天
  // 离线设备比例阈值 - 超过此比例的公司标记为异常
  offlineRatioThreshold: 0.5, // 50%
  // 离线设备数量阈值 - 超过此数量才会被标记
  minDeviceCountForPenalty: 2, // 至少2台设备离线才会被标记
};
