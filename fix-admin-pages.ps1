# PowerShell脚本：为所有admin页面添加dynamic='force-dynamic'设置

$files = @(
    "src\app\admin\requests\page.tsx",
    "src\app\admin\settings\page.tsx",
    "src\app\admin\settings\investment\page.tsx",
    "src\app\admin\settings\market\page.tsx",
    "src\app\admin\settings\market-crypto\page.tsx",
    "src\app\admin\settings\market-forex\page.tsx",
    "src\app\admin\finance\page.tsx",
    "src\app\admin\finance\activities\page.tsx",
    "src\app\admin\finance\tasks\page.tsx",
    "src\app\dashboard\page.tsx",
    "src\app\profile\page.tsx",
    "src\app\market\page.tsx",
    "src\app\staking\page.tsx",
    "src\app\swap\page.tsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PWD $file
    if (Test-Path $fullPath) {
        Write-Host "Processing $file..."
        $content = Get-Content $fullPath -Raw
        
        # 检查是否已经有dynamic设置
        if ($content -notmatch 'export const dynamic') {
            # 找到import部分的结尾，在其后添加dynamic设置
            $pattern = '(?s)(import[^;]+;[\r\n]*)+(?=[\r\n]*[^i\r\n])'
            $replacement = '$&' + "`n// Disable SSR for this page to avoid context issues`nexport const dynamic = 'force-dynamic';`n"
            
            $newContent = $content -replace $pattern, $replacement
            Set-Content $fullPath $newContent -NoNewline
            Write-Host "Added dynamic setting to $file" -ForegroundColor Green
        } else {
            Write-Host "Dynamic setting already exists in $file" -ForegroundColor Yellow
        }
    } else {
        Write-Host "File not found: $file" -ForegroundColor Red
    }
}

Write-Host "Batch processing complete!" -ForegroundColor Green