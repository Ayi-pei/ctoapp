/**
 * 系统健康检查工具
 * 综合检查应用的各个方面
 */

import { checkEnvironmentVariables } from './env-check';
import { performSecurityCheck } from './security-check';
import { performPerformanceCheck } from './performance-check';

export interface SystemHealthReport {
  overall: 'healthy' | 'warning' | 'critical';
  environment: ReturnType<typeof checkEnvironmentVariables>;
  security: ReturnType<typeof performSecurityCheck>;
  performance: ReturnType<typeof performPerformanceCheck>;
  timestamp: string;
}

export function generateHealthReport(): SystemHealthReport {
  const environment = checkEnvironmentVariables();
  const security = performSecurityCheck();
  const performance = performPerformanceCheck();

  // 确定整体健康状态
  let overall: 'healthy' | 'warning' | 'critical' = 'healthy';

  if (!environment.isValid || security.some(s => s.type === 'critical')) {
    overall = 'critical';
  } else if (
    environment.warnings.length > 0 || 
    security.some(s => s.type === 'warning') ||
    performance.some(p => p.severity === 'high')
  ) {
    overall = 'warning';
  }

  return {
    overall,
    environment,
    security,
    performance,
    timestamp: new Date().toISOString()
  };
}

export function logSystemHealth(): void {
  const report = generateHealthReport();
  
  console.log('🏥 系统健康检查报告');
  console.log('='.repeat(50));
  
  // 整体状态
  const statusEmoji = {
    healthy: '✅',
    warning: '⚠️',
    critical: '🚨'
  };
  
  console.log(`${statusEmoji[report.overall]} 整体状态: ${report.overall.toUpperCase()}`);
  console.log(`📅 检查时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}`);
  console.log('');

  // 环境变量检查
  console.log('🔧 环境变量:');
  if (report.environment.isValid) {
    console.log('  ✅ 所有必需变量已设置');
  } else {
    console.log('  ❌ 缺失变量:', report.environment.missing.join(', '));
  }
  if (report.environment.warnings.length > 0) {
    console.log('  ⚠️  警告:', report.environment.warnings.length, '个');
  }
  console.log('');

  // 安全检查
  console.log('🔒 安全状态:');
  const criticalSecurity = report.security.filter(s => s.type === 'critical');
  const warningSecurity = report.security.filter(s => s.type === 'warning');
  
  if (criticalSecurity.length === 0 && warningSecurity.length === 0) {
    console.log('  ✅ 未发现安全问题');
  } else {
    if (criticalSecurity.length > 0) {
      console.log('  🚨 严重问题:', criticalSecurity.length, '个');
    }
    if (warningSecurity.length > 0) {
      console.log('  ⚠️  警告:', warningSecurity.length, '个');
    }
  }
  console.log('');

  // 性能检查
  console.log('⚡ 性能状态:');
  const highPerf = report.performance.filter(p => p.severity === 'high');
  const mediumPerf = report.performance.filter(p => p.severity === 'medium');
  
  if (highPerf.length === 0 && mediumPerf.length === 0) {
    console.log('  ✅ 性能良好');
  } else {
    if (highPerf.length > 0) {
      console.log('  🔴 高优先级问题:', highPerf.length, '个');
    }
    if (mediumPerf.length > 0) {
      console.log('  🟡 中等优先级问题:', mediumPerf.length, '个');
    }
  }
  
  console.log('='.repeat(50));
  
  // 如果有严重问题，显示详细信息
  if (report.overall === 'critical') {
    console.log('');
    console.log('🚨 需要立即处理的问题:');
    
    if (!report.environment.isValid) {
      console.log('  - 环境变量配置不完整');
      report.environment.suggestions.forEach(s => console.log(`    💡 ${s}`));
    }
    
    criticalSecurity.forEach(issue => {
      console.log(`  - ${issue.message}`);
      console.log(`    💡 ${issue.suggestion}`);
    });
  }
}

// 开发环境下自动运行健康检查
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  // 延迟执行，避免在模块加载时立即运行
  setTimeout(() => {
    logSystemHealth();
  }, 1000);
}