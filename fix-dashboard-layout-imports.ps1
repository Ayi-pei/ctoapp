# 批量修复 dashboard-layout 导入问题
Write-Host "开始修复 dashboard-layout 导入问题..." -ForegroundColor Green

$files = @(
    "src\admin\finance\tasks\page.tsx",
    "src\app\activities\page.tsx",
    "src\app\admin\finance\activities\page.tsx",
    "src\app\admin\finance\announcements\page.tsx",
    "src\app\admin\finance\dashboard\page.tsx",
    "src\app\admin\logs\page.tsx",
    "src\app\admin\orders\page.tsx",
    "src\app\admin\requests\page.tsx",
    "src\app\admin\settings\general\page.tsx",
    "src\app\admin\settings\investment\page.tsx",
    "src\app\admin\settings\market-crypto\page.tsx",
    "src\app\admin\settings\market-forex\page.tsx",
    "src\app\admin\users\page.tsx",
    "src\app\announcements\page.tsx",
    "src\app\coming-soon\page.tsx",
    "src\app\dashboard\page.tsx",
    "src\app\download\page.tsx",
    "src\app\finance\page.tsx",
    "src\app\market\page.tsx",
    "src\app\options\page.tsx",
    "src\app\profile\assets\page.tsx",
    "src\app\profile\orders\page.tsx",
    "src\app\profile\page.tsx",
    "src\app\profile\payment\page.tsx",
    "src\app\profile\promotion\page.tsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Host "修复文件: $file" -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw
        
        # 替换导入语句
        $content = $content -replace '@/components/dashboard-layout', '@/components/dashboard-layout.tsx'
        
        Set-Content $fullPath $content -NoNewline
        Write-Host "  ✓ 已修复" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 文件不存在: $file" -ForegroundColor Red
    }
}

Write-Host "修复完成！" -ForegroundColor Green