from psycopg2 import connect

conn = connect(dbname="attendance")

def get_users():
    cur = conn.cursor()
    cur.execute("SELECT id, username, password FROM users")
    return cur.fetchall()

def add_user(username, password):
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password))
        conn.commit()
        cur.close()
        return True
    except:
        return False

def get_schedule():
    cur = conn.cursor()
    cur.execute("SELECT s.id, u.username, u.password, s.time, s.link, s.tries FROM schedule s, users u WHERE (s.uid=u.id and s.tries<3 and s.marked=FALSE) ORDER BY time")
    return cur.fetchall()

def schedule(uid, time, link):
    try:
        cur = conn.cursor()
        id = int(str(uid)+link[-5:])
        cur.execute("INSERT INTO schedule (id, uid, time, link, tries) VALUES (%s, %s, %s, %s, %s)", (id, uid, time, link, 0))
        conn.commit()
        cur.close()
        return True
    except:
        return False

def clear():
    cur = conn.cursor()
    cur.execute("DELETE FROM schedule")
    conn.commit()
    cur.close()


def update(id, marked, tries):
    cur = conn.cursor()
    cur.execute("UPDATE schedule SET marked=%s, tries=%s WHERE id=%s", (marked, tries, id))
    conn.commit()
    cur.close()