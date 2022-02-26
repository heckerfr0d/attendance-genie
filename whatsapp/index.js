const qrcode = require('qrcode-terminal');
const { Client, MessageMedia} = require('whatsapp-web.js');
var app = require("express")();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
const { Pool } = require('pg');
const regexp = /(@\d{12} )?(.*):(.*)/;
const fs = require('fs');
const ytdl = require('ytdl-core');
const { endianness } = require('os');
const ffmpeg = require('fluent-ffmpeg');
const { GroupChat } = require('whatsapp-web.js/src/structures');
const { title } = require('process');
const spdl = require('spdl-core').default;



var dburl = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString: dburl,
    ssl: { rejectUnauthorized: false }
  });

app.use(bodyParser.json())
app.post('/', function (req, res) {
    var list = req.body.content;
    for (var i in list) {
            client.sendMessage(list[i][0] + "@c.us", list[i][1]);
    }
    res.send("Message sent");
});
http.listen(3000, function () {
    console.log('listening...');
});

// // Path where the session data will be stored
// const SESSION_FILE_PATH = './session.json';

// // Load the session data if it has been previously saved
// let sessionCfg;
// if(fs.existsSync(SESSION_FILE_PATH)) {
//     sessionCfg = require(SESSION_FILE_PATH);
// }

// Use the saved values
const client = new Client({
    puppeteer: { headless: false }
    // clientId: 'remote'
});

