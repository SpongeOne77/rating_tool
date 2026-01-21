import { CompanyMonthlyReport } from "./types.ts";

/**
 * 生成月度报告HTML内容
 */
export const generateReportHtml = (report: CompanyMonthlyReport): string => {
    // 格式化时长（分钟转天时分）
    const formatDuration = (minutes: number): string => {
        if (!minutes || minutes < 0) return '0时0分';
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = Math.floor(minutes % 60);
        return `${days > 0 ? `${days}天` : ''}${hours > 0 ? `${hours}时` : ''}${mins}分`;
    };

    // 告警类型中文映射（需与数据字典匹配）
    const alarmTypeMap: Record<string, string> = {
        '1': '疑似火警',
        '2': '设备故障',
        '3': '安全隐患',
        '4': '其他告警'
    };
    
    // 设备类型中文映射
    const deviceTypeMap: Record<string, string> = {
        'transmissionDevice': '用户传输装置',
        'fireControlHost': '火警报警主机'
    };
    
    // 获取设备类型显示文本（带图标）
    const getDeviceTypeDisplay = (deviceType: string): string => {
        const typeText = deviceTypeMap[deviceType] || '未知设备';
        const icon = deviceType === 'transmissionDevice' ? '📡' : 
                     deviceType === 'fireControlHost' ? '🚨' : '📟';
        return `${icon} ${typeText}`;
    };

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.reportMeta.companyName || ''}${report.reportMeta.reportMonth}月度安全报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: "Microsoft YaHei", "Segoe UI", sans-serif; }
    body { padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%); }
    .report-container { 
      max-width: 1200px; 
      margin: 0 auto; 
      background: white; 
      padding: 40px; 
      border-radius: 12px; 
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    }
    .header { 
      text-align: center; 
      margin-bottom: 40px; 
      padding-bottom: 25px;
      border-bottom: 3px solid #2c3e50;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: -40px -40px 40px -40px;
      padding: 35px 40px 25px;
      border-radius: 12px 12px 0 0;
    }
    .header h1 { 
      font-size: 26px; 
      color: white; 
      margin-bottom: 12px;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .header .meta { 
      color: rgba(255,255,255,0.9); 
      font-size: 14px;
      font-weight: 300;
    }
    .section { 
      margin-bottom: 35px;
      background: #fafbfc;
      padding: 25px;
      border-radius: 8px;
      border: 1px solid #e1e4e8;
    }
    .section-title { 
      font-size: 20px; 
      color: #2c3e50; 
      margin-bottom: 20px; 
      padding-bottom: 12px; 
      border-bottom: 3px solid #667eea;
      font-weight: 600;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 24px;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      margin-right: 12px;
      border-radius: 2px;
    }
    .beta-tag {
      margin-left: 10px;
      font-size: 12px;
      font-weight: normal;
      text-transform: lowercase;
      background: linear-gradient(135deg, #ff7e00 0%, #ffb800 100%);
      color: white;
      padding: 3px 8px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(255, 126, 0, 0.2);
    }
    .table-wrapper { overflow-x: auto; margin-bottom: 20px; }
    table { 
      width: 100%; 
      border-collapse: separate;
      border-spacing: 0;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    th, td { 
      padding: 14px 18px; 
      text-align: left; 
      border-bottom: 1px solid #e1e4e8;
    }
    th { 
      background: linear-gradient(180deg, #f6f8fa 0%, #eaeef2 100%);
      font-weight: 600; 
      color: #24292e;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    td {
      color: #586069;
      font-size: 14px;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: #f6f8fa;
    }
    .score-card { 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      padding: 30px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px; 
      margin-bottom: 25px;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    }
    .score-card .score { 
      font-size: 56px; 
      font-weight: 700; 
      color: white;
      margin-right: 30px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .score-card .info { 
      line-height: 1.8;
      color: white;
    }
    .score-card .info div {
      font-size: 15px;
      font-weight: 400;
      margin-bottom: 4px;
      opacity: 0.95;
    }
    .subsection-title {
      font-size: 16px;
      color: #24292e;
      margin: 20px 0 12px;
      font-weight: 600;
      padding-left: 12px;
      border-left: 3px solid #667eea;
    }
    
    /* Device Ranking Styles */
    .device-ranking-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .device-card {
      background: white;
      border: 1px solid #e1e4e8;
      border-radius: 8px;
      padding: 18px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .device-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
    }
    .device-card:hover {
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
      transform: translateY(-2px);
      border-color: #667eea;
    }
    .device-card.offline {
      background: #fff5f5;
      border-color: #e74c3c;
      opacity: 0.85;
    }
    .device-card.offline::before {
      background: linear-gradient(180deg, #e74c3c 0%, #c0392b 100%);
    }
    .device-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .device-rank {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 18px;
      font-weight: 700;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }
    .device-rank.top3 {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .device-alarm-count {
      font-size: 24px;
      font-weight: 700;
      color: #e74c3c;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .device-type-badge {
      display: inline-flex;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
      margin-bottom: 8px;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
    }
    .device-type-badge.transmission {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .device-type-badge.firecontrol {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }
    .offline-badge {
      display: inline-block;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      margin-left: 8px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .device-position {
      color: #586069;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #e1e4e8;
    }
    .device-position-label {
      font-size: 12px;
      color: #959da5;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .offline-warning {
      background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
      border-left: 4px solid #e74c3c;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(231, 76, 60, 0.15);
    }
    .offline-warning-title {
      font-size: 16px;
      font-weight: 700;
      color: #c0392b;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
    .offline-warning-title::before {
      content: '⚠️';
      margin-right: 8px;
      font-size: 20px;
    }
    .offline-warning-text {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .no-data-message {
      text-align: center;
      padding: 40px 20px;
      color: #959da5;
      font-size: 14px;
      background: white;
      border-radius: 8px;
      border: 2px dashed #e1e4e8;
    }
    .no-data-message::before {
      content: '📊';
      display: block;
      font-size: 48px;
      margin-bottom: 12px;
    }
        .ai-suggestion-content {
      background: white;
      padding: 25px;
      border-radius: 8px;
      border: 1px solid #e1e4e8;
      min-height: 140px;
      display: flex;
      flex-direction: column;
    }
    .ai-suggestion-text {
      color: #24292e;
      font-size: 14px;
      line-height: 1.8;
      white-space: pre-line; /* 保留换行符 */
      flex: 1;
    }
    .disclaimer-text {
      margin-top: 15px;
      color: #959da5;
      font-size: 12px;
      text-align: right;
      font-style: italic;
    }
    .footer-note {
      margin-top: 45px;
      padding-top: 25px;
      border-top: 2px solid #e1e4e8;
      color: #959da5;
      font-size: 13px;
      line-height: 1.8;
    }
    @media print {
      body { background: white; padding: 0; }
      .report-container { box-shadow: none; }
      .device-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- 头部信息 -->
    <div class="header">
      <h1>${report.reportMeta.companyName || ''} ${report.reportMeta.reportMonth}月度安全评分报告</h1>
      <div class="meta">
        项目编号：${report.reportMeta.projectNo} | 生成时间：${report.reportMeta.generateTime}
      </div>
    </div>

    <!-- 离线设备警告 -->
    ${report.scoreOverview.hasOfflineDevices ? `
      <div class="offline-warning">
        <div class="offline-warning-title">设备离线警告</div>
        <div class="offline-warning-text">
          该单位共有 <strong>${report.scoreOverview.totalDeviceCount}</strong> 台设备，
          其中 <strong>${report.scoreOverview.offlineDeviceCount}</strong> 台设备长期离线（超过72小时），
          离线比例达 <strong>${(report.scoreOverview.offlineDeviceCount! / report.scoreOverview.totalDeviceCount! * 100).toFixed(1)}%</strong>。
          <br/>
          <strong>该单位因设备离线不参与本期评分排名，请尽快修复设备或联系维护人员。</strong>
        </div>
      </div>
    ` : ''}

    <!-- 评分概况 -->
    <div class="section">
      <h2 class="section-title">一、评分概况</h2>
      <div class="score-card">
        <div class="score">${report.scoreOverview.finalScore}分</div>
        <div class="info">
          <div>评级：${report.scoreOverview.scoreLevel}</div>
          <div>登录频次：${report.scoreOverview.detail.loginFrequency}次（${report.scoreOverview.detail.loginScore}分）</div>
          <div>告警频次：${report.scoreOverview.detail.alarmFrequency}次（${report.scoreOverview.detail.alarmScore}分）</div>
          <div>告警处理率：${report.scoreOverview.detail.handlingRate.toFixed(1)}%（${report.scoreOverview.detail.handlingScore}分）</div>
          <div>及时处理得分：${report.scoreOverview.detail.timelinessWithDelay.toFixed(1)}分（${report.scoreOverview.detail.timelinessScore}分）</div>
        </div>
      </div>
    </div>

    <!-- 告警分析 -->
    <div class="section">
      <h2 class="section-title">二、告警分析</h2>
      <div class="table-wrapper">
        <table>
          <tr>
            <th>总告警数</th>
            <th>已处理数</th>
            <th>未处理数</th>
            <th>处理率</th>
            <th>平均响应时长</th>
          </tr>
          <tr>
            <td>${report.alarmStats.total}</td>
            <td>${report.alarmStats.handled}</td>
            <td>${report.alarmStats.unhandled}</td>
            <td>${report.alarmStats.handlingRate}</td>
            <td>${report.alarmStats.avgResponseDuration}</td>
          </tr>
        </table>
      </div>

      <!-- 告警类型分布 -->
      <h3 class="subsection-title">2.1 告警类型分布</h3>
      <div class="table-wrapper">
        <table>
          <tr>
            <th>排名</th>
            <th>告警类型</th>
            <th>数量</th>
            <th>占比</th>
          </tr>
          ${report.alarmStats.topAlarmTypes.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${alarmTypeMap[item.type] || item.type}</td>
              <td>${item.count}</td>
              <td>${item.rate}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <!-- 设备告警排名 -->
      <h3 class="subsection-title">2.2 设备告警排名</h3>
      ${report.alarmStats.deviceAlarmRanking.length > 0 ? `
        <div class="device-ranking-grid">
          ${report.alarmStats.deviceAlarmRanking.slice(0, 10).map(device => `
            <div class="device-card ${device.isOffline ? 'offline' : ''}">
              <div class="device-card-header">
                <div class="device-rank ${device.rank <= 3 && !device.isOffline ? 'top3' : ''}">#${device.rank}</div>
                <div class="device-alarm-count">
                  ${device.alarmCount}次
                  ${device.isOffline ? '<span class="offline-badge">离线</span>' : ''}
                </div>
              </div>
              ${device.deviceType ? `
                <div class="device-type-badge ${device.deviceType === 'transmissionDevice' ? 'transmissionDevice' : 'fireControlHost'}">
                  ${getDeviceTypeDisplay(device.deviceType)}
                </div>
              ` : ''}
              <div class="device-position">
                <div class="device-position-label">设备位置</div>
                ${device.position}
                ${device.isOffline && device.offlineDuration ? `
                  <div style="margin-top: 8px; color: #e74c3c; font-size: 12px;">
                    ⚠️ 已离线 ${device.offlineDuration}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${report.alarmStats.deviceAlarmRanking.length > 10 ? `
          <div style="text-align: center; margin-top: 15px; color: #959da5; font-size: 13px;">
            仅展示前10个告警频次最高的设备，共${report.alarmStats.deviceAlarmRanking.length}个设备产生告警
          </div>
        ` : ''}
      ` : `
        <div class="no-data-message">
          本周期暂无设备告警数据
        </div>
      `}
    </div>
    
    <!-- AI分析建议（新增部分） -->
    <div class="section">
      <h2 class="section-title">
        三、AI分析建议
        <span class="beta-tag">beta</span>
      </h2>
      <div class="ai-suggestion-content">
        ${report.aiComment ? `
          <div class="ai-suggestion-text">${report.aiComment}</div>
        ` : `
          <div class="no-data-message" style="margin: 0; border: none; padding: 20px 0;">
            暂无AI分析建议
          </div>
        `}
        <div class="disclaimer-text">ai分析自动生成，内容仅供参考</div>
      </div>
    </div>

    <!-- 底部备注 -->
    <div class="footer-note">
      备注：1. 评分基于登录频次(20%)、告警频次(30%)、告警处理率(25%)、及时处理得分(25%)计算；2. 逾期级别依据《安全告警处理规范》划分；3. 设备告警排名展示告警次数最多的设备，用于重点关注与维护；4. 📡 用户传输装置、🚨 火警报警主机。
    </div>
  </div>
</body>
</html>
  `;
};