# Windows focus latency, Switchy0.2.1

The confirmed0.2.0 observer checkpoint is preserved as OfficialVersion1 before optimization. Old logs at01:31:13.309 showed guard completion15.639 and write completion21.148. That last phase included input SET,1.5second audio settling, a second PowerShell launch and audio verification. The old logs did not identify the instant the actual input SET finished, so they do not establish a7.8second panel-switch time.

The0.2.1 Windows path uses one hidden user-session PowerShell child owned by Switchy. It loads the bundled SwitchyNative.dll once and accepts bounded JSON requests over private inherited stdin/stdout pipes. No new Deskflow engine, service, task, network listener or privileges are added. Windows packaging compiles the DLL with the system.NET Framework compiler through predist:win. Installed DLL/host/guard and ASAR sources were compared byte-for-byte to the build source.

Each guarded focus command reads the secure shared config and current named log events, obtains a fresh process snapshot (one core, correct session and parent), queries the existing service status/PID and protected executable path, and checks an Established TCP24800 connection owned by that core. No cached ownership/TLS/focus result or fresh mDNS lookup is used. The full guard runs inside the same helper immediately before DDC. Monitor enumeration selects the configured physical monitor for every SET; no DDC capabilities/input GET or fixed delay precedes the direct focus SET.

Readonly APIs follow Microsoft's documented [SystemProcessInformation fields](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntquerysysteminformation), [service status query](https://learn.microsoft.com/en-us/windows/win32/api/winsvc/nf-winsvc-queryservicestatusex) and [TCP endpoint table](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedtcptable). Process buffers are bounded/validated; reserved fields are not interpreted. Failures reject the guard. This avoids opening protected SYSTEM process handles or changing their ACLs.

Requests coalesce for15ms instead of200ms. SET acknowledgment clears the app's busy state and records input-sent separately from audio-complete. Audio settling/retries are asynchronous and canceled when a newer focus/settings/disconnect arrives. Individual volume/unmute/readback commands use the same serialized helper at lower priority, with cancellation between calls. A newer input can wait for a currently executing driver call to finish, but never for the1.5/2/3second audio settling timers. Volume80 and unmute verification remain enabled.

## Measurements and limits

-Baseline read-only guard on this PC:1015–1911ms.
-Installed0.2.1 read-only guard, same connected client:41–46ms warm;386ms cold helper startup. Cold startup occurs when the helper starts, not for each hotkey.
-27 unit tests passed, plus native owner/security tests, IPv4/IPv6 TCP memory fixtures and the legacy guard regression.
-Hidden Electron fixture: fresh log to simulated input32ms; new input completed while previous audio was deliberately held pending. This is not a hardware panel latency measurement.
-One running hidden Switchy70792 owns one native helper95652; existing Deskflow CLIENT80460 and Automatic service were preserved. The installed app uses fast-host.ps1, not a new PowerShell launch for each focus SET.

Runtime was installed and frozen for the coordinated physical test. New input-sent logs contain native guard time, SET call time, SET start/ack timestamps and total command time. No synthetic focus or independent physical SET was used for this optimization. Actual0.2.1 hotkey/DDC/picture latency still needs the next user test; monitor firmware signal reacquisition can impose its own delay. Full reboot/login remains untested. No new GitHub release was published.
