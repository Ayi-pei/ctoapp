# PowerShell脚本：为所有page.tsx文件添加dynamic='force-dynamic'设置

# 获取所有 page.tsx 文件
$files = Get-ChildItem -Path "src\app" -Name "page.tsx" -Recurse | ForEach-Object { "src\app\$_" }

Write-Host "Found $($files.Count) page.tsx files to process:"
$files | ForEach-Object { Write-Host "  - $_" }
Write-Host ""

foreach ($file in $files) {
    $fullPath = Join-Path $PWD $file
    if (Test-Path $fullPath) {
        Write-Host "Processing $file..."
        $content = Get-Content $fullPath -Raw
        
        # 检查是否已经有dynamic设置
        if ($content -notmatch 'export const dynamic') {
            # 检查是否有"use client"指令
            if ($content -match '"use client"') {
                # 在"use client"后添加dynamic设置
                $pattern = '("use client";[\r\n]*)'
                $replacement = '$1' + "`n// Disable SSR for this page to avoid context issues`nexport const dynamic = 'force-dynamic';`n"
                
                $newContent = $content -replace $pattern, $replacement
                Set-Content $fullPath $newContent -NoNewline
                Write-Host "Added dynamic setting to $file" -ForegroundColor Green
            } else {
                # 在文件开头添加"use client"和dynamic设置
                $newContent = '"use client";' + "`n`n// Disable SSR for this page to avoid context issues`nexport const dynamic = 'force-dynamic';`n`n" + $content
                Set-Content $fullPath $newContent -NoNewline
                Write-Host "Added 'use client' and dynamic setting to $file" -ForegroundColor Green
            }
        } else {
            Write-Host "Dynamic setting already exists in $file" -ForegroundColor Yellow
        }
    } else {
        Write-Host "File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nBatch processing complete!" -ForegroundColor Green