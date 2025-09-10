/**
 * 环境变量检查工具
 * 用于验证必要的环境变量是否正确配置
 */

export interface EnvCheckResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  suggestions: string[];
}

export function checkEnvironmentVariables(): EnvCheckResult {
  const result: EnvCheckResult = {
    isValid: true,
    missing: [],
    warnings: [],
    suggestions: []
  };

  // 必需的客户端环境变量
  const requiredClientVars = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  // 必需的服务端环境变量
  const requiredServerVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SESSION_SECRET'
  ];

  // 可选但推荐的环境变量
  const optionalVars = [
    'ADMIN_NAME',
    'ADMIN_KEY',
    'ADMIN_AUTH',
    'COINGECKO_API_KEY',
    'TATUM_API_KEY'
  ];

  // 检查必需的客户端变量
  requiredClientVars.forEach(varName => {
    if (!process.env[varName]) {
      result.missing.push(varName);
      result.isValid = false;
    }
  });

  // 检查必需的服务端变量（仅在服务端运行时）
  if (typeof window === 'undefined') {
    requiredServerVars.forEach(varName => {
      if (!process.env[varName]) {
        result.missing.push(varName);
        result.isValid = false;
      }
    });
  }

  // 检查可选变量并给出建议
  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      result.warnings.push(`${varName} 未设置`);
    }
  });

  // 特殊检查
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('YOUR_SUPABASE_URL')) {
    result.warnings.push('NEXT_PUBLIC_SUPABASE_URL 仍然是示例值，请更新为实际的 Supabase URL');
  }

  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    result.warnings.push('SESSION_SECRET 长度不足，建议至少 32 个字符');
  }

  // 添加建议
  if (result.missing.length > 0) {
    result.suggestions.push('请复制 .env.example 为 .env 并填写必要的环境变量');
  }

  if (!process.env.COINGECKO_API_KEY) {
    result.suggestions.push('建议设置 COINGECKO_API_KEY 以获取更稳定的市场数据');
  }

  return result;
}

export function logEnvironmentStatus(): void {
  const result = checkEnvironmentVariables();
  
  console.log('🔧 环境变量检查结果:');
  
  if (result.isValid) {
    console.log('✅ 所有必需的环境变量都已设置');
  } else {
    console.error('❌ 缺失必需的环境变量:', result.missing);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  警告:', result.warnings);
  }

  if (result.suggestions.length > 0) {
    console.log('💡 建议:', result.suggestions);
  }
}