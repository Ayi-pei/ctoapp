#!/usr/bin/env node

/**
 * 自动修复常见的代码问题
 */

const fs = require('fs');
const path = require('path');

// 需要修复的文件模式
const patterns = [
  {
    // 移除未使用的导入
    pattern: /^import.*?{[^}]*?(\w+)[^}]*?}.*?from.*?;$/gm,
    description: '检查未使用的导入'
  },
  {
    // 修复 prefer-const 问题
    pattern: /let (\w+) = /g,
    replacement: 'const $1 = ',
    description: '将 let 改为 const（如果变量未重新赋值）'
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 简单的 prefer-const 修复
    const letMatches = content.match(/let (\w+) = [^;]+;/g);
    if (letMatches) {
      letMatches.forEach(match => {
        const varName = match.match(/let (\w+) =/)[1];
        // 检查变量是否被重新赋值
        const reassignmentPattern = new RegExp(`\\b${varName}\\s*=(?!=)`, 'g');
        const reassignments = content.match(reassignmentPattern);
        
        if (!reassignments || reassignments.length <= 1) {
          content = content.replace(match, match.replace('let ', 'const '));
          modified = true;
        }
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ 修复了 ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 修复 ${filePath} 时出错:`, error.message);
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
      fixFile(filePath);
    }
  });
}

console.log('🔧 开始修复常见代码问题...');
walkDirectory('./src');
console.log('✅ 修复完成！');