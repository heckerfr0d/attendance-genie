from psycopg2 import connect
import os

conn = connect(os.getenv('DATABASE_URL'), sslmode='require')

# get username, password list
def get_users():
    cur = conn.cursor()
    cur.execute("SELECT id, username, password FROM users")
    return cur.fetchall()

def dupeUser(username):
    cur = conn.cursor()
    cur.execute("SELECT username FROM users WHERE username=%s", (username,))
    return cur.fetchone()

# new signup yey
def add_user(username, password, disco=None):
    cur = conn.cursor()
    cur.execute("INSERT INTO users (username, password, disco) VALUES (%s, %s, %s)", (username, password, disco))
    conn.commit()
    cur.close()

