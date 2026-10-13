# Follow Deskflow client focus on Windows

Switchy0.2.1 follows fresh INFO focus events from the existing Deskflow Windows client. The Mac runs server NotchDash-Mac; Windows runs client DESKTOP-S9B3N7M. Switchy does not forward keyboard/mouse input or create a Deskflow engine. The physically confirmed0.2.0 build is preserved as [OfficialVersion1](OFFICIAL_VERSION_1.md); the new latency change is documented in [NATIVE_LATENCY.md](NATIVE_LATENCY.md).

This desk enables `followDeskflowFocus`, preserves Windows input15/Mac16 and launches Switchy with `--background` from its single login Run entry. Mac input16 reads back18 on the calibrated ViewSonic. Control+Shift+K remains on the Mac server only.

The active path is `src/focus-log.js`: observe the protected Deskflow INFO log, start at EOF, parse only fresh named connection/focus events, and dispatch the newest direction through `src/focus-queue.js`. File notifications plus a500ms file-only fallback observe new bytes; there is no DDC polling. Old log history is not replayed. Disconnect, stale events, truncation and rotation invalidate pending work. Reconnection enables fresh focus again. Rapid alternating focus events coalesce for15ms; writes are serialized and superseded requests cancel audio retries. A single hidden helper keeps native code loaded and performs the full fresh guard immediately before SET. SET acknowledgment no longer waits for audio settling or restoration.

Before DDC, `native/deskflow-state.ps1` checks secure client settings, exactly one core in the same Windows session, its parent being the existing protected Deskflow service, an Established TCP connection, and the latest recorded focus matching the requested direction. Existing TLS/fingerprint enforcement stays in Deskflow. The guard does not require a fresh DNS lookup while an authenticated connection is open. Only named events and bounded results are retained; keyboard content is not collected.

The former enter/exit relay hooks are disabled in the shared Deskflow configuration. They initially failed with AccessDenied because the protected executable inherited EFS encryption. A plain replacement removed launch errors, but actual focus changes still produced no IPC request. The remaining child failure was not proven. The installed log observer bypasses that failed delivery path. No SYSTEM launch of Switchy, added service, task or network listener is needed. Legacy relay files are inactive.

Fixed CLI forwarding still accepts `Switchy.exe --deskflow-focus=windows|mac` without displaying the window. The same monitor guard applies. Ordinary monitor controls retain their existing shortcuts. On Mac, keep NotchDash's Windows-controls-monitor mode enabled to avoid competing Mac DDC writes.

## Verification on 12 October2026

-23 unit tests passed, including startup EOF, fresh/partial/stale log events, disconnect, truncation/rotation, latest focus, serialized writes and canceled audio.
-Hidden Electron fixture passed fresh log enter/leave through observer/guard/queue to simulated input15/16, CLI validation and absence of Control+Shift+K registration. These are simulated DDC tests.
-Locally built unsigned NSIS0.2.0 installed. Installed main/log/queue files match source. Publisher signing is not configured.
-Existing service restarted at01:28:16 +07; one client80460 supervised by daemon56996 connected to192.168.1.32:24800. TLS1.3 probe authenticated only with the exact paired Mac SHA256. Windows certificate file unchanged.
-Earlier standalone DDC writes: SET15 -> read15; SET16 -> read18 after3seconds. Existing audio helper restored volume80/unmute. These do not prove the log-driven handoff or the Mac picture.
-Single Switchy login entry retained; relaunched hidden. No new engine/service/task/port or firewall/security/hotkey change.
-Backups: C:/Users/ADMIN/AppData/Local/SwitchyDeskflowSetup/backup-focus-20261012-010705 and backup-observer-20261012-012816. No private key copied. Source changes are not committed/pushed.

User confirmed physical Control+Shift+K switched the shared monitor in both directions with this observer. Actual focus-to-DDC correlation: Mac01:31:04.034 -> guard01:31:06.754 -> input16 completed01:31:12.265; Windows01:31:13.309 -> guard01:31:15.639 -> input15 completed01:31:21.148; Mac01:31:38.620 -> guard01:31:41.533 -> input16 completed01:31:47.592. A read-only GET at01:32:09 returned input18/error0 on the ViewSonic. These are actual client-focus events, not replayed relay commands or simulated DDC.

Actual connection failures01:30:22–32 were followed by secure reconnect01:30:33.996, and the observer resumed. The cause of the interruption was not established. At01:32:38 there was still one connected client and one hidden Switchy primary. Full Windows reboot/login and a controlled Wi-Fi outage remain untested. Earlier relay-based physical tests failed; their pending status is superseded by this observer test.
