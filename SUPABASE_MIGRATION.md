# TimeTracker - Supabase Migration Guide

## Step 1: Get Your Supabase Connection String

1. Go to [Supabase Console](https://app.supabase.com/)
2. Select your project
3. Go to **Settings → Database**
4. Copy the **Connection String** (it should start with `postgresql://`)
5. Make sure you're using the "Connection pooling" option for connection string format

## Step 2: Set Up Environment Variable

Create a `.env` file in the project root (same directory as `backend/` and `frontend/`):

```bash
# .env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
```

Replace the bracketed values with your Supabase credentials from Step 1.

**⚠️ WARNING**: Never commit `.env` to git. It's already in `.gitignore` but verify it's there:
```bash
# .gitignore should contain:
*.pyc
.env
.env.local
```

## Step 3: Install Required Dependencies

The app needs additional Python packages to work with PostgreSQL:

```bash
pip install psycopg2-binary
pip install python-dotenv  # for loading .env files
pip install tabulate  # for the verification script
```

Or if you have a requirements.txt:
```bash
pip install -r requirements.txt
```

## Step 4: Update Your Application (Already Done!)

The `backend/db.py` has been updated to:
- Check for `DATABASE_URL` environment variable
- If set, use PostgreSQL (for Supabase)
- If not set, fall back to local SQLite

**No changes needed in other files** - the app works seamlessly with both databases!

## Step 5: Verify the Migration

Run the verification script to compare data between local SQLite and Supabase:

```bash
python verify_migration.py
```

This will:
- Read all data from your local `timetracker.db` SQLite database
- Read all data from your Supabase PostgreSQL database
- Compare both databases table by table
- Report any mismatches or missing data

### Example output:
```
🔍 Starting database migration verification...

SQLite DB: c:\Users\marce\Documents\TimeTracker\TimeTracker\timetracker.db
Postgres DB: host.supabase.co

📖 Reading from SQLite...
📖 Reading from PostgreSQL...

================================================================================
TABLE: WORK_DAY
================================================================================
SQLite rows: 30
Postgres rows: 30
✅ work_day matches perfectly!

... (more table comparisons)

✅ MIGRATION VERIFICATION PASSED - All data matches!
```

## Step 6: Run Your Application

When `DATABASE_URL` is set in your environment, the app will use Supabase:

```bash
# On Windows PowerShell
$env:DATABASE_URL = "postgresql://..."
python -m uvicorn backend.main:app --reload

# Or on Linux/Mac
export DATABASE_URL="postgresql://..."
python -m uvicorn backend.main:app --reload
```

## Step 7: (Optional) Switch Back to Local Database

If you need to use the local SQLite database again, just unset the `DATABASE_URL`:

```bash
# PowerShell
Remove-Item env:DATABASE_URL

# Linux/Mac
unset DATABASE_URL
```

## Troubleshooting

### "psycopg2 is not installed"
```bash
pip install psycopg2-binary
```

### "ERROR: Could not connect to PostgreSQL"
- Check that `DATABASE_URL` is set correctly
- Verify the connection string format: `postgresql://user:password@host:port/database`
- Make sure Supabase firewall allows your IP

### "ERROR: DATABASE_URL environment variable not set"
Create a `.env` file in the project root with your connection string (see Step 2)

### Data mismatches in verification script
- Ensure your data was properly imported to Supabase
- Check that no new records were created in the local database after import
- Review the detailed output to identify which rows differ

## Quick Reference

| Task | Command |
|------|---------|
| Set Supabase DB (PowerShell) | `$env:DATABASE_URL = "postgresql://..."` |
| Set Supabase DB (Linux/Mac) | `export DATABASE_URL="postgresql://..."` |
| Run verification | `python verify_migration.py` |
| Use local SQLite | Unset or remove `DATABASE_URL` |
| Install dependencies | `pip install psycopg2-binary tabulate` |

## What Changed

- ✅ **`backend/db.py`** - Now supports both SQLite and PostgreSQL
- ✅ **`verify_migration.py`** - New script to verify data migration
- ✅ **`.env.example`** - Template for environment variables
- ✅ **No changes to routers, services, or frontend** - Everything works as before!

## Next Steps

1. ✅ Update database configuration (Done - see Step 2)
2. ✅ Install PostgreSQL driver (Do - see Step 3)  
3. ✅ Run verification script (Do - see Step 5)
4. ✅ Start using Supabase (Do - see Step 6)
