# Validation, 12 September 2026

## Windows focus-follow update, 12 October 2026

Switchy0.2.0:20 unit tests and the hidden Electron focus fixture passed. The installed app accepts validated single-instance focus forwarding. The protected relay, private user spool and official Deskflow client hooks are configured on this PC; one TLS client remains. Real DDC SET15/read15 and SET16/read18 passed, with the final source restored to Mac. See `docs/DESKFLOW_FOCUS.md` for the account/ACL boundaries, exact completed checks and remaining physical/reboot checks. Publisher signing remains unconfigured; no physical hotkey PASS is claimed.

## Completed

- PASS: seven Node tests cover input selection, unsafe settings, duplicate shortcuts, and redirected Windows profile persistence.
- PASS: automated Electron UI checks cover toggle and both direct buttons, invalid/valid settings, registered global shortcuts, monitor errors, missing monitors, refresh, external link dispatch, keyboard activation and a 420px window. No renderer JavaScript errors were observed.
- PASS: Windows installer built with electron-builder. Packaged `Switchy.exe` launched and read the actual monitor using its bundled PowerShell helper.
- PASS: actual hardware identified as ViewSonic VX2479-HD-PRO; current input 15 (DisplayPort); capabilities advertise 15, 17 and 18 (DP, HDMI 1, HDMI 2).
- PASS: actual Windows input command was accepted. Readback returned 15 after settling. An immediate read after the command was temporarily unavailable, so the hardware test permits bounded retries.
- PASS: Mac build shell script passes Bash syntax checking. Mac helper source is pinned; workflow explicitly targets arm64.

## UI design checks

- PASS: warm-neutral direction was approved by the user; visual decisions and ENERGY 2 / RHYTHM 1 / MOTION 1 are documented in DESIGN.md.
- PASS: the one-button selector is the focal point; setup/help use disclosures. No decorative gradients, fake metrics or testimonials.
- PASS: real screenshot in docs/switchy-windows.png; status distinguishes a command sent from a visually confirmed input switch.
- PASS: controls have real handlers; text uses ink/olive on ivory with visible keyboard focus. The automated narrow-window check found no horizontal overflow.

## Not yet verified

- Actual change to the Mac HDMI input and back. The real write check deliberately kept the Windows input selected.
- Mac compilation, packaging, signature verification, app launch and M5 HDMI DDC behavior. GitHub Actions is blocked by the owner's account billing lock. User will run scripts/build-mac.sh on their MacBook.
- Deskflow pairing and keyboard/mouse forwarding. Switchy provides a guide, not an integrated forwarding engine or automatic focus handoff.
- Installer wizard completion, Windows publisher signing, Apple notarization, and login-start behavior after an OS restart.

The Windows download is available; the Mac binary is pending the local Mac build. Source ZIPs are not Mac installers.

## User-confirmed hardware result

The user confirmed that switching to the Mac works with Mac input code 16 (matching KeyZinger), and subsequently confirmed the Mac picture works correctly on the Full HD monitor. This supersedes the earlier pending Windows-to-Mac picture check. Windows remains code 15. The updated suite has eight passing tests, including code-16 selection; a simulated UI test verifies Mac sends 16 and toggle returns 15.

This confirms the Windows app controlling the shared monitor, not installation or execution of the Mac app. The Mac binary build and Mac-side DDC control are still pending. Configure ViewSonic at 1920 x 1080 in macOS Displays if needed.

## Audio restoration verification

Twelve unit tests passed including restore ordering, retry on disconnect, bounded failure, and no audio write after a failed input switch. Actual hardware test through the new switchWithAudio path: Mac code 16 returned audioRestored true, Windows code 15 returned audioRestored true; final readback input 15, volume 80, mute 2 (unmuted). The UI regression runner stalled at Electron startup on this run; no UI pass is claimed for this update. Mac audio restoration is implemented but not hardware-tested.

## Windows startup and Deskflow focus observer, 12 October2026

Deskflow1.27.0 remains the existing Automatic service with one CLIENT engine, shared C:/ProgramData/Deskflow/Deskflow.conf and configured MacBook-Pro-cua-Huy-2.local:24800. Service restart connected to192.168.1.32; strict TLS1.3 probe matched the previously paired Mac SHA256. Windows certificate file, TLS/fingerprint checks, firewall scope and shortcuts were preserved. There is no Windows server listener24800. Service recovery remains restart after1second, reset86400seconds.

