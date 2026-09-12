# Switchy

One monitor, a Windows PC on DisplayPort, and a MacBook on HDMI. Switch the monitor with one button or a global shortcut.

## Downloads

Get the Windows installer and Apple silicon macOS disk image from [Releases](https://github.com/givhvy/switchy/releases/latest).

| Computer | Download | Requirements |
| --- | --- | --- |
| Windows PC | `Switchy-0.1.0-win-x64.exe` | Windows 10/11 x64, DDC/CI monitor |
| MacBook M1 or newer | `Switchy-0.1.0-mac-arm64.dmg` | macOS 12+, compatible DDC/CI connection |

These initial builds are unsigned by a commercial publisher. Windows may show SmartScreen. The Mac build is ad-hoc signed, not Apple notarized; after copying Switchy to Applications, macOS may require Privacy & Security → Open Anyway. Only bypass a warning for a download you trust. No Intel Mac release is provided.

## Set up your desk

1. Enable **DDC/CI** in the monitor's physical menu.
2. Install Switchy on both computers.
3. Choose the shared monitor. Defaults are **DisplayPort 1 for Windows** and **HDMI 1 for Mac**. Choose HDMI 2 if that is the connected port.
4. On the Mac, check Monitor details and set the external display number or UUID if it is not `1`.
5. Press **Switch computer**, or **Ctrl+Alt+Shift+S**. On macOS, that is Control+Option+Shift+S. **Ctrl+Alt+Shift+W** explicitly requests Windows. You can choose shorter shortcuts in settings if other apps have not reserved them.

The window closes to the system tray/menu bar. Quit from its tray menu. Startup at login is optional. Settings and shortcuts are saved separately on each computer.

## Keyboard and mouse stay on Windows

Switchy controls the **monitor input**. It does not capture or forward keyboard or mouse events. For that, install [Deskflow](https://github.com/deskflow/deskflow/releases/latest) on both computers:

- Windows is the Deskflow **server**, because the keyboard and mouse are physically plugged into it. Mac is the **client**.
- Keep both computers awake on the same local network. Connect the client to the server and verify its TLS fingerprint. Allow the requested macOS Accessibility and Input Monitoring permissions.
- In Deskflow's server layout, place the Mac to the right of Windows. Move the pointer past the right edge after switching to Mac. Move left to return. The two logical screens occupy the same physical monitor, so you will only see one at a time.
- Monitor selection and Deskflow focus are separate actions in this version. Deskflow is not bundled, silently installed, or automatically configured. Its optional keyboard shortcuts can help switch input focus.
- Windows must remain running and awake while its keyboard and mouse are used on the Mac. The MacBook's own keyboard/trackpad and the monitor's physical input button remain available if the network connection fails.

## Hardware support and limits

Windows uses the native DXVA2 monitor API and VCP input-select code `0x60`. No third-party monitor driver is installed. Monitor handles are released after every operation, and helper processes have timeouts.

The Apple silicon release bundles [m1ddc](https://github.com/waydabber/m1ddc), built from pinned revision `04d949794102eb8df01ad3681afff6464a3eede2`, including its MIT license. m1ddc supports DDC over USB-C/DisplayPort and supported built-in HDMI ports. Actual support depends on the Mac, monitor, cable, and adapter. An M5 Mac cannot be hardware-tested by Windows CI.

- A successful write means the command was sent, not that a picture appeared on the other input.
- Some monitors stop accepting DDC from an inactive input. Switch back from the currently displayed computer, or use the monitor button. A Windows shortcut cannot always reclaim a monitor showing Mac.
- macOS m1ddc does not expose input readback: toggle on Mac requests Windows. Direct computer buttons are available on both platforms. Windows reads the current input before toggling, falling back to the last successful request if input readback fails.
- Docks, converters and some HDMI paths can block DDC. Direct connections are preferable.
- Some monitors use proprietary input codes, which this initial UI does not configure.

## Development

Requires Node.js 22 and npm. Run `npm ci`, `npm test`, then `npm start`.

- `npm run dist:win` builds the Windows installer on Windows.
- On an Apple silicon Mac, build m1ddc and place the executable and its license at `native/m1ddc` and `native/m1ddc-LICENSE`, then run `npm run dist:mac`.
- The GitHub Actions workflow builds on Windows and macOS hosts. A `v*` tag publishes both downloads after both builds succeed, with SHA-256 checksums.

The renderer is sandboxed with context isolation, no Node access, a restrictive CSP, and a small IPC bridge. It cannot execute arbitrary commands or open arbitrary URLs. No network listener, analytics, or credential storage is included.

## Validation

See [VALIDATION.md](VALIDATION.md) for the exact checks completed and the remaining hardware checks.
