# Validation, 12 September 2026

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
