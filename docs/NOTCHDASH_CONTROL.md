# NotchDash local control

Switchy 0.3.0 adds a local named-pipe endpoint for the paired NotchDash controller. It builds on the installed, physically verified 0.2.2 focus recovery and asynchronous volume restoration implementation.

`%APPDATA%/switchy/control.json` contains an ephemeral endpoint and credential. It is local application data, not a pairing artifact: never upload or send it to the Mac. A new launch replaces the credential. The pipe accepts one bounded authenticated JSON request per connection:

- `state`: monitor mapping, independently observed Deskflow focus, role and connectivity; last acknowledged monitor target or startup DDC readback. For this calibrated mapping, SET 16/readback 18 is Mac, 15 is Windows.
- `policy`, boolean `follow`: save the focus-follow policy without changing input mapping, login behavior or shortcuts.
- `display`, explicit `target=mac|windows`: send the existing monitor/audio path independently of input focus. Optional `requireFocus=true` invokes the final native Deskflow focus guard. It never accepts a path, arbitrary input code, executable, shell command or remote hostname.

NotchDash owns cross-device policy transactions and the Screen only Ctrl+Shift+K shortcut. Switchy keeps its existing shortcuts; it does not register Ctrl+Shift+K or become an input engine. Together retains the native guard and the log-truncation/reconnect recovery introduced in 0.2.2. Server mode accepts only the existing protected Deskflow service/core and the previously paired Mac fingerprint, with an owned established server connection and TLS acceptance evidence. Unrecognized screen names do not produce focus events.

Tests cover local authentication, refusing implicit toggle at the pipe, explicit display/policy dispatch and paired server focus event normalization, in addition to 0.2.2 regression tests. Neither a successful DDC command nor a test fixture proves the other computer's visible image. Server-role physical tests and installation are pending coordinated review with the matching NotchDash build. No GitHub release is created here.
