
# eduserver-attendance-marker

A simple python script to automate attendance marking on nitc eduserver.

## Requirements

1. Python 3
2. Mechanize

## Installation

1. [Python3](https://www.python.org/downloads/)
2. Mechanize : `pip3 install mechanize`

## Usage

1. Solo: Enter your eduserver login details in `attendance-solo.py`, execute using `python3 attendance-solo.py` and, if you're doing it on a cloud server, never worry about being excused ever again. :smirk:
2. Batch: If you're the benevolent chunk who selflessly volunteered to host the script on your server or physical machine for all your friends 😜, fill in their login details as a list in `attendance-batch.py` and execute as mentioned.

**Note:** You have to execute it before the 1st class of the day starts (can be the previous night) for it to work.

## Disclaimer

This script checks for attendance slots every minute in the specified intervals. Since this is kinda wasteful, any idea to improve on this algorithm is welcome. Also, use at your own risk etc.
For any contribution to this project, open an issue or submit a PR or directly contact me :innocent:
