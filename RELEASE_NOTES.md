Switchy 0.1.0: monitor input switching for Windows PCs and Apple silicon MacBooks.

- One switch button, direct Windows/Mac buttons, system tray/menu bar, configurable global shortcuts, and optional startup at login.
- Default wiring: Windows DisplayPort 1, Mac HDMI 1. HDMI 2 is selectable.
- Windows native DDC/CI control. Apple silicon Mac build includes the m1ddc helper.
- Built-in setup guide for optional keyboard/mouse sharing through Deskflow. Deskflow is installed and configured separately; automatic keyboard-focus handoff is not implemented.

Download the `.exe` for Windows x64 or `.dmg` for Apple silicon macOS. The `.zip` is an alternative Mac package. See SHA256SUMS.txt to verify downloads.

Initial builds do not have Windows publisher signing or Apple notarization. Windows may show SmartScreen; macOS may require Privacy & Security → Open Anyway. The Mac package uses ad-hoc signing.

DDC support depends on the monitor, cable and port. Some monitors cannot switch back from an inactive input. Use Switchy on the displayed computer or the monitor's physical input button in that case. M5 HDMI switching and keyboard/mouse sharing require a test on the actual Mac.
