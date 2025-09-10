/**
 * 安全检查工具
 * 用于检测常见的安全问题和最佳实践
 */

export interface SecurityIssue {
  type: 'critical' | 'warning' | 'info';
  message: string;
  file?: string;
  suggestion: string;
}

export function performSecurityCheck(): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // 检查环境变量安全性
  if (typeof window === 'undefined') {
    // 服务端检查
    if (process.env.ADMIN_KEY && process.env.ADMIN_KEY.length < 8) {
      issues.push({
        type: 'warning',
        message: '管理员密码长度不足',
        suggestion: '建议使用至少 8 位字符的强密码'
      });
    }

    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
      issues.push({
        type: 'critical',
        message: 'SESSION_SECRET 长度不足',
        suggestion: '使用至少 32 个字符的随机字符串作为会话密钥'
      });
    }

    // 检查是否在生产环境中使用了默认值
    const dangerousDefaults = [
      'YOUR_SUPABASE_URL',
      'YOUR_SUPABASE_ANON_KEY',
      'YOUR_SUPABASE_SERVICE_ROLE_KEY'
    ];

    dangerousDefaults.forEach(defaultValue => {
      Object.values(process.env).forEach(value => {
        if (value?.includes(defaultValue)) {
          issues.push({
            type: 'critical',
            message: `检测到默认配置值: ${defaultValue}`,
            suggestion: '请更新为实际的配置值'
          });
        }
      });
    });
  }

  // 检查客户端暴露的敏感信息
  const clientEnvVars = Object.keys(process.env).filter(key => 
    key.startsWith('NEXT_PUBLIC_')
  );

  const sensitiveKeywords = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN'];
  clientEnvVars.forEach(envVar => {
    sensitiveKeywords.forEach(keyword => {
      if (envVar.includes(keyword) && envVar !== 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
        issues.push({
          type: 'critical',
          message: `敏感信息可能暴露给客户端: ${envVar}`,
          suggestion: '移除 NEXT_PUBLIC_ 前缀，仅在服务端使用'
        });
      }
    });
  });

  return issues;
}

export function logSecurityStatus(): void {
  const issues = performSecurityCheck();
  
  console.log('🔒 安全检查结果:');
  
  if (issues.length === 0) {
    console.log('✅ 未发现安全问题');
    return;
  }

  const critical = issues.filter(i => i.type === 'critical');
  const warnings = issues.filter(i => i.type === 'warning');
  const info = issues.filter(i => i.type === 'info');

  if (critical.length > 0) {
    console.error('🚨 严重安全问题:');
    critical.forEach(issue => {
      console.error(`  - ${issue.message}`);
      console.error(`    建议: ${issue.suggestion}`);
    });
  }

  if (warnings.length > 0) {
    console.warn('⚠️  安全警告:');
    warnings.forEach(issue => {
      console.warn(`  - ${issue.message}`);
      console.warn(`    建议: ${issue.suggestion}`);
    });
  }

  if (info.length > 0) {
    console.log('💡 安全建议:');
    info.forEach(issue => {
      console.log(`  - ${issue.message}`);
      console.log(`    建议: ${issue.suggestion}`);
    });
  }
}