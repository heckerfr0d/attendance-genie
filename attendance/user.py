from psycopg2 import connect
from cryptography.fernet import Fernet
import os

# conn = connect(dbname = "attusers")
conn = connect(os.getenv('DATABASE_URL'), sslmode='require')
fernet = Fernet(os.getenv('SECRET_KEY'))

def get_count():
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    return cur.fetchone()[0]

# get username, password list
def get_users():
    cur = conn.cursor()
    cur.execute("SELECT id, username, password FROM users")
    return [(id, username, fernet.decrypt(password.encode()).decode()) for id, username, password in cur.fetchall()]

def dupeUser(username):
    cur = conn.cursor()
    cur.execute("SELECT username FROM users WHERE username=%s", (username,))
    return cur.fetchone()

# new signup yey
def add_user(username, password, disco=None):
    cur = conn.cursor()
    cur.execute("INSERT INTO users (username, password, disco) VALUES (%s, %s, %s)", (username, fernet.encrypt(password.encode()).decode(), disco))
    conn.commit()
    cur.close()

