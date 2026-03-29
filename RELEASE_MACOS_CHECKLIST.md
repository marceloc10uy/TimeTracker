# macOS Release Checklist

Use this flow when you want the Mac to keep only the packaged app and not the full source tree.

## 1. Get the source onto the Mac

- Download or copy the latest project source to a temporary folder.
- Example:

```bash
~/Downloads/TimeTracker
```

## 2. Build the app

From the project root:

```bash
chmod +x build_macos_app.command cleanup_packaged_source.command
./build_macos_app.command
```

Expected output:

```bash
dist/TimeTracker.app
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

## 4. Keep only the packaged app

Run:

```bash
./cleanup_packaged_source.command
```

That will:

- copy `dist/TimeTracker.app` to `~/Applications/TimeTracker.app`
- create `~/Library/Application Support/TimeTracker`
- copy `.env` there if needed
- remove the temporary source tree after confirmation

## 5. Run the app

Open:

```bash
~/Applications/TimeTracker.app
```

## 6. Update later

When you need a new version:

1. Download/copy fresh source to the Mac again
2. Run `./build_macos_app.command`
3. Run `./cleanup_packaged_source.command`
4. Replace the old app bundle
