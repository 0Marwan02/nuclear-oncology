# Elevated: enable TCP on SQLEXPRESS, pin to port 1433, start the service.
$ErrorActionPreference = 'Stop'
$instId = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL').'SQLEXPRESS'
Write-Host "Instance ID: $instId"
$tcp   = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instId\MSSQLServer\SuperSocketNetLib\Tcp"
$ipall = Join-Path $tcp 'IPAll'

Set-ItemProperty -Path $tcp   -Name 'Enabled' -Value 1                 # enable TCP protocol
Set-ItemProperty -Path $ipall -Name 'TcpDynamicPorts' -Value ''        # clear dynamic port
Set-ItemProperty -Path $ipall -Name 'TcpPort' -Value '1433'            # static port 1433
Write-Host "TCP enabled, static port 1433 set."

Set-Service -Name 'MSSQL$SQLEXPRESS' -StartupType Automatic
Restart-Service -Name 'MSSQL$SQLEXPRESS' -Force
Start-Sleep -Seconds 3
$s = Get-Service 'MSSQL$SQLEXPRESS'
Write-Host "MSSQL`$SQLEXPRESS status: $($s.Status)"

# Confirm it's listening on 1433
$ok = (Test-NetConnection localhost -Port 1433 -WarningAction SilentlyContinue).TcpTestSucceeded
Write-Host "Port 1433 reachable: $ok"
Write-Host "DONE"