// Save session values to the file upon successful auth
client.on('authenticated', () => {
    console.log('youre in');
    // sessionData = session;
    // fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
    //     if (err) {
    //         console.error(err);
    //     }
    // });
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async msg => {
    const chat = await msg.getChat();
    if (msg.hasMedia && !msg.isStatus ) {
        // const chat = await msg.getChat();
        if (chat.isGroup && !(msg.mentionedIds.includes('971507574782@c.us')))
            return;
        const media = await msg.downloadMedia();
        if(media.mimetype && (media.mimetype.includes("image") || media.mimetype.includes("video"))){   //Make a sticker only if its an image/vid
            
        const result = msg.body.match(regexp);
        const author = result ? result[3] ? result[2] : result[1] : "🧞️";
        const name = result ? result[3] ? result[3] : result[2] : "annen";
        client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });
    
        if (msg.from != "918592988798@c.us")
            client.sendMessage("918592988798@c.us", media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });

        }
    }
    else if(!chat.isGroup && ytdl.validateURL(msg.body)){
        const sndmedia = (stream) =>{
            let id = ytdl.getURLVideoID(msg.body)
            let info = ytdl.getInfo(msg.body).then((v)=>{
                let fname = v.videoDetails.title.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
                        ffmpeg(stream)
                    .audioBitrate(128)
                    .save(`./${fname}.mp3`)
                    .on('end', () => {
                        console.log(`\ndone`);
                        let media = MessageMedia.fromFilePath(`./${fname}.mp3`)
                        client.sendMessage(msg.from,media,{sendMediaAsDocument: true})   //CHANGE NUMBER HERE
                        fs.unlink(`./${fname}.mp3`, (err) => {
                            if (err) {
                            console.error(err)
                            return
                            }})
                    }); 
                })
              
        }
        // msg.reply("Started downloading the song. Check after some time ;)")
        let id = ytdl.getURLVideoID(msg.body)
        let info = await ytdl.getInfo(id);
            let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            let flag = false
            let tag;
            for(i in audioFormats){
                if(parseInt(audioFormats[i].contentLength) <= 98000000){
                    tag = audioFormats[i].itag;
                    flag = true
                    break;
                }
            }
            if(!flag){
                msg.reply("File toooo large :(")
            }
            else{
                let stream = ytdl(id, {
                    quality: tag,
                  });
        
                if(stream){
                    sndmedia(stream)
                }
                else{
                    msg.reply("Sorry master. I am busy doing dishes :( Please try again after some time.")
                }
            }
            
    }
    else if (msg.hasMedia && msg.hasQuotedMsg && msg.mentionedIds.includes('971507574782@c.us')) {
        const quotedMsg = await msg.getQuotedMessage();
        const media = await quotedMsg.downloadMedia();
        if(media.mimetype && (media.mimetype.includes("image") || media.mimetype.includes("video"))){       //Make a sticker only if its an image
            const result = msg.body.match(regexp);
            const author = result ? result[2] : "🧞️";
            const name = result ? result[3] : "annen";
            client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });
            if (msg.from != "918592988798@c.us")
                client.sendMessage("918592988798@c.us", media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });
    
        }
    }

    else if (msg.hasQuotedMsg && msg.body.endsWith("*")) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.fromMe){
            if (quotedMsg.body.startsWith("Marked ")){
                let coursename = quotedMsg.body.slice(7);
                let nickname = msg.body.slice(0, -1);
                pool.connect(function(err, client, done) {
                    client.query("UPDATE courses SET course=$1 WHERE course=$2", [nickname, coursename], function(err, result) {
                    });
                    done();
                });
                await msg.reply("Ok sir ;)");
            }
            else if (quotedMsg.body.startsWith("Failed to mark ")) {
                let coursename = quotedMsg.body.slice(15);
                let nickname = msg.body.slice(0, -1);
                pool.connect(function(err, client, done) {
                    client.query("UPDATE courses SET course=$1 WHERE course=$2", [nickname, coursename], function(err, result) {
                    });
                    done();
                });
                await msg.reply("Ok sir ;)");
            }
            else if (quotedMsg.body.startsWith("Join ")) {
                let coursename = quotedMsg.body.slice(5, quotedMsg.body.indexOf('https')-1);
                let nickname = msg.body.slice(0, -1);
                pool.connect(function(err, client, done) {
                    client.query("UPDATE courses SET course=$1 WHERE course=$2", [nickname, coursename], function(err, result) {
                    });
                    done();
                });
                await msg.reply("Ok sir ;)");
            }
        }
    }
    else if(msg.body.includes("-help")){
        let helptext = `Know what you wish for:
        \n1. Send an image and I shall make a sticker for you with lub♥️ (specify author:stickername in the image caption to make the sticker with that data)
        \n2. Send a youtube link and I shall send you the converted audio.
        \n3. Send me a spotify link and I shall send you a super HQ audio.
        \n4. Send me a message in the format "-c <number>" and I shall send you a vcard, so you dont have to save the number ;)
        \n5. Add me to a group, make me an admin and send a message to the group in the format "-a <number>" to add the number to the group.
        \n6. Have suggestions or complaints? Contact my daddy by sending a message in the format "-daddy <message>" Daddy will get back to you. Please dont throw me under the bus tho😢
        `
        await msg.reply(helptext)
    }
    else if(msg.body.startsWith("-c")){
        let num = msg.body.slice(3,)
        num = num.replace(/\s/g, '')
        if (num.length< 10){
            await msg.reply("I've seen a lot of numbers 😉, but not one like this. weird. Did someone trick you?")
        }
        else if(num.length == 10){
            num = "91"+num
            client.getContactById(num + '@c.us').then(val=>{
                msg.reply(val)
            })
            
        }
        else{
            client.getContactById(num + '@c.us').then(val=>
                msg.reply(val)
            )
            
        }
    }

    else if(chat.isGroup && msg.body.startsWith('-a')){
        let num = msg.body.slice(3,)
        num = num.replace(/\s/g, '')
        
        if (num.length< 10){
            await msg.reply("I've seen a lot of numbers (wink), but not one like this. weird.")
        }
        else if(num.length == 10){
            num = "91"+num
            msg.reply("Adding "+num)
            grp = new GroupChat(client,chat)
            grp.addParticipants([num+'@c.us'])
            
        }
        else{
            msg.reply("Adding "+num)
            grp = new GroupChat(client,chat)
            grp.addParticipants([num+'@c.us'])
            
        }
    }
    else if(!chat.isGroup && spdl.validateURL(msg.body)){
        // await msg.reply("Downloading the file.. Check after some time ;)")
        await spdl.getInfo(msg.body).then(infos => {
            spdl(infos.url).then(stream => {
                let filename = infos.title.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
                stream.on('end', () => {
                    // msg.reply("Sending..");
                client.sendMessage(msg.from,MessageMedia.fromFilePath(`./${filename}.mp3`),{sendMediaAsDocument: true})
                .then(() => fs.unlink(`./${filename}.mp3`, (err) => {
                    if (err) {
                      console.error(err)
                      return
                    }}) );
                
            });
                stream.pipe(fs.createWriteStream(`${filename}.mp3`));
            });
        });
    }
    // If the chat is a group, send
    else if(chat.isGroup && msg.hasQuotedMsg && msg.mentionedIds.includes('971507574782@c.us')) {
        let qmsg = await msg.getQuotedMessage()
        if(spdl.validateURL(qmsg.body)){
            // await msg.reply("Downloading the file.. Check after some time ;)")
            await spdl.getInfo(qmsg.body).then(infos => {
                spdl(infos.url).then(stream => {
                    let filename = infos.title.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
                    stream.on('end', () => {
                        // msg.reply("Sending..");
                    client.sendMessage(msg.from,MessageMedia.fromFilePath(`./${filename}.mp3`),{sendMediaAsDocument: true})
                    .then(() => fs.unlink(`./${filename}.mp3`, (err) => {
                        if (err) {
                        console.error(err)
                        return
                        }}) );
                    
                });
                    stream.pipe(fs.createWriteStream(`${filename}.mp3`));
                });
            });
        }
        else if(ytdl.validateURL(qmsg.body)){
            const sndmedia = (stream) =>{
                let id = ytdl.getURLVideoID(qmsg.body)
                let info = ytdl.getInfo(qmsg.body).then((v)=>{
                    let fname = v.videoDetails.title.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
                            ffmpeg(stream)
                        .audioBitrate(128)
                        .save(`./${fname}.mp3`)
                        .on('end', () => {
                            console.log(`\ndone`);
                            let media = MessageMedia.fromFilePath(`./${fname}.mp3`)
                            client.sendMessage(msg.from,media,{sendMediaAsDocument: true})   //CHANGE NUMBER HERE
                            fs.unlink(`./${fname}.mp3`, (err) => {
                                if (err) {
                                console.error(err)
                                return
                                }})
                        }); 
                    })
                  
            }
            // msg.reply("Started downloading the song. Check after some time ;)")
            let id = ytdl.getURLVideoID(qmsg.body)
            let info = await ytdl.getInfo(id);
            let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            let flag = false
            let tag;
            for(i in audioFormats){
                if(parseInt(audioFormats[i].contentLength) <= 98000000){
                    console.log(audioFormats[i].itag)
                    tag = audioFormats[i].itag;
                    flag = true
                    break;
                }
            }
            if(!flag){
                msg.reply("File toooo large :(")
            }
            else{
                let stream = ytdl(id, {
                    quality: tag,
                  });
        
                if(stream){
                    sndmedia(stream)
                }
                else{
                    msg.reply("Sorry master. I am busy doing dishes :( Please try again after some time.")
                }
            }
            
        }
        else{
            msg.reply("Idk what to do with this info :')")
        }
    }

    else if(msg.body.startsWith("-daddy")){
        await msg.reply("Calling daddy..")
        await client.sendMessage("918592988798@c.us",msg.body.slice(7,))
        await msg.reply("Daddy has noted.")
    }
});

client.initialize();

