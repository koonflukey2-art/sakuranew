git add .
git commit -m "Update: $(Get-Date -Format 'HH:mm:ss')"
git push origin main
Write-Host "✅ Push สำเร็จ!" -ForegroundColor Green