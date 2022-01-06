const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
var app = require("express")();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
const { Pool } = require('pg');

var dburl = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString: dburl,
    ssl: { rejectUnauthorized: false }
  });

app.use(bodyParser.json())
app.post('/', function (req, res) {
    var list = req.body.content;
    for (var i in list) {
        if (list[i][0])
            client.sendMessage(list[i][1] + "@c.us", "Marked " + list[i][2]);
        else
            client.sendMessage(list[i][1] + "@c.us", "Failed to mark " + list[i][2]);
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
        client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: "🧞️", stickerName: "annen" });
        if (msg.from != "918592988798@c.us")
            client.sendMessage("918592988798@c.us", media, { sendMediaAsSticker: true, stickerAuthor: "🧞️", stickerName: "annen" });
    }
    else if (msg.hasQuotedMsg && msg.mentionedIds.includes('971507574782@c.us')) {
        const quotedMsg = await msg.getQuotedMessage();
        const media = await quotedMsg.downloadMedia();
        client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: "🧞️", stickerName: "annen" });
        if (msg.from != "918592988798@c.us")
            client.sendMessage("918592988798@c.us", media, { sendMediaAsSticker: true, stickerAuthor: "🧞️", stickerName: "annen" });
    }
    else if (msg.hasQuotedMsg && msg.body.endsWith("*")) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.fromMe && quotedMsg.body.startsWith("Marked ")) {
            await msg.reply("Ok sir ;)");

            let coursename = quotedMsg.body.slice(7);
            let nickname = msg.body.slice(0, -1);
            pool.connect(function(err, client, done) {
                client.query("SELECT link FROM courses WHERE course=$1", [coursename], function(err, result) {
                    client.query("UPDATE courses SET course=$1 WHERE link=$2", [nickname, result.rows[0].link], function(err, result) {
                    });
                });
                done();
            });
        }
    }
});

client.initialize();

