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
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO users (username, password, disco) VALUES (%s, %s, %s)", (username, password, disco))
        conn.commit()
        cur.close()
        return True
    except:
        return False

# get all unmarked attendance
def get_schedule():
    cur = conn.cursor()
    cur.execute("SELECT s.id, u.username, u.password, u.disco, s.time, s.link, s.tries FROM schedule s, users u WHERE (s.uid=u.id and s.tries<3 and s.marked=FALSE) ORDER BY time")
    return cur.fetchall()

# add to schedule
def schedule(uid, time, link):
    try:
        cur = conn.cursor()
        id = int(str(uid)+link)
        cur.execute("INSERT INTO schedule (id, uid, time, link, marked, tries) VALUES (%s, %s, %s, %s, %s, %s)", (id, uid, time, link, False, 0))
        conn.commit()
        cur.close()
        return True
    except:
        return False

def schedExists(sid):
    cur = conn.cursor()
    cur.execute("SELECT id FROM schedule WHERE id=%s", (sid,))
    return cur.fetchone()

# clear schedule
def clear():
    cur = conn.cursor()
    cur.execute("DELETE FROM schedule")
    conn.commit()
    cur.close()

# update attendance status
def update(id, marked, tries):
    cur = conn.cursor()
    cur.execute("UPDATE schedule SET marked=%s, tries=%s WHERE id=%s", (marked, tries, id))
    conn.commit()
    cur.close()