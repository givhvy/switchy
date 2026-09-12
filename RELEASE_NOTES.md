Switchy 0.1.0: one-button monitor input switching.

## Available now

Download **Switchy-0.1.0-win-x64.exe** for Windows 10/11 x64.

Default shortcuts: **Ctrl+Alt+Shift+S** toggles the monitor; **Ctrl+Alt+Shift+W** requests Windows. Defaults match Windows on DisplayPort and Mac on HDMI 1; HDMI 2 is selectable.

## Mac download pending

The Apple silicon source and build script are included, but the Mac DMG/ZIP have not been built yet. GitHub Actions cannot start because the repository owner's account is locked due to a billing issue. The source ZIP is not an installable Mac app.

On your MacBook, clone this repository and run `bash scripts/build-mac.sh`. It builds the bundled m1ddc helper and creates an ad-hoc signed DMG and ZIP in `dist`. See the README for complete instructions and upload commands.

## Keyboard and mouse

Install Deskflow separately on Windows and Mac, with Windows as server. Switchy includes a setup guide. Automatic keyboard/mouse focus handoff is not implemented; changing monitor input and moving Deskflow focus are separate actions.

## Compatibility

Windows has no publisher signature and may show SmartScreen. The Mac build uses ad-hoc signing without Apple notarization and may require Privacy & Security > Open Anyway.

DDC support depends on the monitor, cable and port. Some monitors cannot switch back from an inactive input. Use Switchy on the displayed computer or the monitor's physical input button. Actual M5 HDMI switching and cross-computer keyboard/mouse sharing remain to be tested.

## Updated Windows build: KeyZinger input mapping

The Windows installer now includes **HDMI 1 (KeyZinger / code 16)** in Connection & shortcuts. Select and save this for the Mac on this ViewSonic desk; keep Windows at DisplayPort 1 (15). Standard HDMI 1 code 17 did not work on this setup. The user confirmed the corrected Windows app switches to the Mac and the Full HD picture works.

The Mac build remains pending. When building/installing it, also select Mac input 16 explicitly. The shared monitor's resolution is 1920 x 1080.

## Automatic audio after each switch

Switchy now restores the monitor's hardware volume to 80 and unmutes after each input change, retrying during reconnect. A real Windows-to-Mac-to-Windows test completed both audio restores and read back volume 80, unmuted. Mac-side implementation is included but not yet hardware-tested. If audio commands fail, the app reports that separately from the successful input switch.
