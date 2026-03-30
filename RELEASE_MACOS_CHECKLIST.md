# macOS Release Checklist

Use this flow when you want the Mac to keep only the packaged app and not the full source tree.

## 1. Get the source onto the Mac

- Download or copy the latest project source to a temporary folder.
- Example:

```bash
~/Downloads/TimeTracker
```

## 2. Build the installer

From the project root:

```bash
chmod +x build_macos_pkg.command
./build_macos_pkg.command
```

Expected output:

```bash
dist/TimeTracker.pkg
```

## 3. Verify config/data

- Make sure runtime config will live in:

```bash
~/Library/Application Support/TimeTracker
```

- If you use PostgreSQL/Supabase, ensure this exists:

```bash
~/Library/Application Support/TimeTracker/.env
```

## 4. Install the packaged app

Open:

```bash
dist/TimeTracker.pkg
```

That installer will place the app at:

```bash
/Applications/TimeTracker.app
```

## 5. Verify runtime config

After install, the runtime folder should exist here:

```bash
~/Library/Application Support/TimeTracker/
```

The installer also places a starter file here on first install:

```bash
~/Library/Application Support/TimeTracker/.env.example
```

Create your real runtime config here:

```bash
~/Library/Application Support/TimeTracker/.env
```

## 6. Run the app

Open:

```bash
/Applications/TimeTracker.app
```

## 7. Remove temporary source if desired

If you copied the source onto a Mac only for packaging, you can still use:

```bash
./cleanup_packaged_source.command
```

That script copies the raw `.app` into `~/Applications`, so with the new `.pkg` flow it is mainly useful for cleaning up the temporary source tree after you have installed the packaged app manually.

## 8. Update later

When you need a new version:

1. Download/copy fresh source to the Mac again
2. Run `./build_macos_pkg.command`
3. Open the new `dist/TimeTracker.pkg`
4. Replace the old installed app
