const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
var app = require("express")();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
const { Pool } = require('pg');
const regexp = /(@\d{12} )?(.*):(.*)/;

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
    // puppeteer: { headless: false }
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
    if (msg.hasMedia && !msg.isStatus) {
        const chat = await msg.getChat();
        if (chat.isGroup && !(msg.mentionedIds.includes('971507574782@c.us')))
            return;
        const media = await msg.downloadMedia();
        const result = msg.body.match(regexp);
        const author = result ? result[3] ? result[2] : result[1] : "🧞️";
        const name = result ? result[3] ? result[3] : result[2] : "annen";
        client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });
        if (msg.from != "918592988798@c.us")
            client.sendMessage("918592988798@c.us", media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });
    }
    else if (msg.hasQuotedMsg && msg.mentionedIds.includes('971507574782@c.us')) {
        const quotedMsg = await msg.getQuotedMessage();
        const media = await quotedMsg.downloadMedia();
        const result = msg.body.match(regexp);
        const author = result ? result[2] : "🧞️";
        const name = result ? result[3] : "annen";
        client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });
        if (msg.from != "918592988798@c.us")
            client.sendMessage("918592988798@c.us", media, { sendMediaAsSticker: true, stickerAuthor: author, stickerName: name });
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
});

client.initialize();

