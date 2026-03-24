#!/usr/bin/env python3
"""
Quick setup script to configure Supabase and verify migration
"""

import os
import sys
from pathlib import Path

def setup_env():
    """Create .env file from user input"""
    env_file = Path(__file__).resolve().parent / ".env"
    
    if env_file.exists():
        print(f"✓ .env file already exists at {env_file}")
        response = input("Do you want to update it? (y/n): ").lower()
        if response != 'y':
            return
    
    print("\n" + "="*80)
    print("SUPABASE POSTGRESQL CONNECTION SETUP")
    print("="*80)
    print("\nTo get your connection string:")
    print("1. Go to https://app.supabase.com/")
    print("2. Select your project")
    print("3. Go to Settings → Database")
    print("4. Copy the Connection String (with Connection pooling enabled)")
    print("\nExample format:")
    print("postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres\n")
    
    db_url = input("Enter your Supabase PostgreSQL connection string: ").strip()
    
    if not db_url.startswith("postgresql://"):
        print("❌ Invalid connection string format (must start with 'postgresql://')")
        return False
    
    # Write to .env file
    with open(env_file, 'w') as f:
        f.write(f"# Auto-created configuration\n")
        f.write(f"DATABASE_URL={db_url}\n")
    
    print(f"\n✓ .env file created successfully at {env_file}")
    return True

def install_dependencies():
    """Check and install required packages"""
    print("\n" + "="*80)
    print("CHECKING DEPENDENCIES")
    print("="*80)
    
    required = [
        ('psycopg2-binary', 'PostgreSQL adapter for Python'),
        ('python-dotenv', 'Load environment variables from .env'),
        ('tabulate', 'Pretty print for verification script'),
        ('fastapi', 'Web framework'),
        ('uvicorn', 'ASGI server'),
    ]
    
    missing = []
    for package, description in required:
        try:
            __import__(package.replace('-', '_'))
            print(f"✓ {package} - {description}")
        except ImportError:
            print(f"✗ {package} - {description} (MISSING)")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        response = input("Install missing packages? (y/n): ").lower()
        if response == 'y':
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
            print("✓ Dependencies installed")
        else:
            print("❌ Cannot proceed without dependencies")
            return False
    
    return True

def run_verification():
    """Run the migration verification script"""
    print("\n" + "="*80)
    print("RUNNING MIGRATION VERIFICATION")
    print("="*80)
    print("\nThis will compare your local SQLite database with Supabase.")
    print("Make sure your .env file has DATABASE_URL set.\n")
    
    response = input("Run verification now? (y/n): ").lower()
    if response == 'y':
        import subprocess
        verify_script = Path(__file__).resolve().parent / "verify_migration.py"
        subprocess.run([sys.executable, str(verify_script)])
    
def main():
    print("\n" + "="*80)
    print("TIMETRACKER - SUPABASE SETUP WIZARD")
    print("="*80)
    
    steps = [
        ("Setup .env file", setup_env),
        ("Check dependencies", install_dependencies),
        ("Run verification", run_verification),
    ]
    
    for step_name, step_func in steps:
        print(f"\n[Step] {step_name}")
        try:
            result = step_func()
            if result is False:
                print(f"\n❌ Setup wizard stopped at: {step_name}")
                sys.exit(1)
        except KeyboardInterrupt:
            print("\n\n❌ Setup wizard interrupted by user")
            sys.exit(1)
        except Exception as e:
            print(f"\n❌ Error during {step_name}: {e}")
            sys.exit(1)
    
    print("\n" + "="*80)
    print("✅ SETUP COMPLETE!")
    print("="*80)
    print("\nYour application is now configured to use Supabase!")
    print("To start the app:")
    print("  python -m uvicorn backend.main:app --reload")
    print("\nFor detailed documentation, see: SUPABASE_MIGRATION.md")

if __name__ == "__main__":
    main()
