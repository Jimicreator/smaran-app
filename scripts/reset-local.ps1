$ErrorActionPreference = "Stop"
Write-Host "[smaran] Stopping Smaran dev server..."
try { npm run dev:stop } catch { }
Start-Sleep -Milliseconds 500

foreach ($target in @(".next", "node_modules", "package-lock.json")) {
  if (Test-Path $target) {
    Write-Host "[smaran] Removing $target"
    try {
      Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
    } catch {
      Write-Host "[smaran] Could not remove $target. Close VS Code terminals/processes using this folder and rerun this script." -ForegroundColor Yellow
      throw
    }
  }
}

Write-Host "[smaran] Cleaned local dependencies/cache artifacts. Now run:"
Write-Host "  npm install --legacy-peer-deps"
Write-Host "  npm run doctor"
Write-Host "  npm run dev"
