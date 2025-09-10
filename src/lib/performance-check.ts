/**
 * 性能检查工具
 * 用于检测性能问题和优化建议
 */

export interface PerformanceIssue {
  type: 'performance' | 'memory' | 'bundle';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  file?: string;
}

export function performPerformanceCheck(): PerformanceIssue[] {
  const issues: PerformanceIssue[] = [];

  // 检查是否在客户端运行
  if (typeof window !== 'undefined') {
    // 检查内存使用情况
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
      
      if (usedMB > 100) {
        issues.push({
          type: 'memory',
          severity: 'medium',
          message: `JavaScript 堆内存使用量较高: ${usedMB.toFixed(2)}MB`,
          suggestion: '考虑优化组件渲染和数据管理'
        });
      }
    }

    // 检查页面加载性能
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      
      if (loadTime > 3000) {
        issues.push({
          type: 'performance',
          severity: 'high',
          message: `页面加载时间过长: ${(loadTime / 1000).toFixed(2)}秒`,
          suggestion: '优化资源加载、启用代码分割、压缩资源'
        });
      }
    }

    // 检查是否有大量的 DOM 节点
    const domNodes = document.querySelectorAll('*').length;
    if (domNodes > 2000) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        message: `DOM 节点数量过多: ${domNodes}`,
        suggestion: '考虑虚拟化长列表、延迟加载组件'
      });
    }
  }

  return issues;
}

export function logPerformanceStatus(): void {
  const issues = performPerformanceCheck();
  
  console.log('⚡ 性能检查结果:');
  
  if (issues.length === 0) {
    console.log('✅ 未发现性能问题');
    return;
  }

  const high = issues.filter(i => i.severity === 'high');
  const medium = issues.filter(i => i.severity === 'medium');
  const low = issues.filter(i => i.severity === 'low');

  if (high.length > 0) {
    console.error('🔴 高优先级性能问题:');
    high.forEach(issue => {
      console.error(`  - ${issue.message}`);
      console.error(`    建议: ${issue.suggestion}`);
    });
  }

  if (medium.length > 0) {
    console.warn('🟡 中等优先级性能问题:');
    medium.forEach(issue => {
      console.warn(`  - ${issue.message}`);
      console.warn(`    建议: ${issue.suggestion}`);
    });
  }

  if (low.length > 0) {
    console.log('🟢 低优先级性能建议:');
    low.forEach(issue => {
      console.log(`  - ${issue.message}`);
      console.log(`    建议: ${issue.suggestion}`);
    });
  }
}