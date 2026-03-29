# TimeTracker Runtime Layout

Recommended layout on the Mac after cleanup:

## App bundle

```bash
~/Applications/TimeTracker.app
```

This is the packaged app you open.

## Runtime config/data

```bash
~/Library/Application Support/TimeTracker/
```

Suggested contents:

```text
~/Library/Application Support/TimeTracker/
  .env
  timetracker.db
```

## Notes

- Keep secrets like `DATABASE_URL` in `.env` here, not inside the app bundle.
- If you move back to local SQLite mode later, this is the right place for the database file too.
- Optional local logs can be written here if `LOG_TO_FILE=1` is enabled.
- This folder should stay on the Mac even when you delete the temporary downloaded source tree.
- The app bundle can be replaced during updates without touching this runtime folder.
