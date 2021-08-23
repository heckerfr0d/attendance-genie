import sqlite3

conn = sqlite3.connect(':memory:', isolation_level='DEFERRED')
conn.execute('PRAGMA synchronous = OFF')
conn.execute('PRAGMA journal_mode = OFF')
conn.execute('''
    CREATE TABLE schedule (
            uid INTEGER REFERENCES users(id) NOT NULL,
            time TIMESTAMP WITH TIME ZONE NOT NULL,
            link VARCHAR(6) NOT NULL,
            marked BOOLEAN default FALSE,
            tries INTEGER NOT NULL default 0,
            UNIQUE(uid, time)
        )
''')

# get all unmarked attendance


def get_schedule():
    conn.execute("SELECT s.uid, u.username, u.password, u.disco, s.time, s.link, s.tries FROM schedule s, users u WHERE (s.uid=u.id and s.tries<3 and s.marked=FALSE) ORDER BY time")
    return conn.fetchall()

# add to schedule


def schedule(uid, time, link):
    try:
        conn.execute("INSERT INTO schedule (uid, time, link, marked, tries) VALUES (?, ?, ?, ?, ?)",
                    (uid, time, link, False, 0))
    except:
        conn.execute("UPDATE schedule SET time=(?) WHERE uid=(?) and link=(?)", (time, uid, link))
    conn.commit()

# clear schedule


def clear():
    conn.execute("DELETE FROM schedule")
    conn.commit()
    conn.close()

# update attendance status


def update(id, link, marked, tries):
    conn.execute(
        "UPDATE schedule SET marked=(?), tries=(?) WHERE uid=(?) and link=(?)", (marked, tries, id, link))
    conn.commit()
