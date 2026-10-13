$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $PSScriptRoot 'SwitchyNative.dll')
$guard=Join-Path $PSScriptRoot 'deskflow-state.ps1'
while($null -ne ($line=[Console]::ReadLine())) {
    $id=$null
    try {
        if($line.Length -gt 4096){throw 'Native request too large.'}
        $request=$line | ConvertFrom-Json;$id=$request.id
        if($id -isnot [int] -or $id -lt 1){throw 'Invalid native request id.'}
        $clock=[Diagnostics.Stopwatch]::StartNew()
        switch($request.action) {
            'state' {$value=& $guard | ConvertFrom-Json}
            'focus' {
                if($request.target -notin @('windows','mac')){throw 'Invalid focus target.'}
                $guardClock=[Diagnostics.Stopwatch]::StartNew()
                $state=& $guard | ConvertFrom-Json
                $target=$null;$connected=$false
                foreach($event in ($state.events -split '\r?\n')) {
                    if($event -match '(?:^|\]\s+)INFO: connected to secure socket$'){$connected=$true;$target=$null}
                    elseif($event -match '(?:^|\]\s+)INFO: (started client|stopped client|server is dead)$' -or $event -match '(?:^|\]\s+)WARNING: failed to connect to server'){$connected=$false;$target=$null}
                    elseif($connected -and $event -match '(?:^|\]\s+)INFO: entering computer$'){$target='windows'}
                    elseif($connected -and $event -match '(?:^|\]\s+)INFO: leaving computer$'){$target='mac'}
                }
                $guardClock.Stop();$guardAt=[DateTime]::UtcNow.ToString('o')
                if(!$state.connected -or !$connected -or $target -ne $request.target){$value=@{sent=$false;reason='SecureClientFocusChanged';clientPid=$state.processId;guardMs=$guardClock.Elapsed.TotalMilliseconds;guardAt=$guardAt}}
                else {
                    if($request.input -isnot [int] -or $request.input -lt 1 -or $request.input -gt 255){throw 'Invalid input code.'}
                    $setClock=[Diagnostics.Stopwatch]::StartNew();$setStartedAt=[DateTime]::UtcNow.ToString('o')
                    $null=[SwitchyDDC]::Run('set',[string]$request.monitorId,[uint32]$request.input)
                    $setClock.Stop()
                    $value=@{sent=$true;input=$request.input;guarded=$true;clientPid=$state.processId;guardMs=$guardClock.Elapsed.TotalMilliseconds;guardAt=$guardAt;setStartedAt=$setStartedAt;sentAt=[DateTime]::UtcNow.ToString('o');setMs=$setClock.Elapsed.TotalMilliseconds}
                }
            }
            'set' {
                if($request.input -isnot [int] -or $request.input -lt 1 -or $request.input -gt 255){throw 'Invalid input code.'}
                $null=[SwitchyDDC]::Run('set',[string]$request.monitorId,[uint32]$request.input)
                $value=@{sent=$true;input=$request.input}
            }
            'audio-step' {
                if($request.step -notin @('volume','unmute','verify-volume','verify-mute')){throw 'Invalid audio step.'}
                $null=[SwitchyDDC]::Run([string]$request.step,[string]$request.monitorId,0)
                $value=@{sent=$true}
            }
            default {throw 'Unknown native action.'}
        }
        $clock.Stop()
        [Console]::WriteLine((@{id=$id;ok=$true;value=$value;nativeMs=$clock.Elapsed.TotalMilliseconds}|ConvertTo-Json -Compress -Depth 5))
    }catch{[Console]::WriteLine((@{id=$id;ok=$false;error=$_.Exception.GetBaseException().Message}|ConvertTo-Json -Compress))}
}
