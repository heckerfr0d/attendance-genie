const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { GroupChat } = require('whatsapp-web.js/src/structures');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const db = require('better-sqlite3')('splitpay.db');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ffmpeg = require('fluent-ffmpeg');
// var app = require("express")();
// var http = require('http').Server(app);
// var bodyParser = require('body-parser');
const regexp = /(@\d{12} )?(.*):(.*)/;


// app.use(bodyParser.json())
// app.post('/', function (req, res) {
//     var list = req.body.content;
//     for (var i in list) {
//             client.sendMessage(list[i][0] + "@c.us", list[i][1]);
//     }
//     res.send("Message sent");
// });
// http.listen(3000, function () {
//     console.log('listening...');
// });


// Use the saved values
const client = new Client({
    // puppeteer: { headless: false }
    // clientId: 'remote'
    authStrategy: new LocalAuth()
});

// Save session values to the file upon successful auth
client.on('authenticated', () => {
    console.log('youre in');
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async msg => {
    const chat = await msg.getChat();
    if (msg.hasMedia && !msg.isStatus) {
        // const chat = await msg.getChat();
        if (chat.isGroup && !(msg.mentionedIds.includes('971507574782@c.us')))
            return;
        const media = await msg.downloadMedia();
        if (media.mimetype && (media.mimetype.includes("image") || media.mimetype.includes("video"))) {   //Make a sticker only if its an image/vid
            const result = msg.body.match(regexp);
            const author = result ? result[3] ? result[2] : result[1] : "🧞️";
            const name = result ? result[3] ? result[3] : result[2] : "annen";
            client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });

            if (msg.from != "918592988798@c.us")
                client.sendMessage("918592988798@c.us", media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });
        }
    }
    else if (!chat.isGroup && ytdl.validateURL(msg.body)) {
        const sndmedia = (stream) => {
            let id = ytdl.getURLVideoID(msg.body);
            let info = ytdl.getInfo(msg.body, { quality: 'highestaudio' }).then((v) => {
                let fname = v.videoDetails.title.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
                ffmpeg(stream)
                    .audioBitrate(v.formats[0].audioBitrate)
                    .save(`./${fname}.mp3`)
                    .on('end', () => {
                        console.log(`\ndone`);
                        let media = MessageMedia.fromFilePath(`./${fname}.mp3`);
                        msg.reply(media, msg.from, { sendMediaAsDocument: true });
                        fs.unlink(`./${fname}.mp3`, (err) => {
                            if (err) {
                                console.error(err);
                                return;
                            }
                        })
                    });
            });

        }
        // msg.reply("Started downloading the song. Check after some time ;)")
        let id = ytdl.getURLVideoID(msg.body);
        let info = await ytdl.getInfo(id, { quality: 'highestaudio' });
        let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        let flag = true;
        let tag;
        // for(i in audioFormats){
        //     if(parseInt(audioFormats[i].contentLength) <= 98000000){
        //         tag = audioFormats[i].itag;
        //         flag = true;
        //         break;
        //     }
        // }
        if (!flag) {
            msg.reply("File toooo large :(");
        }
        else {
            let stream = ytdl(id, {
                quality: 'highestaudio',
            });

            if (stream) {
                sndmedia(stream);
            }
            else {
                msg.reply("Sorry master. I am busy doing dishes :( Please try again after some time.");
            }
        }

    }
    else if (msg.hasQuotedMsg && (await msg.getQuotedMessage()).hasMedia && msg.mentionedIds.includes('971507574782@c.us')) {
        const quotedMsg = await msg.getQuotedMessage();
        const media = await quotedMsg.downloadMedia();
        if (media.mimetype && (media.mimetype.includes("image") || media.mimetype.includes("video"))) {       //Make a sticker only if its an image
            const result = msg.body.match(regexp);
            const author = result ? result[2] : "🧞️";
            const name = result ? result[3] : "annen";
            client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });
            if (msg.from != "918592988798@c.us")
                client.sendMessage("918592988798@c.us", media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });

        }
    }

    else if (msg.body.startsWith(".help")) {
        let helptext = `Know what you wish for:
        \n1. Send an image/video/gif and I'll make a sticker for you with lub♥️ (specify author:stickername in the image caption to make the sticker with that data)
        \n2. Send a youtube link and I'll send you the converted audio.
        \n3. Send me a message in the format .p <query> and I'll scour youtube and send you the audio of the first result.
        \n4. Send me a message in the format .d <query> and I'll scour on youtube and send you the first result audio as a document.
        \n5. Send me a message in the format ".c <number>" and I shall send you a vcard, so you dont have to save the number ;)
        \n6. Add me to a group, make me an admin and send a message to the group in the format ".a <number>" to add the number to the group.
        `
        await msg.reply(helptext);
    }

    else if (msg.body.startsWith(".shelp")) {
        let helptext = `Welcome to SplitPay. I split expense among users in ratio of user asset and suggest a way to redistribute it.
        \n1) .spay to start a session.
        \n2) .asset _amount_ to add principal for each user (to calculate split ratio).
        \n3) .add _amount_ to add on to money spent by user.
        \n4) .status to see summary of money spent.
        \n5) .calc to calculate payments and end the session.
        `
        msg.reply(helptext);
    }

    else if (chat.isGroup && msg.body.startsWith(".spay")) {
        db.prepare("INSERT OR IGNORE INTO groups (group_id) VALUES (?)").run(chat.id.user);
        db.prepare("UPDATE groups SET status = 1 WHERE group_id = ?").run(chat.id.user);
        msg.react("✌️");
    }

    else if (chat.isGroup && msg.body.startsWith(".asset")) {
        let mahney = msg.body.split(" ");
        if (mahney.length < 2)
            return;
        let row = db.prepare("SELECT * FROM groups WHERE group_id = ?").get(chat.id.user);
        if (!row || row.status!=1) {
            msg.reply("No active spay session.\n_Hint_: use ```.spay```");
            return;
        }
        db.prepare("INSERT OR IGNORE INTO users (user_id, group_id) VALUES (?, ?)").run(msg.author.split('@')[0], chat.id.user);
        db.prepare("UPDATE users SET stock = ? WHERE user_id = ? AND group_id = ?").run(parseFloat(mahney[1]), msg.author.split('@')[0], chat.id.user);
        msg.react("🤑️");
    }

    else if (chat.isGroup && msg.body.startsWith(".add")) {
        let mahney = msg.body.split(" ");
        if (mahney.length < 2)
            return;
        let total = 0;
        let row = db.prepare("SELECT * FROM groups WHERE group_id = ?").get(chat.id.user);
        if (!row || row.status!=1) {
            msg.reply("No active spay session.\n_Hint_: use ```.spay```");
            return;
        }
        total = row.total;
        let newb = parseFloat(mahney[1]);
        total += newb;
        row = db.prepare("SELECT * FROM users WHERE user_id = ?").get(msg.author.split('@')[0]);
        if (!row) {
            msg.reply("Stock not set.\n_Hint_: use ```.stock```");
            return;
        }
        newb += row.paid;

        db.prepare("UPDATE users SET paid = ? WHERE user_id = ? AND group_id = ?").run(newb, msg.author.split('@')[0], chat.id.user);
        db.prepare("UPDATE groups SET total = ? WHERE group_id = ? AND status = 1").run(total, chat.id.user);
        msg.react("💸️");
    }

    else if (chat.isGroup && msg.body.startsWith(".status")) {
        let res = '';
        let rows = db.prepare("SELECT user_id, paid FROM users WHERE group_id = ?").all(chat.id.user);
        let mentions = [];
        for(let row of rows) {
            res += `@${row.user_id} : ${row.paid}\n`;
            const cont = await client.getContactById(`${row.user_id}@c.us`);
            mentions.push(cont);
        }
        msg.reply(res, chat.id._serialized, { mentions: mentions });
    }

    else if (chat.isGroup && msg.body.startsWith(".calc")) {
        let stock = {}, paid = {}, balance = {}, total = 0, ts = 0, neg = [], pos = [], res = '', min=['', 10000000];
        let rows = db.prepare("SELECT user_id, stock, paid FROM users WHERE group_id = ?").all(chat.id.user);
        for(let row of rows) {
            total += row.paid;
            ts += row.stock;
            stock[row.user_id] = row.stock;
            paid[row.user_id] = row.paid;
        }
        for (let user_id in stock) {
            balance[user_id] = total*stock[user_id]/ts  - paid[user_id];
            if (balance[user_id] < 0) {
                neg.push([user_id, balance[user_id]]);
                min = min[1] < balance[user_id] ? min : [user_id, balance[user_id]];
            }
            else {
                pos.push([user_id, balance[user_id]]);
            }
        }
        let mentions = [];
        const mc = await client.getContactById(`${min[0]}@c.us`);
        for (let i in pos) {
            res += `@${pos[i][0]} -> @${min[0]}: ${pos[i][1]}\n`;
            const cont = await client.getContactById(`${pos[i][0]}@c.us`);
            mentions.push(cont);
            mentions.push(mc);
        }
        for (let i in neg) {
            if (neg[i][0] != min[0]) {
                res += `@${min[0]} -> @${neg[i][0]} : ${-neg[i][1]}\n`;
                const cont = await client.getContactById(`${neg[i][0]}@c.us`);
                mentions.push(mc);
                mentions.push(cont);
            }
        }
        db.prepare("DELETE FROM users WHERE group_id = ?").run(chat.id.user);
        db.prepare("UPDATE groups SET status = 0 WHERE group_id = ?").run(chat.id.user);
        msg.reply(res, chat.id._serialized, { mentions: mentions });
    }

    else if (msg.body.startsWith(".c")) {
        let num = msg.body.slice(3,);
        num = num.replace(/\s/g, '');
        if (num.length < 10) {
            await msg.reply("I've seen a lot of numbers 😉, but not one like this. weird. Did someone trick you?");
        }
        else if (num.length == 10) {
            num = "91" + num;
            client.getContactById(num + '@c.us').then(val => {
                msg.reply(val);
            });

        }
        else {
            client.getContactById(num + '@c.us').then(val =>
                msg.reply(val)
            );

        }
    }

    else if (chat.isGroup && msg.body.startsWith('.a')) {
        let num = msg.body.slice(3,);
        num = num.replace(/\s/g, '');

        if (num.length < 10) {
            await msg.reply("I've seen a lot of numbers (wink), but not one like this. weird.");
        }
        else if (num.length == 10) {
            num = "91" + num;
            msg.reply("Adding " + num);
            grp = new GroupChat(client, chat);
            grp.addParticipants([num + '@c.us']);

        }
        else {
            if (num[0] == '+')
                num = num.slice(1,);
            msg.reply("Adding " + num);
            grp = new GroupChat(client, chat);
            grp.addParticipants([num + '@c.us']);
        }
    }

    else if (msg.body.startsWith("-")) {
        msg.reply("My prefix is now *.* for your convenience.\n_ex: .help_");
    }

    else if (msg.body.startsWith(".p") || msg.body.startsWith(".d")) {
        let query = msg.body.slice(3,);
        const f1 = await ytsr.getFilters(query);
        const f2 = f1.get('Type').get('Video');
        const searchResults = await ytsr(f2.url);
        let target = searchResults.items[0].url;
        const sndmedia = (stream) => {
            let id = ytdl.getURLVideoID(target)
            let info = ytdl.getInfo(target, { quality: 'highestaudio' }).then((v) => {
                let fname = v.videoDetails.title.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
                ffmpeg(stream)
                    .audioBitrate(v.formats[0].audioBitrate)
                    .save(`./${fname}.mp3`)
                    .on('end', () => {
                        console.log(`\ndone`);
                        let media = MessageMedia.fromFilePath(`./${fname}.mp3`);
                        if (msg.body.startsWith('.d'))
                            msg.reply(media, msg.from, { sendMediaAsDocument: true });
                        else
                            msg.reply(media, msg.from, { sendMediaAsAudio: true });
                        fs.unlink(`./${fname}.mp3`, (err) => {
                            if (err) {
                                console.error(err);
                                return;
                            }
                        })
                    });
            })

        }
        // msg.reply("Started downloading the song. Check after some time ;)")
        let id = ytdl.getURLVideoID(target)
        let info = await ytdl.getInfo(id, { quality: 'highestaudio' });
        let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        let flag = true;
        let tag;
        // for(i in audioFormats){
        //     if(parseInt(audioFormats[i].contentLength) <= 98000000){
        //         console.log(audioFormats[i].itag);
        //         tag = audioFormats[i].itag;
        //         flag = true;
        //         break;
        //     }
        // }
        if (!flag) {
            msg.reply("File toooo large :(");
        }
        else {
            let stream = ytdl(id, {
                quality: 'highestaudio',
            });

            if (stream) {
                sndmedia(stream);
            }
            else {
                msg.reply("Sorry master. I am busy doing dishes :( Please try again after some time.");
            }
        }
    }
    // If the chat is a group, send
    else if (chat.isGroup && msg.hasQuotedMsg && msg.mentionedIds.includes('971507574782@c.us')) {
        let qmsg = await msg.getQuotedMessage();
        if (ytdl.validateURL(qmsg.body)) {
            const sndmedia = (stream) => {
                let id = ytdl.getURLVideoID(qmsg.body);
                let info = ytdl.getInfo(qmsg.body, { quality: 'highestaudio' }).then((v) => {
                    let fname = v.videoDetails.title.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
                    ffmpeg(stream)
                        .audioBitrate(v.formats[0].audioBitrate)
                        .save(`./${fname}.mp3`)
                        .on('end', () => {
                            console.log(`\ndone`);
                            let media = MessageMedia.fromFilePath(`./${fname}.mp3`);
                            msg.reply(media, msg.from, { sendMediaAsDocument: true });
                            fs.unlink(`./${fname}.mp3`, (err) => {
                                if (err) {
                                    console.error(err);
                                    return;
                                }
                            })
                        });
                })

            }
            // msg.reply("Started downloading the song. Check after some time ;)")
            let id = ytdl.getURLVideoID(qmsg.body);
            let info = await ytdl.getInfo(id, { quality: 'highestaudio' });
            let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            let flag = true;
            let tag;
            // for(i in audioFormats){
            //     if(parseInt(audioFormats[i].contentLength) <= 98000000){
            //         console.log(audioFormats[i].itag);
            //         tag = audioFormats[i].itag;
            //         flag = true;
            //         break;
            //     }
            // }
            if (!flag) {
                msg.reply("File toooo large :(");
            }
            else {
                let stream = ytdl(id, {
                    quality: 'highestaudio',
                });

                if (stream) {
                    sndmedia(stream);
                }
                else {
                    msg.reply("Sorry master. I am busy doing dishes :( Please try again after some time.");
                }
            }

        }
        else {
            msg.reply("Idk what to do with this info :')");
        }
    }

});

client.initialize();

