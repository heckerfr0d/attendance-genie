import asyncio
from attendance import utilities, db
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import re
import pytz
import os

ist = pytz.timezone('Asia/Kolkata')
webHook = os.getenv('WEBHOOK')
submit = re.compile(r'mod\/attendance\/attendance.php\?sessid=(\d{5})&amp;sesskey=(\w{10})')
sessions = {}

async def crawl():
    users = db.get_users()

    async def oneiter(uid, username, password):
        sess = sessions[uid] if not utilities.expired(sessions[uid]) else await utilities.get_session(username, password)

        # get calendar page
        async with sess.get("https://eduserver.nitc.ac.in/calendar/view.php?view=day") as resp:
            upcoming = await resp.text()
        soup = BeautifulSoup(upcoming, 'html.parser')

        # find attendance blocks
        att_blocks = soup.find_all("div", attrs={"data-event-eventtype": "attendance"})
        for block in att_blocks:
            now = pytz.utc.localize(datetime.utcnow()).astimezone(ist)
            # get start time
            timeurl = block.find("a", string="Today")
            time_str = timeurl.parent.contents[1]
            hour = int(time_str[2:-7]) if time_str[-3] == "A" else int(time_str[2:-7]) + 12
            time = now.replace(hour=hour, minute=int(time_str[-6:-4]), second=0, microsecond=0)
            if now-time > timedelta(minutes=5):
                continue
            # get link
            link = block.find("a", string="Go to activity").attrs["href"][-5:]
            sid = int(str(uid)+link)
            if not db.schedExists(sid):
                db.schedule(sid, uid, time, link)
                # print(f"Found new attendance for {username} at {time_str[2:]}", file=open("attendance.log", "a"))
        # await sess.close()

    tasks = [oneiter(uid, username, password) for uid, username, password in users]
    await asyncio.gather(*tasks)

async def loop(schedules):
    now = pytz.utc.localize(datetime.utcnow()).astimezone(ist)

    async def mark1(id, username, password, disco, link, tries):
        # time = time.replace(tzinfo=ist)
        # if time <= now:
        # link active
        # print(f'Found valid time for {username}', file=open("attendance.log", "a"))
        uid = id//100000
        session = sessions[uid] if not utilities.expired(sessions[uid]) else await utilities.get_session(username, password)
        async with session.get("https://eduserver.nitc.ac.in/mod/attendance/view.php?id="+link) as response:
            r = await response.text()

        # find submit link
        search = submit.search(r)
        if search:
            submiturl = search.group(0)
            async with session.get("https://eduserver.nitc.ac.in/" + submiturl) as resp:
                r = await resp.text()

            # find Present/Excused
            soup = BeautifulSoup(r, 'html.parser')
            present_span = soup.find("span", class_="statusdesc", string="Present")
            if not present_span:
                present_span = soup.find("span", class_="statusdesc", string="Excused")
            if present_span:
                present_status = present_span.parent.find("input", attrs={"name": "status"}).attrs["value"]
                # sessid = soup.find("input", attrs={"name": "sessid"}).attrs["value"]
                # sesskey = soup.find("input", attrs={"name": "sesskey"}).attrs["value"]
                sessid = search.group(1)
                sesskey = search.group(2)
                course = soup.find("h1").string
                data = {
                    "status":  present_status,
                    "sessid": sessid,
                    "sesskey": sesskey,
                    "_qf__mod_attendance_student_attendance_form": "1",
                    "mform_isexpanded_id_session": "1",
                    "submitbutton": "Save+changes"
                }

                # submit
                r = await session.post(
                    'https://eduserver.nitc.ac.in/mod/attendance/attendance.php',
                    data=data
                )
                await session.post(
                    webHook,
                    json={"content": f'Proxied {course} for <@{disco}> ({username}) :heart:'}
                )

                # set marked
                db.update(id, r.status==200, tries+1)
            else:
                db.update(id, False, tries+1)
        else:
            db.update(id, False, tries+1)
        # await session.close()

    cors = [mark1(id, username, password, disco, link, tries) for id, username, password, disco, time, link, tries in schedules if time.astimezone(ist) <= now]
    await asyncio.gather(*cors)

if __name__=="__main__":
    async def init():
        for id, username, password in db.get_users():
            sessions[id] = await utilities.get_session(username, password)
    asyncio.run(init())
    while True:
        now = pytz.utc.localize(datetime.utcnow()).astimezone(ist)

        # check for link at specified times
        if (( 7 <= now.hour < 10 and now.minute == 50 and now.second<=5) or
            ( 7 <= now.hour <  9 and now.minute == 54 and now.second<=5) or
            ( 7 <= now.hour <  9 and now.minute == 59 and now.second<=5) or
            (10 <= now.hour <= 11 and now.minute == 4 and now.second<=5) or
            (10 <= now.hour <= 11 and now.minute == 9 and now.second<=5) or
            (10 <= now.hour <= 11 and now.minute == 14 and now.second<=5) or
            (12 <= now.hour <= 16 and now.minute == 54 and now.second<=5) or
            (12 <= now.hour <= 17 and now.minute == 59 and now.second<=5)):
            asyncio.run(crawl())
            schedules = db.get_schedule()
        if now.hour == 18:
            async def close():
                for ses in sessions.values():
                    await ses.close()
            asyncio.run(close())
            db.clear()
            exit(0)
        # mark if schedule exists
        if schedules and schedules[0][4].astimezone(ist) <= now:
            asyncio.run(loop(schedules))
