#!/usr/bin/python3

import asyncio
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import schedule as db
import user
import utilities
import re
import os
import time
import aiohttp
# import pytz

# ist = pytz.timezone('Asia/Kolkata')
webHook = os.getenv('WEBHOOK')
wa = os.getenv('WHATSAPP')
home = os.getenv('MOODLE_HOME')
notif = aiohttp.ClientSession()

submit = re.compile(r'mod\/attendance\/attendance.php\?sessid=(\d{5})&amp;sesskey=(\w{10})')
coursere = re.compile(r'<h1>([\w\s]*)[\w\s\&\:\;\/\(\)\-\–\.\[\]]*</h1>')
cidre = re.compile(r'[A-Z]{2}[0-9]{4}')
chome = re.compile(r'/course/view\.php\?id=')
custom = {}
sessions = {}
users = []

async def crawl():
    global sessions
    # users = db.get_users()

    # async def oneiter(uid, username, password):
    async def oneiter(username):
        global sessions
        # try:
        #     expired = await utilities.expired(sessions[uid])
        #     if expired:
        #         sessions[uid] = await utilities.get_session(username, password)
        # except:
        #     return
        sess = sessions[username]

        # get calendar page
        async with sess.get(home+"calendar/view.php?view=day") as resp:
            upcoming = await resp.text()
        soup = BeautifulSoup(upcoming, 'html.parser')

        # find attendance blocks
        att_blocks = soup.find_all("div", attrs={"data-event-eventtype": "attendance"})
        class_blocks = soup.find_all("div", attrs={"data-event-eventtype": "meetingtime"})
        for block in att_blocks+class_blocks:
            # now = pytz.utc.localize(datetime.utcnow()).astimezone(ist)
            now = datetime.now()
            # get start time
            timeurl = block.find("a", string="Today")
            time_str = timeurl.parent.contents[1]
            hour = int(time_str[2:-7])
            if time_str[-3] == "P" and hour != 12:
                hour = hour+12
            time = now.replace(hour=hour, minute=int(time_str[-6:-4]), second=0, microsecond=800000)
            if now-time > timedelta(minutes=5):
                continue
            # get link
            link = block.find("a", string="Go to activity").attrs["href"].split("id=", 1)[1]
            if block in class_blocks:
                db.schedule(username, time, link, True)
            else:
                db.schedule(username, time, link, False)
            if link not in custom:
                course = block.find("a", href=chome).contents[0]
                if course:
                    clist = course.split()
                    if cidre.search(clist[0]):
                        clist.pop(0)
                    course = ' '.join(clist)
                    for i in range(len(course)):
                        if course[i] == '[' or course[i]=='(' or course[i]=='{':
                            course = course[:i].strip()
                            break
                    custom[link] = course
                    user.add_course(link, course)
        # await sess.close()

    # tasks = [oneiter(uid, username, password) for uid, username, password, disco, whatsapp in users]
    tasks = [oneiter(username) for username in sessions]
    await asyncio.gather(*tasks)

async def notify(url, payload):
    await notif.post(
        url,
        json={"content": payload}
    )

