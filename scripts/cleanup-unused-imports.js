#!/usr/bin/env node

/**
 * 清理未使用的导入
 */

const fs = require('fs');
const path = require('path');

function removeUnusedImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 常见的未使用导入模式
    const unusedPatterns = [
      // 未使用的 React 导入
      { pattern: /import.*?{\s*useEffect\s*}.*?from\s+['"]react['"];?\s*\n/g, check: 'useEffect' },
      { pattern: /import.*?{\s*useState\s*}.*?from\s+['"]react['"];?\s*\n/g, check: 'useState' },
      { pattern: /import.*?{\s*useCallback\s*}.*?from\s+['"]react['"];?\s*\n/g, check: 'useCallback' },
      
      // 未使用的图标导入
      { pattern: /import.*?{\s*(\w+)\s*}.*?from\s+['"]lucide-react['"];?\s*\n/g, check: null },
    ];

    unusedPatterns.forEach(({ pattern, check }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (check) {
            // 检查是否在代码中使用
            const usagePattern = new RegExp(`\\b${check}\\b`, 'g');
            const usages = content.replace(match, '').match(usagePattern);
            
            if (!usages || usages.length === 0) {
              content = content.replace(match, '');
              modified = true;
              console.log(`  - 移除未使用的导入: ${check}`);
            }
          }
        });
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ 清理了 ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 清理 ${filePath} 时出错:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      removeUnusedImports(filePath);
    }
  });
}

console.log('🧹 开始清理未使用的导入...');
walkDirectory('./src');
console.log('✅ 清理完成！');