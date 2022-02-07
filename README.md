
# Attendance Genie

Sick of losing attendance because of poorly scheduled links or eduserver being sluggish?  
Wish you didn't have to worry about those annoying attendance links?  

<img alt="Your wish is our command ;)" src="https://memegenerator.net/img/instances/54975493.jpg" width=400>

Simply provide your eduserver login details at [attendance-genie.herokuapp.com](https://attendance-genie.herokuapp.com) and leave the rest to us ✌️  
Follow [the attendance channel](https://discord.gg/69F4DddEyG) on our discord server to get pinged when your attendance is marked (if you provided the optional discord ID).  
Your discord ID is the 18 digit number you get when you tag yourself in a discord text channel with a `\` preceding the tag.  

**New** - You can now provide your WhatsApp number to get notified on WhatsApp when your attendance is marked.  
**Newer** - Genie now sends you the link to join class (to ease his conscience :p).  

If, for some obscure reason you don't trust us with your eduserver login details (lol), you can always host the whole thing yourself (it's easy dw :P)  
The Flask frontend is Heroku ready but for the backend you might have to create a postgres database to load user details from. You can also modify the code to do it differently.  
As per the current config, the environment variables that must be set are:  
`WEBHOOK` - The discord webhook URL to send the message to.  
`DATABASE_URL` - The postgres database URL to connect to.  
`SECRET_KEY` - The top secret key to be used for encrypting the user passwords.  

To start the server that sends WhatsApp notifications, run:

```console
cd whatsapp
npm install
npm start
```

Once everything is sett you can run genie by:

```console
pip3 install -r requirements.txt
python3 mark.py
```

Finding a VPS to host it is something I'll leave to you 😁  

**Smol disclaimer**: Very rarely it can happen that the script runs into some error and fails to mark your attendance... Please be vigilant for at least a week after joining the cult and report any bugs/discrepancies found.  

For contributions/suggestions/complaints of any kind feel free to talk to us on discord or open an issue or submit a PR or even directly contact me :innocent:
