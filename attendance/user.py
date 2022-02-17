from psycopg2 import connect
from cryptography.fernet import Fernet
import os

# conn = connect(dbname = "attusers")
conn = connect(os.getenv('DATABASE_URL'), sslmode='require')
fernet = Fernet(os.getenv('SECRET_KEY'))

def get_count():
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    a = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM users2")
    b = cur.fetchone()[0]
    return a+b

# get username, password list
def get_users():
    cur = conn.cursor()
    cur.execute("SELECT id, username, password FROM users")
    return [(id, username, fernet.decrypt(password.encode()).decode()) for id, username, password in cur.fetchall()]

def dupeUser(username):
    cur = conn.cursor()
    cur.execute("SELECT username FROM users WHERE username=%s", (username,))
    return cur.fetchone()

def update_user(username, password, disco=None, whatsapp=None):
    cur = conn.cursor()
    cur.execute("UPDATE users SET password=%s, disco=%s, whatsapp=%s WHERE username=%s", (fernet.encrypt(password.encode()).decode(), disco, whatsapp, username))
    conn.commit()
    cur.close()

# new signup yey
def add_user(username, password, disco=None, whatsapp=None):
    cur = conn.cursor()
    cur.execute("INSERT INTO users (username, password, disco, whatsapp) VALUES (%s, %s, %s, %s)", (username, fernet.encrypt(password.encode()).decode(), disco, whatsapp))
    conn.commit()
    cur.close()

