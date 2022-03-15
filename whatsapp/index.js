const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia} = require('whatsapp-web.js');
var app = require("express")();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
const regexp = /(@\d{12} )?(.*):(.*)/;
const fs = require('fs');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ffmpeg = require('fluent-ffmpeg');
const { GroupChat } = require('whatsapp-web.js/src/structures');


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
    else if (msg.hasQuotedMsg && (await msg.getQuotedMessage()).hasMedia && msg.mentionedIds.includes('971507574782@c.us')) {
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

    else if(msg.body.includes("-help")){
        let helptext = `Know what you wish for:
        \n1. Send an image/video/gif and I'll make a sticker for you with lub♥️ (specify author:stickername in the image caption to make the sticker with that data)
        \n2. Send a youtube link and I'll send you the converted audio.
        \n3. Send me a message in the format -p <query> and I'll scour youtube and send you the audio of the first result.
        \n4. Send me a message in the format -d <query> and I'll scour on youtube and send you the first result audio as a document.
        \n5. Send me a message in the format "-c <number>" and I shall send you a vcard, so you dont have to save the number ;)
        \n6. Add me to a group, make me an admin and send a message to the group in the format "-a <number>" to add the number to the group.
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
    else if (msg.body.startsWith("-p") || msg.body.startsWith("-d")) {
        let query = msg.body.slice(3,);
        const f1 = await ytsr.getFilters(query);
        const f2 = f1.get('Type').get('Video');
        const searchResults = await ytsr(f2.url);
        let target = searchResults.items[0].url;
        const sndmedia = (stream) =>{
            let id = ytdl.getURLVideoID(target)
            let info = ytdl.getInfo(target).then((v)=>{
                let fname = v.videoDetails.title.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
                        ffmpeg(stream)
                    .audioBitrate(128)
                    .save(`./${fname}.mp3`)
                    .on('end', () => {
                        console.log(`\ndone`);
                        let media = MessageMedia.fromFilePath(`./${fname}.mp3`)
                        if (msg.body.startsWith('-d'))
                            client.sendMessage(msg.from,media,{sendMediaAsDocument: true})   //CHANGE NUMBER HERE
                        else
                            client.sendMessage(msg.from,media,{sendMediaAsAudio: true})   //CHANGE NUMBER HERE
                        fs.unlink(`./${fname}.mp3`, (err) => {
                            if (err) {
                            console.error(err)
                            return
                            }})
                    }); 
                })
              
        }
        // msg.reply("Started downloading the song. Check after some time ;)")
        let id = ytdl.getURLVideoID(target)
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
    // If the chat is a group, send
    else if(chat.isGroup && msg.hasQuotedMsg && msg.mentionedIds.includes('971507574782@c.us')) {
        let qmsg = await msg.getQuotedMessage()
        if(ytdl.validateURL(qmsg.body)){
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

});

client.initialize();

