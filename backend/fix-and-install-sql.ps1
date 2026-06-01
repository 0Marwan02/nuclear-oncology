# Elevated: rebuild perf counters, install SQL Server Express SQLEXPRESS01, pin to TCP 1433.
$ErrorActionPreference = 'Continue'
$log = 'C:\Projects\nuclear-oncology\backend\sql-install.log'
"" | Set-Content $log
function Log($m){ $line = "$(Get-Date -Format 'HH:mm:ss')  $m"; $line | Add-Content $log; Write-Host $line }

Log "=== STEP 1: Rebuild Windows performance counters ==="
Start-Process -FilePath "$env:WINDIR\System32\lodctr.exe" -ArgumentList '/R' -Wait -NoNewWindow
Start-Process -FilePath "$env:WINDIR\SysWOW64\lodctr.exe" -ArgumentList '/R' -Wait -NoNewWindow
Start-Process -FilePath "$env:WINDIR\System32\winmgmt.exe" -ArgumentList '/resyncperf' -Wait -NoNewWindow
Log "Perf counters rebuilt."

Log "=== STEP 2: Install SQL Server Express (instance SQLEXPRESS01) ==="
$setup = 'C:\SQL2022\Express_ENU\SETUP.EXE'
if (-not (Test-Path $setup)) { Log "ERROR: setup.exe not found at $setup"; exit 10 }
$me = "$env:USERDOMAIN\$env:USERNAME"
Log "Sysadmin account: $me"
$setupArgs = @(
  '/Q','/ACTION=Install','/FEATURES=SQLENGINE','/INSTANCENAME=SQLEXPRESS01',
  '/SQLSVCSTARTUPTYPE=Automatic','/BROWSERSVCSTARTUPTYPE=Automatic',
  '/AGTSVCSTARTUPTYPE=Disabled','/TCPENABLED=1','/NPENABLED=1',
  '/ADDCURRENTUSERASSQLADMIN=True',"/SQLSYSADMINACCOUNTS=$me",
  '/IACCEPTSQLSERVERLICENSETERMS','/SUPPRESSPRIVACYSTATEMENTNOTICE','/INDICATEPROGRESS'
)
Log ("setup.exe " + ($setupArgs -join ' '))
$p = Start-Process -FilePath $setup -ArgumentList $setupArgs -Wait -NoNewWindow -PassThru
Log "Setup exit code: $($p.ExitCode)"
if ($p.ExitCode -ne 0) { Log "Setup FAILED (exit $($p.ExitCode)). See SQL Setup Bootstrap logs."; exit $p.ExitCode }

Log "=== STEP 3: Pin SQLEXPRESS01 to static TCP port 1433 ==="
$svc = 'MSSQL$SQLEXPRESS01'
# Find the instance's registry hive (MSSQL16.SQLEXPRESS01)
$instId = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL' -ErrorAction SilentlyContinue).'SQLEXPRESS01'
Log "Instance ID: $instId"
$tcpAll = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instId\MSSQLServer\SuperSocketNetLib\Tcp\IPAll"
if (Test-Path $tcpAll) {
  Set-ItemProperty -Path $tcpAll -Name 'TcpDynamicPorts' -Value ''   # clear dynamic port
  Set-ItemProperty -Path $tcpAll -Name 'TcpPort' -Value '1433'       # static 1433
  Log "Set static TCP port 1433 on $tcpAll"
} else {
  Log "WARNING: TCP IPAll key not found at $tcpAll"
}
# Ensure TCP protocol enabled
$tcpRoot = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instId\MSSQLServer\SuperSocketNetLib\Tcp"
if (Test-Path $tcpRoot) { Set-ItemProperty -Path $tcpRoot -Name 'Enabled' -Value 1 }

Log "Restarting $svc ..."
Restart-Service -Name $svc -Force -ErrorAction Continue
Start-Sleep -Seconds 3
$s = Get-Service -Name $svc -ErrorAction SilentlyContinue
Log "Service $svc status: $($s.Status)"
Log "=== DONE ==="
