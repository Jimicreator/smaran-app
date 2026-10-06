# Run PowerShell as Administrator once if phones on the same Wi-Fi cannot open http://<PC-IP>:3000
$rule = Get-NetFirewallRule -DisplayName "Smaran Dev TCP 3000" -ErrorAction SilentlyContinue
if (-not $rule) {
  New-NetFirewallRule -DisplayName "Smaran Dev TCP 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private
  Write-Host "Smaran TCP 3000 is now allowed on the Windows Private network."
} else {
  Write-Host "Smaran TCP 3000 firewall rule already exists."
}
