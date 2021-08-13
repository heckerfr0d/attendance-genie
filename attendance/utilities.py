import re
import aiohttp
import os


async def login(session, username, password):
    async with session.get("https://eduserver.nitc.ac.in/login/index.php") as resp:
        r = await resp.text()

    # find login token
    token = re.findall(r'<input type="hidden" name="logintoken" value="(\w{32})">', r)[0]
    login = {
        "username":  username,
        "password": password,
        "logintoken": token
    }

    # login
    r = await session.post(
        "https://eduserver.nitc.ac.in/login/index.php",
        data=login
    )
    return session

# check if u get redirected to login lol
async def expired(session):
    async with session.get("https://eduserver.nitc.ac.in") as resp:
        return "login" in str(resp.url)

# get logged in session
async def get_session(username, password):
    cookiejar = os.path.join("cookies", username)
    session = aiohttp.ClientSession()

    # try cookie
    if os.path.exists(cookiejar):
        session.cookie_jar.load(cookiejar)

    # bad cookie
    if (await expired(session)):
        session = await login(session, username, password)
        session.cookie_jar.save(cookiejar)
    return session



