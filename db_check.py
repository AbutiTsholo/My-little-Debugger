import glob
import os
import sqlite3

paths = sorted(glob.glob(r'c:\Users\Admin\Downloads\DebuggingApp\**\*.db', recursive=True))
paths += sorted(glob.glob(r'c:\Users\Admin\Downloads\DebuggingApp\**\*.sqlite', recursive=True))
paths += sorted(glob.glob(r'c:\Users\Admin\Downloads\DebuggingApp\**\*.sqlite3', recursive=True))
seen = set()
for path in paths:
    if not os.path.isfile(path) or path in seen:
        continue
    seen.add(path)
    print(f'\nDB: {path}')
    try:
        conn = sqlite3.connect(path)
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
        print('TABLES:', [t[0] for t in tables])
        if ('users',) in tables:
            users = conn.execute('SELECT id, name, email, role, is_active FROM users').fetchall()
            print('USERS:', users)
            print('USER COUNT:', conn.execute('SELECT COUNT(*) FROM users').fetchone())
        else:
            print('USER COUNT: no users table')
        conn.close()
    except Exception as exc:
        print('ERROR:', exc)
