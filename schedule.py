import sqlite3

conn = sqlite3.connect(':memory:', isolation_level='DEFERRED', detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
conn.execute('PRAGMA synchronous = OFF')
# conn.execute('PRAGMA journal_mode = OFF')
conn.execute('''
    CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        username VARCHAR(10) UNIQUE NOT NULL,
        password VARCHAR(32) NOT NULL,
        disco VARCHAR(19),
        whatsapp VARCHAR(15)
    )
''')
conn.execute('''
    CREATE TABLE schedule (
            uid INTEGER REFERENCES users(id) NOT NULL,
            time TIMESTAMP NOT NULL,
            link VARCHAR(6) NOT NULL,
            marked BOOLEAN default FALSE,
            tries INTEGER NOT NULL default 0,
            UNIQUE(uid, time)
        )
''')


def load_users(users):
    conn.executemany(
        "INSERT INTO users (id, username, password, disco, whatsapp) VALUES (?, ?, ?, ?, ?)", users)

def get_users():
    cur = conn.cursor()
    cur.execute("SELECT id, username, password, disco, whatsapp FROM users")
    return cur.fetchall()

# get all unmarked attendance


def get_schedule():
    cur = conn.cursor()
    cur.execute("SELECT s.uid, u.username, u.password, u.disco, u.whatsapp, s.time, s.link, s.tries FROM schedule s, users u WHERE (s.uid=u.id and s.tries<3 and s.marked=FALSE) ORDER BY time")
    return cur.fetchall()

# add to schedule


def schedule(uid, time, link):
    conn.execute("INSERT OR IGNORE INTO schedule (uid, time, link, marked, tries) VALUES (?, ?, ?, ?, ?)",
                    (uid, time, link, False, 0))
    conn.commit()

# clear schedule


def clear():
    conn.execute("DELETE FROM schedule")
    conn.execute("DELETE FROM users")
    conn.commit()
    conn.close()

# update attendance status


def update(id, link, marked, tries):
    conn.execute(
        "UPDATE schedule SET marked=(?), tries=(?) WHERE uid=(?) and link=(?)", (marked, tries, id, link))
    conn.commit()