async def loop(schedules):
    # now = pytz.utc.localize(datetime.utcnow()).astimezone(ist)
    # now = datetime.now()
    res = []

    async def mark1(username, disco, whatsapp, link, tries):
        # expired = await utilities.expired(sessions[uid])
        # if expired:
        #     sessions[uid] = await utilities.get_session(username, password)
        session = sessions[username]
        async with session.get(home+"mod/attendance/view.php?id="+link) as response:
            r = await response.text()

        # find submit link
        search = submit.search(r)
        course = custom[link]
        if search:
            submiturl = search.group(0)
            async with session.get(home + submiturl) as resp:
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
                    "studentpassword": "123",
                    "_qf__mod_attendance_student_attendance_form": "1",
                    "mform_isexpanded_id_session": "1",
                    "submitbutton": "Save+changes"
                }

                # submit
                r = await session.post(
                    home+'mod/attendance/attendance.php',
                    data=data
                )
                db.update(username, link, r.status==200 or r.status==303 or r.status==301, tries+1)

                # print(r.status, username, course, file=open("genie.log", "a"))

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
                db.update(username, link, False, tries+1)
                if tries >=2:
                    # print(tries, username, course, file=open("genie.log", "a"))
                    res.append((username, disco, whatsapp, course, 400))
                # await session.post(
                #     webHook,
                #     json={"content": f'{tries+1} fail(s) for <@{disco if disco else username}>\'s {course}'}
                # )

        else:
            db.update(username, link, False, tries+1)
            if tries >=2:
                # print(tries, username, course, file=open("genie.log", "a"))
                res.append((username, disco, whatsapp, course, 404))
            # await session.post(
            #     webHook,
            #     json={"content": f'{tries+1} fail(s) for <@{disco if disco else username}>'}
            # )
        # await session.close()

    cors = [mark1(username, disco, whatsapp, link, tries) for username, password, disco, whatsapp, time, link, tries, type in schedules if time <= now and not type]
    if cors:
        await asyncio.gather(*cors)

    class_links = []
    async def get_class(username, whatsapp, link):
        session = sessions[username]
        async with session.get(f"{home}mod/webexactivity/view.php?id={link}&action=joinmeeting") as response:
            async with session.get(response.url) as resp:
                class_links.append([whatsapp, "Join " + custom[link] + ":\n" + str(resp.url)])
                db.update(username, link, True, 1)
    classt = [get_class(username, whatsapp, link) for username, password, disco, whatsapp, time, link, tries, type in schedules if time <= now and whatsapp and type]
    if classt:
        await asyncio.gather(*classt)
    if class_links:
        await notify(wa, class_links)

    if res:
        ds = {}
        df = {}
        payloads = ["", "", []]
        for username, disco, whatsapp, course, status in res:
            if status == 200 or status == 303 or status == 301:
                # dd += f"Marked <@{disco if disco else username}>'s {course}\n"
                ds[course] = ds.get(course, [])
                ds[course].append('<@'+disco+'>' if disco else username)
                if whatsapp:
                    payloads[2].append([whatsapp, "Marked " + course])
            else:
                # dd += f"Failed to mark <@{disco if disco else username}>'s {course}\n"
                df[course] = df.get(course, [])
                df[course].append('<@'+disco+'>' if disco else username)
                if whatsapp:
                    payloads[2].append([whatsapp, "Failed to mark " + course])
        for course in ds:
            payloads[0] += f"Marked {course} for {' '.join(ds[course])}\n"
        for course in df:
            payloads[1] += f"Failed to mark {course} for {' '.join(df[course])}\n"

        tasks = [notify(url, payload) for url, payload in zip([webHook, webHook, wa], payloads)]
        await asyncio.gather(*tasks)

    # await session.close()

async def init():
    global sessions, users
    # users = user.get_users()
    async def get_ses(username, password, disco, whatsapp):
        sessions[username] = await utilities.get_session(username, password)
        if await utilities.expired(sessions[username]):
            sessions[username] = await utilities.get_session(username, password)
            if await utilities.expired(sessions[username]):
                print(f"{username} - {whatsapp} invalid", file=open("genie.log", "a"))
                if whatsapp:
                    await notify(wa, [[whatsapp, "Eduserver login failed!"]])
                await sessions[username].close()
                sessions.pop(username)
                users.remove((username, password, disco, whatsapp))
    cors = [get_ses(username, password, disco, whatsapp) for username, password, disco, whatsapp in users]
    await asyncio.gather(*cors)
    db.load_users(users)

if __name__=="__main__":
    users = user.get_users()
    custom = user.get_courses()
    # user.conn.close()
    lp = asyncio.get_event_loop()
    lp.run_until_complete(init())
    lp.run_until_complete(crawl())
    schedules = db.get_schedule()

    while True:
        # now = pytz.utc.localize(datetime.utcnow()).astimezone(ist)
        now = datetime.now()

        if now.hour == 17 and now.minute >= 10:
            async def close():
                await notif.close()
                for ses in sessions.values():
                    await ses.close()
            lp.run_until_complete(close())
            lp.close()
            user.conn.close()
            db.clear()
            exit(0)

        try:

            # check for link at specified times
            if (( 7 <= now.hour < 10 and now.minute == 49 ) or
                ( 7 <= now.hour <  9 and now.minute == 54 ) or
                ( 7 <= now.hour <  9 and now.minute == 59 ) or
                (10 <= now.hour <= 11 and now.minute == 4 ) or
                (10 <= now.hour <= 11 and now.minute == 9 ) or
                (10 <= now.hour <= 11 and now.minute == 14) or
                (12 <= now.hour <= 16 and now.minute == 54) or
                (12 <= now.hour <= 16 and now.minute == 59)):
                lp.run_until_complete(crawl())
                schedules = db.get_schedule()

            # mark if schedule exists
            if schedules and schedules[0][4] <= now:
                lp.run_until_complete(loop(schedules))
                schedules = db.get_schedule()

        except Exception as e:
            print(e, file=open('genie.log', 'a'))
            continue