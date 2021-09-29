#!/usr/bin/python3

import asyncio
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import schedule as db
import user
import utilities
import re
import os
# import pytz

# ist = pytz.timezone('Asia/Kolkata')
webHook = os.getenv('WEBHOOK')
wa = "http://localhost:3000"

submit = re.compile(r'mod\/attendance\/attendance.php\?sessid=(\d{5})&amp;sesskey=(\w{10})')
coursere = re.compile(r'<h1>([\w\s]*)[\w\s\(\)-]*</h1>')
sessions = {}

async def crawl():
    global sessions
    users = db.get_users()

    async def oneiter(uid, username, password):
        global sessions
        try:
            expired = await utilities.expired(sessions[uid])
            if expired:
                sessions[uid] = await utilities.get_session(username, password)
        except:
            return
        sess = sessions[uid]

        # get calendar page
        async with sess.get("https://eduserver.nitc.ac.in/calendar/view.php?view=day") as resp:
            upcoming = await resp.text()
        soup = BeautifulSoup(upcoming, 'html.parser')

        # find attendance blocks
        att_blocks = soup.find_all("div", attrs={"data-event-eventtype": "attendance"})
        for block in att_blocks:
            # now = pytz.utc.localize(datetime.utcnow()).astimezone(ist)
            now = datetime.now()
            # get start time
            timeurl = block.find("a", string="Today")
            time_str = timeurl.parent.contents[1]
            hour = int(time_str[2:-7])
            if time_str[-3] == "P" and hour != 12:
                hour = hour+12
            time = now.replace(hour=hour, minute=int(time_str[-6:-4]), second=0, microsecond=500000)
            if now-time > timedelta(minutes=5):
                continue
            # get link
            link = block.find("a", string="Go to activity").attrs["href"][-5:]
            db.schedule(uid, time, link)
        # await sess.close()

    tasks = [oneiter(uid, username, password) for uid, username, password, disco, whatsapp in users]
    await asyncio.gather(*tasks)

