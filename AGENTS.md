# Switchy agent instructions

## Purpose and actual desk

Switchy switches one monitor between a Windows PC on DisplayPort and an Apple silicon M5 MacBook Pro on HDMI. The tested monitor is ViewSonic VX2479-HD-PRO. Default input codes are Windows 15, Mac 17; select 18 if the Mac cable uses HDMI 2. Do not assume which HDMI port is connected.

## Mac download, build, install, and release

Read `docs/MAC_AGENT_HANDOFF.md` first when helping on the Mac. Check actual GitHub release assets before saying a Mac download exists. At the Windows handoff, only the Windows installer was published; Mac source and the build script were ready, but compilation and hardware testing on Mac were pending. GitHub Actions was blocked by account billing, so the user agreed to build on their MacBook.

The intended result is an installed, running Mac app and real Mac DMG/ZIP downloads attached to the existing GitHub release. Continue the local Mac build when a binary is unavailable. Do not describe a source archive as an installable app, or claim Mac hardware verification from Windows tests.

## Development and testing

- `npm ci`, `npm test`, `npm start`.
- Windows package: `npm run dist:win`.
- Apple silicon package: `bash scripts/build-mac.sh`.
- `node test/ui.cjs` uses simulated monitor commands.
- `node test/hardware-smoke.cjs` is a real Windows-only DDC write/read check for Windows on DisplayPort. Do not run it as a generic Mac smoke test.
- Read `VALIDATION.md` for precise completed and pending checks.
- Preserve renderer sandboxing and the limited IPC bridge. Native control uses `native/monitor.ps1` on Windows and bundled m1ddc on Mac.

## User-facing behavior

Default toggle: Control+Alt+Shift+S (Control+Option+Shift+S on Mac). Direct Windows request: Control+Alt+Shift+W. Closing the window leaves it in the tray/menu bar. A successful native command is not visual confirmation of the other computer's picture.

Deskflow is a separate optional install: Windows server, Mac client. Switchy does not forward input events or automatically move Deskflow focus. Keep this limitation clear. Inactive monitor inputs may reject DDC commands; the monitor's physical input selector remains a recovery method.

## Updated input mapping from KeyZinger

For this user's desk, the working KeyZinger script sends Mac HDMI 1 = **16**, Windows DisplayPort = **15**. The earlier standard-code guidance (Mac 17) did not work. Configure Mac input as **HDMI 1 (KeyZinger / code 16)** on both apps. Preserve standard defaults for unrelated monitors; do not infer that code 16 universally means HDMI. Confirm the Mac picture with the user after switching.
