$ErrorActionPreference='Stop'
function Get-CoreStartTime([uint32]$ProcessId) {
    $process=Get-CimInstance -ClassName Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
    if(!$process -or $process.CreationDate -isnot [datetime]){throw 'The authenticated core creation time could not be verified.'}
    return $process.CreationDate
}
try {
    $runtime='C:\ProgramData\Deskflow\Deskflow.conf'
    $text=[IO.File]::ReadAllText($runtime)
    $clientName=[regex]::Match($text,'(?m)^computerName=([^\r\n]+)').Groups[1].Value
    $isServer=$text -match '(?m)^coreMode=2\s*$'
    if($clientName -ne $env:COMPUTERNAME -or (!$isServer -and $text -notmatch '(?m)^coreMode=1\s*$') -or $text -notmatch '(?m)^tlsEnabled=true\s*$' -or $text -notmatch '(?m)^checkPeerFingerprints=true\s*$') { throw 'Secure local Deskflow settings are required.' }
    $sessionId=[Diagnostics.Process]::GetCurrentProcess().SessionId
    if('FastGuard' -as [type]){$owners=[FastGuard]::ReadOwners();$cores=@($owners.cores.ToArray());$service=$owners.service}
    else {$cores=@(Get-CimInstance Win32_Process -Filter "Name='deskflow-core.exe'");$service=Get-CimInstance Win32_Service -Filter "Name='Deskflow'"}
    if($cores.Count -ne 1 -or $cores[0].SessionId -ne $sessionId) { throw 'One client in the same interactive session is required.' }
    if($service.State -ne 'Running' -or $cores[0].ParentProcessId -ne $service.ProcessId -or $service.PathName -notmatch '(?i)^"?C:\\Program Files\\Deskflow\\deskflow-daemon\.exe"?$') { throw 'The core must belong to the existing protected Deskflow service.' }
    if($isServer) {
        $connections=@(Get-NetTCPConnection -LocalPort 24800 -State Established -ErrorAction SilentlyContinue | Where-Object {$_.OwningProcess -eq $cores[0].ProcessId})
        $connected=$connections.Count -eq 1
        $trusted=@([IO.File]::ReadAllLines('C:\ProgramData\Deskflow\tls\trusted-clients')|Where-Object {$_})
        if($trusted.Count -ne 1 -or $trusted[0] -cne 'v2:sha256:809fd9df72ba849505d4015fe3e8c4a57f69f01472aba9e5a748b35c57d4794a'){throw 'Server client trust must match the paired Mac certificate.'}
    }
    elseif('FastGuard' -as [type]){$connected=[FastGuard]::OwnsConnection($cores[0].ProcessId,2) -or [FastGuard]::OwnsConnection($cores[0].ProcessId,23)}
    else {
        $connections=@(Get-NetTCPConnection -RemotePort 24800 -State Established -ErrorAction SilentlyContinue | Where-Object {$_.OwningProcess -eq $cores[0].ProcessId})
        $connected=$connections.Count -gt 0
    }
    $hostName=[regex]::Match($text,'(?m)^remoteHost=([^\r\n]+)').Groups[1].Value
    $logFile=[regex]::Match($text,'(?m)^file=([^\r\n]+)').Groups[1].Value
    $stream=[IO.File]::Open($logFile,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
    try {
        $offset=[math]::Max(0,$stream.Length-65536);$null=$stream.Seek($offset,[IO.SeekOrigin]::Begin)
        $reader=[IO.StreamReader]::new($stream)
        try {$tail=$reader.ReadToEnd()} finally {$reader.Dispose()}
    } finally {$stream.Dispose()}
    if($isServer) {
        $start=Get-CoreStartTime $cores[0].ProcessId
        $tail=(@($tail -split '\r?\n'|Where-Object {$_ -match '^\[([^\]]+)\]' -and [datetime]::Parse($Matches[1]) -ge $start.AddSeconds(-1)}) -join "`n")
        if($tail -notmatch 'INFO: accepted secure socket'){$connected=$false}
        $tail=[regex]::Replace($tail,'(?m)^(\[[^\]]+\] )INFO: switch from "(?:DESKTOP-S9B3N7M|NotchDash-Mac)" to "(DESKTOP-S9B3N7M|NotchDash-Mac)" at -?\d+,-?\d+\r?$',{
            param($match)
            $match.Groups[1].Value+'INFO: '+$(if($match.Groups[2].Value -eq 'DESKTOP-S9B3N7M'){'entering computer'}else{'leaving computer'})
        })
        $tail=$tail.Replace('INFO: accepted secure socket','INFO: connected to secure socket')
    }
    $events=@($tail -split '\r?\n' | Where-Object {$_ -match '\] (INFO: (entering computer|leaving computer|connected to secure socket|started client|stopped client|server is dead)$|WARNING: failed to connect to server)' } | Select-Object -Last 60 | ForEach-Object {[string]::Format('{0}',$_)})
    if($connected){$events=@('INFO: connected to secure socket')+$events}
    [pscustomobject]@{connected=$connected;role=$(if($isServer){'server'}else{'client'});server=$hostName;clientName=$clientName;processId=$cores[0].ProcessId;sessionId=$sessionId;logFile=$logFile;events=($events -join "`n")} | ConvertTo-Json -Compress
} catch {
    [pscustomobject]@{connected=$false;sessionId=[Diagnostics.Process]::GetCurrentProcess().SessionId;logFile='C:/ProgramData/Deskflow/deskflow.log';events='';error=$_.Exception.Message} | ConvertTo-Json -Compress
}
