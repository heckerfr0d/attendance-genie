import re
import aiohttp
import os

findt = re.compile(r'<input type="hidden" name="logintoken" value="(\w{32})">')

async def login(session, username, password):
    async with session.get("https://eduserver.nitc.ac.in/login/index.php") as resp:
        r = await resp.text()

    # find login token
    token = findt.search(r).group(1)
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
headers = {
    # default headers
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
}
async def get_session(username, password):
    cookiejar = os.path.join("cookies", username)
    timeout = aiohttp.ClientTimeout(total=None)
    session = aiohttp.ClientSession(headers=headers, timeout=timeout)

    # try cookie
    if os.path.exists(cookiejar):
        session.cookie_jar.load(cookiejar)

    # bad cookie
    if (await expired(session)):
        session = await login(session, username, password)
        session.cookie_jar.save(cookiejar)
    return session
