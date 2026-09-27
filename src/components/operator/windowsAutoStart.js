export const windowsAutoStart = String.raw`$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $root 'operator-device.json'))) { throw 'Pair this computer before enabling auto-start.' }
$python = Join-Path $root '.venv\Scripts\python.exe'
$script = Join-Path $root 'operator_companion.py'
if (-not (Test-Path $python) -or -not (Test-Path $script)) { throw 'Run start-windows.cmd first to install the companion.' }
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $python -Argument ('"' + $script + '" --worker --allow-input') -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'XtremeOperatorCompanion' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName 'XtremeOperatorCompanion'
Write-Host 'Companion scheduled for this user at sign-in. Failure restarts after one minute.'
`;
export const windowsRemoveAutoStart = String.raw`$ErrorActionPreference = 'Stop'
$task = Get-ScheduledTask -TaskName 'XtremeOperatorCompanion' -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName 'XtremeOperatorCompanion' -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName 'XtremeOperatorCompanion' -Confirm:$false
  Write-Host 'Automatic startup removed. Your local pairing file is unchanged.'
} else { Write-Host 'No automatic startup was installed.' }
`;