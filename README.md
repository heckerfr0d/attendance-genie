
# Attendance Genie

Sick of losing attendance because of poorly scheduled links or eduserver being sluggish?  
Wish you didn't have to worry about those annoying attendance links?  

<img alt="Your wish is our command ;)" src="https://memegenerator.net/img/instances/54975493.jpg" width=400>

Simply provide your eduserver login details at [attendance-genie.herokuapp.com](https://attendance-genie.herokuapp.com) and leave the rest to us ✌️  
Follow [our attendance channel](https://discord.gg/xkQddAEECx) on discord to get pinged when your attendance is marked (if you provided the optional discord ID).  
Your discord ID is the 18 digit number you get when you tag yourself in a discord text channel with a `\` preceding the tag.  

If, for some obscure reason you don't trust us with your eduserver login details (lol), you can always host the whole thing yourself (it's easy dw :P)  
The flask app is already heroku ready and for the marking part all you have to do is run:

```bash
pip3 install -r requirements.txt
python3 mark.py
```

Finding a VPS to host it is something I'll leave to you 😁  

**Smol disclaimer**: Very rarely it can happen that the script runs into some error and fails to mark your attendance... Please be vigilant for at least a week after joining the club and report any bugs/discrepancies found.  

For contributions of any kind feel free to open an issue or submit a PR or even directly contact me :innocent:
