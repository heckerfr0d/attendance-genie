#!/usr/bin/python3

import http.cookiejar as cookielib
import mechanize
import os
import datetime
import time

# fill eduserver login details here in the form ("username", "password")
logins = [("username", "password")]

i = 0

def createBr():
    br = mechanize.Browser()
    cookiejar = cookielib.LWPCookieJar()
    br.set_cookiejar(cookiejar)
    br.set_handle_equiv(True)
    br.set_handle_gzip(True)
    br.set_handle_redirect(True)
    br.set_handle_referer(True)
    br.set_handle_robots(False)
    br.set_handle_refresh(mechanize._http.HTTPRefreshProcessor(), max_time=1)
    br.addheaders = [('User-agent', 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.1) Gecko/2008071615 Fedora/3.0.1-1.fc9 Firefox/3.0.1')]
    return br

def login(br, username, password):
    br.open("https://eduserver.nitc.ac.in/login/index.php")
    br.select_form(action="https://eduserver.nitc.ac.in/login/index.php")
    br.form.set_all_readonly(False)
    br.form['username'] = username
    br.form['password'] = password
    br.submit()

def submit(br):
    br.follow_link(text="Submit attendance")
    br.select_form(action="https://eduserver.nitc.ac.in/mod/attendance/attendance.php")
    br.form.set_all_readonly(False)
    br.form.find_control(name="status").get(nr=0).selected = True
    br.submit(id="id_submitbutton")

def init():
    global i, curr_time
    while True:
        x = datetime.datetime.now()
        day = x.strftime("%A").lower()
        if day=="sunday" or day=="saturday":
            pass
        else:
            if x.hour==7 and x.minute==40:
                i = 0
                print(x.strftime("%c"), file=open("log", "w"))
            elif x.hour==18:
                time.sleep(48600)
            elif ((7 <= x.hour < 10 and 55 <= x.minute <= 59) or
            ( 8 <= x.hour <  10 and 0 <= x.minute <= 6) or
            (10 <= x.hour <= 12 and 0 <= x.minute <= 16) or
            (12 <= x.hour <= 16 and 55<= x.minute <= 59) or
            (13 <= x.hour <= 17 and 0 <= x.minute <= 6)):
                mark()
                time.sleep(2400)
        time.sleep(60)

def mark():
    global i
    j = 0
    n = len(logins)
    x = datetime.datetime.now()
    alive = False
    while j<n:
        br = createBr()
        login(br, logins[j][0], logins[j][1])
        while ((7 <= x.hour < 10 and 55 <= x.minute <= 59) or
            ( 8 <= x.hour <  10 and 0 <= x.minute <= 6) or
            (10 <= x.hour <= 12 and 0 <= x.minute <= 16) or
            (12 <= x.hour <= 16 and 55<= x.minute <= 59) or
            (13 <= x.hour <= 17 and 0 <= x.minute <= 6)):
            br.open("https://eduserver.nitc.ac.in/calendar/view.php?view=day")
            try:
                br.follow_link(url_regex="https://eduserver\.nitc\.ac\.in/mod/attendance/view\.php*", nr=i)
                try:
                    submit(br)
                    print(f"Marked attendance for {logins[j][0]} at {x.hour}:{x.minute}:{x.second}", file=open("log", "a"))
                    alive = True
                    break
                except:
                    if alive:
                        print(f"Attendance already marked for {logins[j][0]}?", file=open("log", "a"))
                        j += 1
                        break
                    else:
                        print(f"link not here yet (no class? at {x.hour}:{x.minute}:{x.second})", file=open("log", "a"))
                        time.sleep(60)
            except:
                print(f"no links here at {x.hour}:{x.minute}:{x.second} lol", file=open("log", "a"))
                time.sleep(60)
        else:
            break
        if alive:
            j += 1
    if alive:
        i += 1

init()
