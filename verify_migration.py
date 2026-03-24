#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Migration Verification Script
Compares data between local SQLite database and Supabase PostgreSQL database
"""

import os
import sqlite3
import sys
from pathlib import Path
from tabulate import tabulate
from dotenv import load_dotenv
import warnings

warnings.filterwarnings("ignore")
# Fix encoding for Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 is not installed. Install it with: pip install psycopg2-binary")
    sys.exit(1)

try:
    from tabulate import tabulate
except ImportError:
    print("ERROR: tabulate is not installed. Install it with: pip install tabulate")
    sys.exit(1)


def get_sqlite_data(db_path):
    """Read all data from SQLite database"""
    if not Path(db_path).exists():
        print(f"ERROR: SQLite database not found at {db_path}")
        return None
    
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    
    data = {}
    
    # Get work_day data
    cur.execute("SELECT * FROM work_day ORDER BY date")
    data['work_day'] = [dict(row) for row in cur.fetchall()]
    
    # Get settings data
    cur.execute("SELECT * FROM settings ORDER BY key")
    data['settings'] = [dict(row) for row in cur.fetchall()]
    
    # Get recurring_holiday data
    cur.execute("SELECT * FROM recurring_holiday ORDER BY date")
    data['recurring_holiday'] = [dict(row) for row in cur.fetchall()]
    
    # Get time_off data
    cur.execute("SELECT * FROM time_off ORDER BY id")
    data['time_off'] = [dict(row) for row in cur.fetchall()]
    
    con.close()
    return data


def get_postgres_data(database_url):
    """Read all data from PostgreSQL database"""
    try:
        con = psycopg2.connect(database_url)
        cur = con.cursor()
        
        data = {}
        
        # Get work_day data
        cur.execute("SELECT * FROM work_day ORDER BY date")
        columns = [desc[0] for desc in cur.description]
        data['work_day'] = [dict(zip(columns, row)) for row in cur.fetchall()]
        
        # Get settings data
        cur.execute("SELECT * FROM settings ORDER BY key")
        columns = [desc[0] for desc in cur.description]
        data['settings'] = [dict(zip(columns, row)) for row in cur.fetchall()]
        
        # Get recurring_holiday data
        cur.execute("SELECT * FROM recurring_holiday ORDER BY date")
        columns = [desc[0] for desc in cur.description]
        data['recurring_holiday'] = [dict(zip(columns, row)) for row in cur.fetchall()]
        
        # Get time_off data
        cur.execute("SELECT * FROM time_off ORDER BY id")
        columns = [desc[0] for desc in cur.description]
        data['time_off'] = [dict(zip(columns, row)) for row in cur.fetchall()]
        
        con.close()
        return data
    except psycopg2.OperationalError as e:
        print(f"ERROR: Could not connect to PostgreSQL: {e}")
        return None


def normalize_value(val):
    """Convert values to comparable format"""
    if val is None:
        return None
    # Convert date/time objects to strings
    if hasattr(val, 'isoformat'):
        iso_str = val.isoformat()
        # Remove :00 seconds from time strings to normalize HH:MM vs HH:MM:00
        if 'T' not in iso_str and len(iso_str) > 5:  # time format
            parts = iso_str.split(':')
            if len(parts) == 3 and parts[2] == '00':
                return f"{parts[0]}:{parts[1]}"
        return iso_str
    # Normalize time strings: remove :00 seconds
    val_str = str(val) if not isinstance(val, str) else val
    if val_str and ':' in val_str and len(val_str.split(':')) == 3:
        parts = val_str.split(':')
        if parts[2] == '00':
            return f"{parts[0]}:{parts[1]}"
    return val_str


def compare_tables(sqlite_data, postgres_data, table_name):
    """Compare a specific table between SQLite and PostgreSQL"""
    sqlite_rows = sqlite_data.get(table_name, [])
    postgres_rows = postgres_data.get(table_name, [])
    
    print(f"\n{'='*80}")
    print(f"TABLE: {table_name.upper()}")
    print(f"{'='*80}")
    print(f"SQLite rows: {len(sqlite_rows)}")
    print(f"Postgres rows: {len(postgres_rows)}")
    
    if len(sqlite_rows) != len(postgres_rows):
        print(f"[!] Row count mismatch!")
    
    # Compare row by row
    mismatches = 0
    for i, (sqlite_row, postgres_row) in enumerate(zip(sqlite_rows, postgres_rows)):
        # Normalize both rows for comparison
        sqlite_norm = {k: normalize_value(v) for k, v in sqlite_row.items()}
        postgres_norm = {k: normalize_value(v) for k, v in postgres_row.items()}
        
        if sqlite_norm != postgres_norm:
            mismatches += 1
            print(f"\n[X] Row {i} mismatch:")
            print(f"  SQLite:   {sqlite_norm}")
            print(f"  Postgres: {postgres_norm}")
    
    # Check for extra rows in either database
    if len(sqlite_rows) > len(postgres_rows):
        print(f"\n[!] {len(sqlite_rows) - len(postgres_rows)} extra rows in SQLite:")
        for row in sqlite_rows[len(postgres_rows):]:
            print(f"  {row}")
    elif len(postgres_rows) > len(sqlite_rows):
        print(f"\n[!] {len(postgres_rows) - len(sqlite_rows)} extra rows in Postgres:")
        for row in postgres_rows[len(sqlite_rows):]:
            print(f"  {row}")
    
    if mismatches == 0 and len(sqlite_rows) == len(postgres_rows):
        print(f"[OK] {table_name} matches perfectly!")
    else:
        print(f"[ERROR] {table_name} has {mismatches} mismatched rows")
    
    return mismatches == 0 and len(sqlite_rows) == len(postgres_rows)


def display_table_summary(name, data):
    """Display a summary of table data"""
    print(f"\n{name}:")
    print("-" * 80)
    if not data:
        print("  (empty)")
        return
    print(tabulate(data, headers="keys", tablefmt="grid"))


def main():
    # Load environment variables from .env file
    load_dotenv()
    
    # Get database URLs
    sqlite_path = Path(__file__).resolve().parent / "timetracker.db"
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        print("Please set it to your Supabase PostgreSQL connection string")
        print("Example: postgresql://user:password@host.supabase.co:5432/postgres")
        sys.exit(1)
    
    print("[*] Starting database migration verification...\n")
    print(f"SQLite DB: {sqlite_path}")
    print(f"Postgres DB: {database_url.split('@')[1] if '@' in database_url else database_url}")
    
    # Read data from both databases
    print("\n[Reading from SQLite...]")
    sqlite_data = get_sqlite_data(str(sqlite_path))
    if not sqlite_data:
        sys.exit(1)
    
    print("[Reading from PostgreSQL...]")
    postgres_data = get_postgres_data(database_url)
    if not postgres_data:
        sys.exit(1)
    
    # Compare tables
    all_match = True
    for table_name in ['work_day', 'settings', 'recurring_holiday', 'time_off']:
        if not compare_tables(sqlite_data, postgres_data, table_name):
            all_match = False
    
    # Display full data summaries
    print("\n\n" + "="*80)
    print("DETAILED DATA SUMMARIES")
    print("="*80)
    
    print("\n--- SQLITE DATA ---")
    for table_name in ['work_day', 'settings', 'recurring_holiday', 'time_off']:
        display_table_summary(f"{table_name.upper()}", sqlite_data[table_name])
    
    print("\n--- POSTGRES DATA ---")
    for table_name in ['work_day', 'settings', 'recurring_holiday', 'time_off']:
        display_table_summary(f"{table_name.upper()}", postgres_data[table_name])
    
    # Final summary
    print("\n\n" + "="*80)
    if all_match:
        print("[SUCCESS] MIGRATION VERIFICATION PASSED - All data matches!")
        print("="*80)
        return 0
    else:
        print("[FAILED] MIGRATION VERIFICATION FAILED - Data mismatches found!")
        print("="*80)
        return 1


if __name__ == "__main__":
    sys.exit(main())
