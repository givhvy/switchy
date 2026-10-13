$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;using System.Collections.Generic;using System.Diagnostics;
public class FastGuard {
 public static int Count=1;public static uint Parent=42;public static bool Connected=true;public static bool Running=true;public static uint Session=(uint)Process.GetCurrentProcess().SessionId;
 public class Core {public uint ProcessId=123,ParentProcessId=Parent,SessionId=Session;}
 public class Service {public uint ProcessId=42;public string State=Running?"Running":"Stopped",PathName="\"C:\\Program Files\\Deskflow\\deskflow-daemon.exe\"";}
 public class Owners {public List<Core> cores=new List<Core>();public Service service=new Service();}
 public static Owners ReadOwners(){var result=new Owners();for(int i=0;i<Count;i++)result.cores.Add(new Core());return result;}
 public static bool OwnsConnection(uint pid,int family){return Connected;}
}
'@
$directory=Join-Path $PSScriptRoot '..\.tmp\focus-fast-guard'
$null=New-Item -ItemType Directory -Path $directory -Force
$config=Join-Path $directory 'Deskflow.conf';$log=Join-Path $directory 'deskflow.log'
[IO.File]::WriteAllText($log,"[x] INFO: started client`n[x] INFO: connected to secure socket`n[x] INFO: entering computer`n")
$source=[IO.File]::ReadAllText((Join-Path $PSScriptRoot '..\native\deskflow-state.ps1')).Replace("'C:\ProgramData\Deskflow\Deskflow.conf'",("'"+$config+"'"))
function Config($tls='true',$role=1){[IO.File]::WriteAllText($config,"[core]`ncomputerName=$env:COMPUTERNAME`ncoreMode=$role`n[security]`ntlsEnabled=$tls`ncheckPeerFingerprints=true`n[client]`nremoteHost=unresolvable-focus-fixture.invalid`n[log]`nfile=$log`n")}
function Read-Guard {&([scriptblock]::Create($source)) | ConvertFrom-Json}
function Reject {if((Read-Guard).connected){throw 'Invalid fast guard state was accepted.'}}
Config
if(!(Read-Guard).connected){throw 'Valid native snapshot was refused.'}
[FastGuard]::Parent=9;Reject;[FastGuard]::Parent=42
[FastGuard]::Count=2;Reject;[FastGuard]::Count=1
[FastGuard]::Session=0;Reject;[FastGuard]::Session=[Diagnostics.Process]::GetCurrentProcess().SessionId
[FastGuard]::Running=$false;Reject;[FastGuard]::Running=$true
[FastGuard]::Connected=$false;Reject;[FastGuard]::Connected=$true
Config 'false';Reject;Config 'true' 0;Reject
'PASS: fast owner snapshot refuses wrong parent/multiple cores/wrong session/stopped service/disconnected TCP/disabled TLS/server role; no DDC calls.'
