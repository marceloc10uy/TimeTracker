# 🚀 QUICK START - Supabase Setup

## TL;DR - 3 Steps to Get Started

### 1️⃣ Get Your Supabase Connection String
- Go to https://app.supabase.com/ → Your Project
- Settings → Database → Connection String
- Copy it (it looks like: `postgresql://postgres:password@host.supabase.co:5432/postgres`)

### 2️⃣ Create `.env` File in Project Root
Create a file called `.env` (same folder as `backend/` and `frontend/`):

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.supabase.co:5432/postgres
```

### 3️⃣ Install & Verify

```bash
# Install PostgreSQL driver and verification tool
pip install psycopg2-binary tabulate python-dotenv

# Run verification to compare local DB with Supabase
python verify_migration.py
```

---

## What I've Done For You

| File | Change |
|------|--------|
| `backend/db.py` | ✅ Updated to support both SQLite and PostgreSQL |
| `verify_migration.py` | ✅ Created - compares data between databases |
| `.env.example` | ✅ Created - template for configuration |
| `setup_supabase.py` | ✅ Created - interactive setup wizard |
| `SUPABASE_MIGRATION.md` | ✅ Created - detailed documentation |
| `.gitignore` | ✅ Updated - protects `.env` file |

---

## How It Works

- **If `DATABASE_URL` is set**: Uses PostgreSQL (Supabase)
- **No code changes needed** in routers, services, or frontend
- **Everything works the same** - seamless switch!

---

## Verify Your Migration

Run this to check all data is in Supabase:

```bash
python verify_migration.py
```

It will:
- ✓ Read all tables from local SQLite
- ✓ Read all tables from Supabase PostgreSQL
- ✓ Compare row-by-row and report any mismatches
- ✓ Show detailed summary

---

## Start Your App

```bash
# With Supabase (if DATABASE_URL is set)
python -m uvicorn backend.main:app --reload

# With local SQLite (if DATABASE_URL not set)
python -m uvicorn backend.main:app --reload
```

---

## Automated Setup (Optional)

Run the interactive setup wizard:

```bash
python setup_supabase.py
```

It will:
1. Create `.env` file with your connection string
2. Install required packages
3. Run verification

---

## More Help

See `SUPABASE_MIGRATION.md` for:
- Detailed step-by-step instructions
- Troubleshooting
- Environment variables
- Database management

---

## Current Status

✅ Code is ready for Supabase
⏳ Waiting for you to add `.env` file with connection string
⏳ Then run `python verify_migration.py` to check data
