$ErrorActionPreference='Stop'
$directory=Join-Path $PSScriptRoot '..\.tmp\focus-native-guard'
$null=New-Item -ItemType Directory -Path $directory -Force
$config=Join-Path $directory 'Deskflow.conf'
$log=Join-Path $directory 'deskflow.log'
[IO.File]::WriteAllText($log,"[x] INFO: started client`n[x] INFO: connected to secure socket`n[x] INFO: entering computer`n")
$source=[IO.File]::ReadAllText((Join-Path $PSScriptRoot '..\native\deskflow-state.ps1')).Replace("'C:\ProgramData\Deskflow\Deskflow.conf'",("'"+$config+"'"))
$script:parent=42;$script:tcp=$true
function Get-CimInstance($ClassName,$Filter) {
    if($ClassName -eq 'Win32_Service'){return [pscustomobject]@{State='Running';ProcessId=42;PathName='"C:\Program Files\Deskflow\deskflow-daemon.exe"'}}
    return [pscustomobject]@{ProcessId=123;ParentProcessId=$script:parent;SessionId=[Diagnostics.Process]::GetCurrentProcess().SessionId}
}
function Get-NetTCPConnection($RemotePort,$State,$ErrorAction) {if($script:tcp){return [pscustomobject]@{OwningProcess=123;RemoteAddress='192.168.1.32'}}}
function Write-Config($tls) {[IO.File]::WriteAllText($config,"[core]`ncomputerName=$env:COMPUTERNAME`ncoreMode=1`n[security]`ntlsEnabled=$tls`ncheckPeerFingerprints=true`n[client]`nremoteHost=unresolvable-focus-fixture.invalid`n[log]`nfile=$log`n")}
Write-Config 'true'
$valid=& ([scriptblock]::Create($source)) | ConvertFrom-Json
if(!$valid.connected -or $valid.events -notmatch 'entering computer'){throw 'Live service-owned TLS client must not require a fresh DNS result.'}
$script:parent=9;$bad=& ([scriptblock]::Create($source)) | ConvertFrom-Json
if($bad.connected){throw 'Wrong service parent must be refused.'}
$script:parent=42;Write-Config 'false';$bad=& ([scriptblock]::Create($source)) | ConvertFrom-Json
if($bad.connected){throw 'Disabled TLS must be refused.'}
Write-Config 'true';$script:tcp=$false;$bad=& ([scriptblock]::Create($source)) | ConvertFrom-Json
if($bad.connected){throw 'Disconnected client must be refused.'}
'PASS: unresolved hostname with existing secure client, service-parent validation, TLS-disabled rejection, disconnected-client rejection; no DDC writes.'
