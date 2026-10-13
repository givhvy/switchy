$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $PSScriptRoot '..\native\SwitchyNative.dll')
foreach($family in @(2,23)) {
    $stride=if($family -eq 2){24}else{56};$size=4+$stride
    $memory=[Runtime.InteropServices.Marshal]::AllocHGlobal($size)
    try {
        $zero=New-Object byte[] $size;[Runtime.InteropServices.Marshal]::Copy($zero,0,$memory,$size)
        [Runtime.InteropServices.Marshal]::WriteInt32($memory,0,1)
        $stateOffset=4+$(if($family -eq 2){0}else{48});$pidOffset=4+$(if($family -eq 2){20}else{52});$portOffset=4+$(if($family -eq 2){16}else{44})
        [Runtime.InteropServices.Marshal]::WriteInt32($memory,$stateOffset,5)
        [Runtime.InteropServices.Marshal]::WriteInt32($memory,$pidOffset,123)
        [Runtime.InteropServices.Marshal]::WriteInt32($memory,$portOffset,0xE060)
        if(![FastGuard]::ContainsConnection($memory,$size,123,$family)){throw 'Owned established TCP24800 should match.'}
        if([FastGuard]::ContainsConnection($memory,$size,9,$family)){throw 'Other process connection accepted.'}
        [Runtime.InteropServices.Marshal]::WriteInt32($memory,$stateOffset,2)
        if([FastGuard]::ContainsConnection($memory,$size,123,$family)){throw 'Listener accepted as client connection.'}
        [Runtime.InteropServices.Marshal]::WriteInt32($memory,$stateOffset,5)
        [Runtime.InteropServices.Marshal]::WriteInt32($memory,$portOffset,0xE160)
        if([FastGuard]::ContainsConnection($memory,$size,123,$family)){throw 'Wrong port accepted.'}
        $rejected=$false;try{$null=[FastGuard]::ContainsConnection($memory,4,123,$family)}catch{$rejected=$true}
        if(!$rejected){throw 'Truncated TCP table accepted.'}
    }finally{[Runtime.InteropServices.Marshal]::FreeHGlobal($memory)}
}
'PASS: native IPv4/IPv6 layouts, byte order, PID/state/port checks and malformed-table rejection; memory fixtures only.'
