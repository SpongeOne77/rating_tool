import "jsr:@std/dotenv/load"

export const DB_CONFIG = {
  hostname: Deno.env.get('DB_HOST') || 'localhost',
  port: parseInt(Deno.env.get('DB_PORT') || '3306'),
  username: Deno.env.get('DB_USER') || 'your_username',
  password: Deno.env.get('DB_PASSWORD') || 'your_password',
  db: Deno.env.get('DB_DATABASE') || 'your_database',
};

export const SCORING_WEIGHTS = {
  loginFrequency: 0.2,
  alarmFrequency: 0.3,
  alarmHandlingRate: 0.25,
  alarmTimelinessRate: 0.25,
};

export const DELAY_THRESHOLDS = {
  alarmTypes: {
    fire: { name: '疑似火警', thresholds: [10, 30, 120] },    // 分钟
    fault: { name: '设备故障', thresholds: [120, 480, 1440] }, // 分钟
    hiddenDanger: { name: '安全隐患', thresholds: [480, 1440, 10080] }, // 分钟
    other: { name: '其他', thresholds: [1440, 4320, 10080] }, // 分钟
  },
  // 延迟等级含义
  delayLevelMeanings: ['未逾期', '轻度逾期', '中度逾期', '严重逾期'],
};