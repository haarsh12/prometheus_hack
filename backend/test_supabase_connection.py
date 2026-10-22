"""Test Supabase database connection with both pooler and direct connections."""

import asyncio
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config.settings import get_settings

# Connection strings
POOLER_URL = "postgresql://postgres.tgksyqbxokmzzwosfgdi:ShantiNagar12@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
DIRECT_URL = "postgresql://postgres:ShantiNagar12@db.tgksyqbxokmzzwosfgdi.supabase.co:5432/postgres"


async def test_asyncpg_connection(url: str, connection_type: str):
    """Test connection using asyncpg (raw connection)."""
    print(f"\n{'='*60}")
    print(f"Testing {connection_type} Connection with asyncpg")
    print(f"{'='*60}")
    
    try:
        conn = await asyncpg.connect(url)
        print(f"✅ Connected successfully to {connection_type}!")
        
        # Test basic query
        version = await conn.fetchval("SELECT version()")
        print(f"✅ PostgreSQL Version: {version[:80]}...")
        
        # Test database info
        db_name = await conn.fetchval("SELECT current_database()")
        user = await conn.fetchval("SELECT current_user")
        print(f"✅ Database: {db_name}")
        print(f"✅ User: {user}")
        
        # Test if we can query tables
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
            LIMIT 10
        """)
        
        print(f"\n📊 Tables in database (showing first 10):")
        if tables:
            for table in tables:
                print(f"   - {table['table_name']}")
        else:
            print("   (No tables found - database is empty)")
        
        await conn.close()
        print(f"\n✅ {connection_type} connection test PASSED!\n")
        return True
        
    except Exception as e:
        print(f"\n❌ {connection_type} connection test FAILED!")
        print(f"Error: {e}")
        print(f"Error type: {type(e).__name__}\n")
        return False


async def test_sqlalchemy_connection():
    """Test connection using SQLAlchemy (as used in the app)."""
    print(f"\n{'='*60}")
    print("Testing Connection with SQLAlchemy (App Method)")
    print(f"{'='*60}")
    
    try:
        settings = get_settings()
        database_url = settings.async_database_url
        
        print(f"Database URL from settings: {database_url[:50]}...")
        
        if not database_url or "sqlite" in database_url:
            print("⚠️  Using SQLite fallback - DATABASE_URL not properly configured")
            return False
        
        engine = create_async_engine(
            database_url, 
            echo=False,
            connect_args={"prepared_statement_cache_size": 0}
        )
        
        async with engine.connect() as conn:
            print("✅ SQLAlchemy connected successfully!")
            
            # Test query
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ PostgreSQL Version: {version[:80]}...")
            
            # Test current database
            result = await conn.execute(text("SELECT current_database()"))
            db_name = result.scalar()
            print(f"✅ Database: {db_name}")
            
            # Check for existing Sahayak tables
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE 'sahayak%'
                ORDER BY table_name
            """))
            sahayak_tables = result.fetchall()
            
            print(f"\n📊 Sahayak tables:")
            if sahayak_tables:
                for table in sahayak_tables:
                    print(f"   - {table[0]}")
            else:
                print("   (No Sahayak tables found - run setup_supabase.py to create)")
        
        await engine.dispose()
        print(f"\n✅ SQLAlchemy connection test PASSED!\n")
        return True
        
    except Exception as e:
        print(f"\n❌ SQLAlchemy connection test FAILED!")
        print(f"Error: {e}")
        print(f"Error type: {type(e).__name__}\n")
        return False


async def main():
    """Run all connection tests."""
    print("\n" + "="*60)
    print("🔍 SUPABASE CONNECTION TEST SUITE")
    print("="*60)
    print("\nTesting new Supabase instance: tgksyqbxokmzzwosfgdi")
    print("Project URL: https://tgksyqbxokmzzwosfgdi.supabase.co")
    
    results = []
    
    # Test 1: Pooler connection with asyncpg
    pooler_ok = await test_asyncpg_connection(POOLER_URL, "Pooler (Transaction Mode)")
    results.append(("Pooler Connection", pooler_ok))
    
    # Test 2: Direct connection with asyncpg
    direct_ok = await test_asyncpg_connection(DIRECT_URL, "Direct (Session Mode)")
    results.append(("Direct Connection", direct_ok))
    
    # Test 3: SQLAlchemy connection (as used by the app)
    sqlalchemy_ok = await test_sqlalchemy_connection()
    results.append(("SQLAlchemy (App Config)", sqlalchemy_ok))
    
    # Summary
    print("\n" + "="*60)
    print("📋 TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("Your Supabase connection is working correctly!")
    else:
        print("⚠️  SOME TESTS FAILED")
        print("\nTroubleshooting:")
        print("1. Verify your IP is allowed in Supabase dashboard:")
        print("   → Project Settings → Database → Connection Pooling")
        print("2. Check if the password is correct: ShantiNagar12")
        print("3. Ensure the project is active and not paused")
        print("4. Try running setup_supabase.py to create tables")
    print("="*60 + "\n")
    
    return all_passed


if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        exit(1)
