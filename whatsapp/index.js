const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
var app = require("express")();
var http = require('http').Server(app);
var bodyParser = require('body-parser');


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


client.initialize();

