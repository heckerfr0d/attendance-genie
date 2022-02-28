from psycopg2 import connect
from cryptography.fernet import Fernet
import os

conn = connect(os.getenv('DATABASE_URL'), sslmode='require')
fernet = Fernet(os.getenv('SECRET_KEY'))

# get username, password list
def get_users():
    cur = conn.cursor()
    cur.execute("SELECT username, password, disco, whatsapp FROM users")
    return [(username, fernet.decrypt(password.encode()).decode(), disco, whatsapp) for username, password, disco, whatsapp in cur.fetchall()]

def get_courses():
    cur = conn.cursor()
    cur.execute("SELECT link, course FROM courses")
    return {link: course for link, course in cur.fetchall()}

def add_course(link, course):
    cur = conn.cursor()
    cur.execute("INSERT INTO courses (link, course) VALUES (%s, %s) ON CONFLICT(link) DO NOTHING", (link, course))
    conn.commit()