# Mac agent handoff

Goal: download or build Switchy on the user's M5 MacBook, install and launch it, test the shared monitor, and publish the Mac downloads alongside Windows.

Repository: https://github.com/givhvy/switchy
Release: https://github.com/givhvy/switchy/releases/tag/v0.1.0

## 1. Inspect available downloads

If GitHub CLI is available:

```bash
gh release view v0.1.0 --repo givhvy/switchy --json assets,url
```

Otherwise open the release URL. Look for `Switchy-0.1.0-mac-arm64.dmg` or `Switchy-0.1.0-mac-arm64.zip`. At this handoff those files did not yet exist. Do not assume that remains true; another agent may have uploaded them.

If available, download the DMG and its matching checksum file from that release into a dedicated Downloads folder. With GitHub CLI:

```bash
mkdir -p "$HOME/Downloads/Switchy"
gh release download v0.1.0 --repo givhvy/switchy --pattern 'Switchy-0.1.0-mac-arm64.dmg' --dir "$HOME/Downloads/Switchy"
```

Check the published SHA-256 against `shasum -a 256` for the downloaded file. Open the DMG and copy Switchy.app into Applications, then launch it. If an installed Switchy already exists, check its version before replacing it. Do not globally disable Gatekeeper or remove quarantine recursively. These builds are not notarized; the user may need to approve this specific app in System Settings > Privacy & Security > Open Anyway.

## 2. If no Mac binary exists, build locally

Run on an Apple silicon Mac in a normal native Terminal (not an Intel/Rosetta shell). Confirm `uname -s` is Darwin and `uname -m` is arm64.

If this repository is not already checked out:

```bash
git clone https://github.com/givhvy/switchy.git
cd switchy
```

If already checked out, reuse it. Inspect local changes and preserve them; do not reclone over them or reset the repository.

Run:

```bash
bash scripts/build-mac.sh
```

If Apple Command Line Tools are missing, run `xcode-select --install`. The user completes Apple's installer, then rerun the build. Do not claim installation is complete while the system dialog is still pending.

The script checks compiler tools, downloads a project-local Node.js 22 runtime if needed and verifies its checksum, compiles the pinned m1ddc revision, includes its license, installs npm dependencies, runs unit tests, builds DMG/ZIP, verifies ad-hoc signatures, and opens the output folder. It does not install globally or require Homebrew.

Expected output:

- `dist/Switchy-0.1.0-mac-arm64.dmg`
- `dist/Switchy-0.1.0-mac-arm64.zip`
- `dist/SHA256SUMS-mac.txt`

If compilation or signing fails, inspect and fix the actual error. Do not publish a failed or unverified archive. Mac compilation had not been tested at this handoff. GitHub Actions was blocked by an account billing lock; do not keep rerunning it without checking that the lock is resolved.

## 3. Install, launch, and validate

Open the built DMG, copy Switchy to Applications and launch it. Confirm the bundled helper exists at `Switchy.app/Contents/Resources/native/m1ddc`; the user should not need a separate helper install.

Check the app's Monitor details. Select the external ViewSonic display by number or UUID; never assume the MacBook's built-in screen is the intended target. Configure Windows = DisplayPort 1 (15), Mac = HDMI 1 (17), or HDMI 2 (18) according to the physical cable. DDC/CI must be enabled on the monitor.

Test the app and shortcut registration before changing inputs. Coordinate the physical switch test with the user so they can confirm the displayed computer and recover using the monitor button. Verify both directions if hardware permits. The Mac toggle requests Windows because m1ddc does not provide input readback; the two direct buttons explicitly choose the destination.

Record actual evidence separately for: package/signature verification, app launch, monitor discovery, HDMI input switching, return to DisplayPort, and keyboard shortcuts. Never infer success from the existence of a package alone.

## 4. Finish both-platform downloads

The user requested GitHub hosting and Windows/Mac downloads. Once the Mac build passes, upload the DMG, ZIP and checksum to the existing release using the user's authenticated GitHub account:

```bash
gh release upload v0.1.0 dist/Switchy-0.1.0-mac-arm64.dmg dist/Switchy-0.1.0-mac-arm64.zip dist/SHA256SUMS-mac.txt --repo givhvy/switchy
```

Inspect existing assets first. If replacing a known earlier build is intended, add `--clobber`; do not replace unrelated assets. Preserve the Windows installer and checksum. Update README.md, RELEASE_NOTES.md, VALIDATION.md and the release description to reflect what is now verified. Commit/push the updates and verify both download URLs before reporting completion.

If GitHub authentication is unavailable on Mac, leave the finished artifacts in `dist` and give their exact locations; do not claim they were uploaded.

## 5. Optional keyboard/mouse sharing

The physical keyboard and mouse remain on Windows. Deskflow must be installed separately on both computers, with Windows as server and Mac as client. Confirm network pairing and fingerprint, and guide the user through macOS permissions. Monitor input selection and Deskflow focus are separate in this version. Do not claim automatic handoff or a built-in forwarding engine.