async def loop(schedules):
    # now = pytz.utc.localize(datetime.utcnow()).astimezone(ist)
    # now = datetime.now()
    res = []

    async def mark1(uid, username, password, disco, whatsapp, link, tries):
        expired = await utilities.expired(sessions[uid])
        if expired:
            sessions[uid] = await utilities.get_session(username, password)
        session = sessions[uid]
        async with session.get("https://eduserver.nitc.ac.in/mod/attendance/view.php?id="+link) as response:
            r = await response.text()

        # find submit link
        search = submit.search(r)
        course = coursere.search(r)
        if course:
            course = ' '.join(course.group(1).split()[1:])
        if search:
            submiturl = search.group(0)
            async with session.get("https://eduserver.nitc.ac.in/" + submiturl) as resp:
                r = await resp.text()

            # find Present/Excused
            soup = BeautifulSoup(r, 'html.parser')
            # course = ' '.join(soup.find("h1").string.split()[1:])
            present_span = soup.find("span", class_="statusdesc", string="Present")
            if not present_span:
                present_span = soup.find("span", class_="statusdesc", string="Excused")
            if present_span:
                present_status = present_span.parent.find("input", attrs={"name": "status"}).attrs["value"]
                sessid = search.group(1)
                sesskey = search.group(2)
                data = {
                    "status":  present_status,
                    "sessid": sessid,
                    "sesskey": sesskey,
                    "sesskey": sesskey,
                    "studentpassword": "12345",
                    "_qf__mod_attendance_student_attendance_form": "1",
                    "mform_isexpanded_id_session": "1",
                    "submitbutton": "Save+changes"
                }

                # submit
                r = await session.post(
                    'https://eduserver.nitc.ac.in/mod/attendance/attendance.php',
                    data=data
                )
                db.update(uid, link, r.status==200 or r.status==303, tries+1)

                if r.status == 200 or r.status==303 or tries >=2:
                    res.append((username, disco, whatsapp, course, r.status))

                # msg = f"Got <@{disco}>'s `{course}`." if disco else f"Got {username}'s {course}."
                # r2 = await session.post(
                #     webHook,
                #     json={"content": msg}
                # )
                # set marked
                # while r2.status != 204:
                #     r2 = await session.post(
                #         webHook,
                #         json={"content": msg}
                #     )
            else:
                db.update(uid, link, False, tries+1)
                if tries >=2:
                    res.append((username, disco, whatsapp, course, 400))
                # await session.post(
                #     webHook,
                #     json={"content": f'{tries+1} fail(s) for <@{disco if disco else username}>\'s {course}'}
                # )

        else:
            db.update(uid, link, False, tries+1)
            if tries >=2:
                    res.append((username, disco, whatsapp, course, 404))
            # await session.post(
            #     webHook,
            #     json={"content": f'{tries+1} fail(s) for <@{disco if disco else username}>'}
            # )
        # await session.close()

    cors = [mark1(uid, username, password, disco, whatsapp, link, tries) for uid, username, password, disco, whatsapp, time, link, tries in schedules if time <= now]
    await asyncio.gather(*cors)
    ds = {}
    df = {}
    payloads = ["", "", []]
    for username, disco, whatsapp, course, status in res:
        if status == 200 or status == 303:
            # dd += f"Marked <@{disco if disco else username}>'s {course}\n"
            ds[course] = ds.get(course, [])
            ds[course].append('<@'+disco+'>' if disco else username)
            if whatsapp:
                payloads[2].append([True, whatsapp, course])
        else:
            # dd += f"Failed to mark <@{disco if disco else username}>'s {course}\n"
            df[course] = df.get(course, [])
            df[course].append('<@'+disco+'>' if disco else username)
            if whatsapp:
                payloads[2].append([False, whatsapp, course])
    for course in ds:
        payloads[0] += f"Marked {course} for {' '.join(ds[course])}\n"
    for course in df:
        payloads[1] += f"Failed to mark {course} for {' '.join(df[course])}\n"

    async def notify(url, payload):
        await sessions[1].post(
            url,
            json={"content": payload}
        )
    tasks = [notify(url, payload) for url, payload in zip([webHook, webHook, wa], payloads)]
    await asyncio.gather(*tasks)

async def init():
    users = user.get_users()
    async def get_ses(id, username, password):
        sessions[id] = await utilities.get_session(username, password)
    cors = [get_ses(id, username, password) for id, username, password, disco, whatsapp in users]
    await asyncio.gather(*cors)
    db.load_users(users)

if __name__=="__main__":
    lp = asyncio.get_event_loop()
    lp.run_until_complete(init())
    lp.run_until_complete(crawl())
    schedules = db.get_schedule()

    while True:
        # now = pytz.utc.localize(datetime.utcnow()).astimezone(ist)
        now = datetime.now()

        # check for link at specified times
        if (( 7 <= now.hour < 10 and now.minute == 49 and now.second<=5) or
            ( 7 <= now.hour <  9 and now.minute == 54 and now.second<=5) or
            ( 7 <= now.hour <  9 and now.minute == 59 and now.second<=5) or
            (10 <= now.hour <= 11 and now.minute == 4 and now.second<=5) or
            (10 <= now.hour <= 11 and now.minute == 9 and now.second<=5) or
            (10 <= now.hour <= 11 and now.minute == 14 and now.second<=5) or
            (12 <= now.hour <= 16 and now.minute == 54 and now.second<=5) or
            (12 <= now.hour <= 17 and now.minute == 59 and now.second<=5)):
            lp.run_until_complete(crawl())
            schedules = db.get_schedule()
        if now.hour == 18:
            async def close():
                for ses in sessions.values():
                    await ses.close()
            lp.run_until_complete(close())
            lp.close()
            db.clear()
            exit(0)
        # mark if schedule exists
        if schedules and schedules[0][5] <= now:
            lp.run_until_complete(loop(schedules))
            schedules = db.get_schedule()