Switchy0.2.0 was locally built and silently installed, with one hidden primary process and one existing login Run entry. Windows15/Mac16 remain calibrated. The new active monitor-follow path observes fresh INFO focus events from the existing client log, starts at EOF and verifies secure service-owned client/TCP/latest-focus state before DDC. Old relay hooks are disabled: earlier physical focus tests delivered keyboard/mouse focus but no monitor request, including after resolving EFS launch AccessDenied. The remaining relay child failure was not established; the log observer bypasses it.

23 unit tests and the hidden Electron integration fixture passed, including the new log observer to guard/queue and simulated input15/16. Installed main/log/queue files match source. Actual earlier standalone SET15/read15 and SET16/read18 plus volume80/unmute passed; those do not establish the new physical hotkey handoff.

Observer configuration backup: C:/Users/ADMIN/AppData/Local/SwitchyDeskflowSetup/backup-observer-20261012-012816. Earlier full app/settings/config backup: backup-focus-20261012-010705. No private key copied. Sources have not been committed/pushed; publisher signing is not configured.

## Physical observer handoff confirmed, 12 October2026

User confirmation: Control+Shift+K changed the actual shared monitor in both directions with the installed observer build. This supersedes the earlier pending physical handoff. It does not establish a full Windows reboot/login.

Automated evidence, local time +07:00:

| Fresh Deskflow focus | Switchy guard | Actual native command completion |
| --- | --- | --- |
| Mac01:31:04.034 | allowed01:31:06.754 | input16 completed01:31:12.265 |
| Windows01:31:13.309 | allowed01:31:15.639 | input15 completed01:31:21.148 |
| Mac01:31:38.620 | allowed01:31:41.533 | input16 completed01:31:47.592 |

The observer recorded the same fresh core events. Intermediate Windows guards were false while focus alternated rapidly and returned to Mac; the log does not provide a detailed rejection reason. No write was recorded for those refused requests. Read-only GET after settling at01:32:09 returned the calibrated ViewSonic input18, error0. No independent SET/focus change was performed during this read-only verification.

The core naturally logged connection failures01:30:22–32 then connected to secure socket01:30:33.996; the observer invalidated pending work and resumed on the new connection. This proves actual retry/reconnect in that episode, without identifying its cause or simulating a Wi-Fi outage. At01:32:38 one client80460 remained connected to192.168.1.32:24800, service Automatic, one hidden Switchy primary16344 and one login Run entry, no Windows listener24800. Existing TLS/fingerprint checks remain enabled. Full reboot/login and a controlled Wi-Fi outage are untested.

## OfficialVersion1 checkpoint and0.2.1 latency candidate

Before edits, the entire physically confirmed0.2.0 app, installer, source and nonsecret settings/config were saved and hashes verified at C:/Users/ADMIN/AppData/Local/SwitchyDeskflowSetup/OfficialVersion1-20261012-014028. See docs/OFFICIAL_VERSION_1.md. No private key copied or GitHub release published.

0.2.1 removes per-focus PowerShell startup and native compilation, performs the fresh process/service/TCP/config/log guard inside one persistent user helper immediately before SET, reduces coalescing200ms to15ms and releases the queue at SET acknowledgment. Volume80/unmute continues asynchronously with old audio canceled and lower priority serialized driver calls. No security/ownership result is cached or disabled, and no key mapping was changed.

27 unit tests, hidden Electron integration, fast owner/security rejection fixtures, native IPv4/IPv6 PID/state/port memory fixtures and legacy guard tests passed. In the Electron fixture, log-to-simulated-input was32ms while old audio remained pending. This is not real monitor latency. Read-only guard profiles on the actual client: old1015–1911ms; installed0.2.1 warm41–46ms, cold helper386ms. Installed code/DLL/host hashes match source. New logs separate native guard, actual SET call/ack and audio completion.

Installed0.2.1 runs hidden as primary70792 with its one native helper95652. Deskflow was not restarted: one CLIENT80460, Automatic service, live TCP to192.168.1.32:24800, one existing Switchy login entry and no Windows listener24800. Configuration/input15/16/certificates/paired trust/firewall/hotkeys were preserved. Runtime is frozen awaiting the coordinated physical0.2.1 test. No synthetic focus or independent physical SET was used in this optimization. Actual new hotkey/port/picture latency and full reboot/login are pending; panel firmware may add signal reacquisition delay.
