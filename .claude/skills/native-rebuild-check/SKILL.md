---
name: native-rebuild-check
description: Use immediately after `git pull`, `git switch`, `git merge`, `git stash pop`, or any other operation that can change tracked files in this weather-board repo. Checks whether native-relevant files (package.json, package-lock.json, ios/, android/) changed, and if so, rebuilds the native iOS app (pod install + expo run:ios). Prevents the recurring "KeyboardControllerNative.getConstants is not a function" / TurboModule native-binding crash caused by running new JS against a stale native binary.
---

# Native rebuild check (weather-board)

## Why this exists

This project uses React Native's New Architecture (Fabric/TurboModules). Native modules
(e.g. `react-native-keyboard-controller`, `react-native-screens`) bind to the compiled
native binary at build time. Metro (the JS bundler) hot-reloads JS instantly regardless
of whether the native binary is stale, so a version mismatch doesn't fail at build time —
it crashes at runtime with errors like:

```
[TypeError: _bindings.KeyboardControllerNative.getConstants is not a function (it is undefined)]
```

This has happened multiple times in this project after branch switches / merges / pulls
that changed native dependencies. This skill automates the diagnosis + fix instead of
re-deriving it from scratch each time.

## When to run this

Run this check right after any of these, without waiting to be asked:
- `git pull`
- `git switch` / `git checkout <branch>`
- `git merge`
- `git stash pop` / `git stash apply`
- `npm install` (if it changed native package versions)

## Steps

1. Determine what changed. If you just did a pull/merge, compare the previous HEAD to the
   new HEAD:
   ```bash
   git diff --stat <old-sha> <new-sha> -- package.json package-lock.json ios android
   ```
   If you just did a switch/stash-pop, compare working tree to the previous branch tip, or
   simply check `git status --short` for `package.json`/`package-lock.json`/`ios/`/`android/`.

2. If none of `package.json`, `package-lock.json`, `ios/`, `android/` changed: stop here,
   no rebuild needed. Say so briefly and move on.

3. If any of them changed, resync and rebuild:
   ```bash
   cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
   ```
   The `LANG`/`LC_ALL` env vars are required — CocoaPods hits a
   `Encoding::CompatibilityError: Unicode Normalization not appropriate for ASCII-8BIT`
   on this machine's Ruby setup without them.

4. Rebuild and reinstall the native app on **every simulator currently in active use**, not
   just whichever one `expo run:ios` defaults to. Check which simulators are booted first:
   ```bash
   xcrun simctl list devices booted
   ```
   As of this writing, two simulators are kept booted side by side for testing:
   iPhone 17 Pro and iPhone 12 mini (smaller screen — catches layout/clipping bugs the
   larger device doesn't, e.g. text overflow in tab labels). `expo run:ios` without
   `--device` only installs to its default target and silently leaves the other simulator
   on its old (stale) binary — this caused a repeat of the exact crash this skill exists to
   prevent. Rebuild each one explicitly (run in background, each takes a few minutes):
   ```bash
   cd /Users/ikebatakensuke/Developer/weather-board && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --device "<device name or udid>"
   ```
   Note: `npx expo run:ios` also calls `pod install` internally, so the same LANG vars must
   prefix this whole command too, not just step 3. `pod install` itself only needs to run
   once (it's not per-simulator) — the per-simulator step is the `expo run:ios` install.

5. Report back once each background build finishes (exit code 0 = success). If one fails,
   read the tail of that build log before proposing a fix — don't guess. Note which
   simulator(s) are now confirmed up to date so it's clear if any are still pending.

## Not in scope

- Android rebuilds (`android/`) aren't part of this project's established troubleshooting
  flow yet — if `android/` changes trigger a similar issue, extend this skill then rather
  than guessing at the fix now.
- Pure `.tsx`/`.ts`-only changes never need this — only native-relevant files do.
