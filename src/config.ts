import "jsr:@std/dotenv/load";

export const DB_CONFIG_USER = {
  host: Deno.env.get("DB_HOST") || "localhost",
  port: parseInt(Deno.env.get("DB_PORT") || "3306"),
  user: Deno.env.get("DB_USER") || "your_username",
  password: Deno.env.get("DB_PASSWORD") || "your_password",
  database: Deno.env.get("DB_DATABASE") || "ff_user",
  supportBigNumbers: true,
  bigNumberStrings: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

export const DB_CONFIG_DUTY = {
  host: Deno.env.get("DB_HOST") || "localhost",
  port: parseInt(Deno.env.get("DB_PORT") || "3306"),
  user: Deno.env.get("DB_USER") || "your_username",
  password: Deno.env.get("DB_PASSWORD") || "your_password",
  database: Deno.env.get("DB_DATABASE") || "ff_duty",
  supportBigNumbers: true,
  bigNumberStrings: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

export const DB_CONFIG_DEVICE = {
  host: Deno.env.get("DB_HOST") || "localhost",
  port: parseInt(Deno.env.get("DB_PORT") || "3306"),
  user: Deno.env.get("DB_USER") || "your_username",
  password: Deno.env.get("DB_PASSWORD") || "your_password",
  database: Deno.env.get("DB_DATABASE") || "ff_device",
  supportBigNumbers: true,
  bigNumberStrings: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
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
    excellent: 20, // ≥20次/月得满分
    good: 15, // 15-20次线性插值
    baseline: 10, // 10-15次线性插值
    poor: 5, // 5-10次线性插值
    // <5次得低分
  },
  // 告警频率基准（次/月）
  alarmFrequency: {
    excellent: 0, // 0次得满分
    good: 10, // 0-10次线性插值
    baseline: 20, // 10-20次线性插值
    poor: 40, // 20-40次线性插值
    // >40次得低分
  },
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

export const ALARM_SUB_TYPES = [
  {
    "NAME": "灭火器告警",
    "CODE": "256"
  },
  {
    "NAME": "防火门告警",
    "CODE": "255"
  },
  {
    "NAME": "水压告警",
    "CODE": "257"
  },
  {
    "NAME": "取水报警",
    "CODE": "258"
  },
  {
    "NAME": "倾斜报警",
    "CODE": "259"
  },
  {
    "NAME": "人形报警",
    "CODE": "260"
  },
  {
    "NAME": "机动车违停告警",
    "CODE": "261"
  },
  {
    "NAME": "人脸报警",
    "CODE": "290"
  },
  {
    "NAME": "热成像告警",
    "CODE": "262"
  },
  {
    "NAME": "老鼠检测告警",
    "CODE": "263"
  },
  {
    "NAME": "厨师帽识别告警",
    "CODE": "264"
  },
  {
    "NAME": "口罩识别告警",
    "CODE": "265"
  },
  {
    "NAME": "手套检测告警",
    "CODE": "266"
  },
  {
    "NAME": "地面积水检测告警",
    "CODE": "267"
  },
  {
    "NAME": "地面垃圾检测告警",
    "CODE": "268"
  },
  {
    "NAME": "垃圾桶未盖检测告警",
    "CODE": "269"
  },
  {
    "NAME": "人群聚集告警",
    "CODE": "270"
  },
  {
    "NAME": "高空抛物检测告警",
    "CODE": "271"
  },
  {
    "NAME": "视频模糊检测告警",
    "CODE": "272"
  },
  {
    "NAME": "跌倒检测告警",
    "CODE": "273"
  },
  {
    "NAME": "云端区域入侵检测告警",
    "CODE": "274"
  },
  {
    "NAME": "持刀持械检测告警",
    "CODE": "275"
  },
  {
    "NAME": "打架斗殴检测告警",
    "CODE": "276"
  },
  {
    "NAME": "翻墙检测告警",
    "CODE": "277"
  },
  {
    "NAME": "人数统计告警",
    "CODE": "278"
  },
  {
    "NAME": "违规置物告警",
    "CODE": "279"
  },
  {
    "NAME": "人流统计算法",
    "CODE": "280"
  },
  {
    "NAME": "未佩戴口罩",
    "CODE": "281"
  },
  {
    "NAME": "陌生人识别",
    "CODE": "282"
  },
  {
    "NAME": "车牌识别",
    "CODE": "283"
  },
  {
    "NAME": "宠物检测",
    "CODE": "284"
  },
  {
    "NAME": "人车非",
    "CODE": "285"
  },
  {
    "NAME": "车辆检测告警",
    "CODE": "286"
  },
  {
    "NAME": "年龄识别检测告警",
    "CODE": "287"
  },
  {
    "NAME": "性别识别检测告警",
    "CODE": "288"
  },
  {
    "NAME": "车牌类型检测告警",
    "CODE": "289"
  },
  {
    "NAME": "SOS告警",
    "CODE": "108"
  },
  {
    "NAME": "互感器断线",
    "CODE": "369"
  },
  {
    "NAME": "电源故障",
    "CODE": "501"
  },
  {
    "NAME": "分配电故障",
    "CODE": "502"
  },
  {
    "NAME": "灯具故障",
    "CODE": "503"
  },
  {
    "NAME": "有水告警",
    "CODE": "243"
  },
  {
    "NAME": "掉电告警",
    "CODE": "403"
  },
  {
    "NAME": "开箱告警",
    "CODE": "404"
  },
  {
    "NAME": "组态告警",
    "CODE": "405"
  },
  {
    "NAME": "合闸警示",
    "CODE": "406"
  },
  {
    "NAME": "分闸警示",
    "CODE": "407"
  },
  {
    "NAME": "压强告警",
    "CODE": "408"
  },
  {
    "NAME": "液位告警",
    "CODE": "409"
  },
  {
    "NAME": "漏电保护自检未完成",
    "CODE": "860"
  },
  {
    "NAME": "电瓶车充电识别告警",
    "CODE": "731"
  },
  {
    "NAME": "恶性负载识别告警",
    "CODE": "751"
  },
  {
    "NAME": "调压器识别告警",
    "CODE": "741"
  },
  {
    "NAME": "烟雾告警",
    "CODE": "101"
  },
  {
    "NAME": "烟雾预警",
    "CODE": "100"
  },
  {
    "NAME": "过温告警",
    "CODE": "102"
  },
  {
    "NAME": "浓度告警",
    "CODE": "103"
  },
  {
    "NAME": "过载告警",
    "CODE": "104"
  },
  {
    "NAME": "手动告警",
    "CODE": "105"
  },
  {
    "NAME": "电压欠压",
    "CODE": "201"
  },
  {
    "NAME": "电压过压",
    "CODE": "202"
  },
  {
    "NAME": "漏电告警",
    "CODE": "203"
  },
  {
    "NAME": "过功率告警",
    "CODE": "204"
  },
  {
    "NAME": "电弧告警",
    "CODE": "205"
  },
  {
    "NAME": "三相告警",
    "CODE": "206"
  },
  {
    "NAME": "异常分闸",
    "CODE": "207"
  },
  {
    "NAME": "短路告警",
    "CODE": "208"
  },
  {
    "NAME": "火警",
    "CODE": "601"
  },
  {
    "NAME": "水压过高",
    "CODE": "209"
  },
  {
    "NAME": "水压过低",
    "CODE": "210"
  },
  {
    "NAME": "水位过高",
    "CODE": "211"
  },
  {
    "NAME": "水位过低",
    "CODE": "212"
  },
  {
    "NAME": "出水告警",
    "CODE": "213"
  },
  {
    "NAME": "开盖告警",
    "CODE": "214"
  },
  {
    "NAME": "旋转告警",
    "CODE": "215"
  },
  {
    "NAME": "倾斜告警",
    "CODE": "216"
  },
  {
    "NAME": "掩埋告警",
    "CODE": "217"
  },
  {
    "NAME": "异常开启",
    "CODE": "218"
  },
  {
    "NAME": "主备电故障",
    "CODE": "301"
  },
  {
    "NAME": "主机断线",
    "CODE": "302"
  },
  {
    "NAME": "传感器故障",
    "CODE": "303"
  },
  {
    "NAME": "低电量告警",
    "CODE": "402"
  },
  {
    "NAME": "传感器失效",
    "CODE": "504"
  },
  {
    "NAME": "设备下线(已移除)",
    "CODE": "401"
  },
  {
    "NAME": "未定义",
    "CODE": "OTHER"
  },
  {
    "NAME": "开路告警",
    "CODE": "602"
  },
  {
    "NAME": "电压异常",
    "CODE": "603"
  },
  {
    "NAME": "场所有人",
    "CODE": "875"
  },
  {
    "NAME": "场所无人",
    "CODE": "880"
  },
  {
    "NAME": "电流异常",
    "CODE": "604"
  },
  {
    "NAME": "三相预警",
    "CODE": "605"
  },
  {
    "NAME": "缺零告警",
    "CODE": "845"
  },
  {
    "NAME": "线缆温度探头短路",
    "CODE": "399"
  },
  {
    "NAME": "拆卸告警",
    "CODE": "230"
  },
  {
    "NAME": "线缆温度探头断线",
    "CODE": "389"
  },
  {
    "NAME": "互感器短路",
    "CODE": "379"
  },
  {
    "NAME": "与底板通讯异常",
    "CODE": "801"
  },
  {
    "NAME": "寿命终止",
    "CODE": "805"
  },
  {
    "NAME": "迷宫告警",
    "CODE": "810"
  },
  {
    "NAME": "本地测试报警",
    "CODE": "815"
  },
  {
    "NAME": "自检故障",
    "CODE": "304"
  },
  {
    "NAME": "烟雾报警消音",
    "CODE": "820"
  },
  {
    "NAME": "明火告警",
    "CODE": "107"
  },
  {
    "NAME": "湿度告警",
    "CODE": "220"
  },
  {
    "NAME": "波动告警",
    "CODE": "221"
  },
  {
    "NAME": "风速过高",
    "CODE": "361"
  },
  {
    "NAME": "积水告警",
    "CODE": "222"
  },
  {
    "NAME": "碰撞告警",
    "CODE": "223"
  },
  {
    "NAME": "异常关闭",
    "CODE": "225"
  },
  {
    "NAME": "离岗告警",
    "CODE": "226"
  },
  {
    "NAME": "通道占用",
    "CODE": "227"
  },
  {
    "NAME": "电动车告警",
    "CODE": "228"
  },
  {
    "NAME": "区域入侵",
    "CODE": "245"
  },
  {
    "NAME": "视频遮挡",
    "CODE": "254"
  },
  {
    "NAME": "低温告警",
    "CODE": "229"
  },
  {
    "NAME": "设备故障",
    "CODE": "305"
  },
  {
    "NAME": "通讯故障",
    "CODE": "306"
  },
  {
    "NAME": "低压告警免打扰",
    "CODE": "830"
  },
  {
    "NAME": "通信故障",
    "CODE": "870"
  },
  {
    "NAME": "短路预警",
    "CODE": "610"
  },
  {
    "NAME": "瞬时告警",
    "CODE": "609"
  },
  {
    "NAME": "瞬时预警",
    "CODE": "606"
  },
  {
    "NAME": "气压过高",
    "CODE": "703"
  },
  {
    "NAME": "气压过低",
    "CODE": "704"
  },
  {
    "NAME": "晃动告警",
    "CODE": "705"
  },
  {
    "NAME": "风速过低",
    "CODE": "371"
  },
  {
    "NAME": "防拆告警",
    "CODE": "231"
  },
  {
    "NAME": "过流告警",
    "CODE": "232"
  },
  {
    "NAME": "恶性负载告警",
    "CODE": "234"
  },
  {
    "NAME": "过载预警",
    "CODE": "235"
  },
  {
    "NAME": "过温预警",
    "CODE": "236"
  },
  {
    "NAME": "漏保自检未完成",
    "CODE": "237"
  },
  {
    "NAME": "漏电预警",
    "CODE": "238"
  },
  {
    "NAME": "电流预警",
    "CODE": "239"
  },
  {
    "NAME": "电流告警",
    "CODE": "339"
  },
  {
    "NAME": "电压告警",
    "CODE": "359"
  },
  {
    "NAME": "电压过压预警",
    "CODE": "240"
  },
  {
    "NAME": "电压欠压预警",
    "CODE": "241"
  },
  {
    "NAME": "通讯预警",
    "CODE": "242"
  },
  {
    "NAME": "移动侦测",
    "CODE": "244"
  },
  {
    "NAME": "湿度预警",
    "CODE": "246"
  },
  {
    "NAME": "低湿告警",
    "CODE": "247"
  },
  {
    "NAME": "低湿预警",
    "CODE": "248"
  },
  {
    "NAME": "功率告警",
    "CODE": "249"
  },
  {
    "NAME": "功率预警",
    "CODE": "250"
  },
  {
    "NAME": "视在告警",
    "CODE": "251"
  },
  {
    "NAME": "视在预警",
    "CODE": "252"
  },
  {
    "NAME": "温度预警",
    "CODE": "253"
  },
  {
    "NAME": "温度告警静音",
    "CODE": "835"
  },
  {
    "NAME": "过功率预警",
    "CODE": "607"
  },
  {
    "NAME": "外部预警",
    "CODE": "608"
  },
  {
    "NAME": "浪涌告警",
    "CODE": "219"
  },
  {
    "NAME": "接地告警",
    "CODE": "850"
  },
  {
    "NAME": "温度传感器故障免打扰",
    "CODE": "840"
  }
]
