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
