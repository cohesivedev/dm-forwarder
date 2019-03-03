const http    = require('http');
const Twitter = require('twitter-lite');

const {PORT, REFERER, RECEPIENT_ID, CONSUMERKEY, CONSUMERSECRET, TOKENKEY, TOKENSECRET, REDIRECT} = process.env;

const FORM_URLENCODED = 'application/x-www-form-urlencoded';

function handlePOST(req) {
    return new Promise((resolve, reject) => {
        if (req.headers['content-type'] === FORM_URLENCODED) {
            let body = '';

            req.on('data', chunk => (body += chunk.toString()));
            req.on('end', () => resolve(body));
        } else {
            reject('Not form type POST request!');
        }
    });
}

function getJSONFromFormBody(body) {
    const json = {};

    body.split('&').forEach(line => {
        const keyvalue    = line.split('=');
        json[keyvalue[0]] = Buffer.from(decodeURIComponent(keyvalue[1]), 'base64').toString();
    });

    return json;
}

const client = new Twitter({
    consumer_key:        CONSUMERKEY,
    consumer_secret:     CONSUMERSECRET,
    access_token_key:    TOKENKEY,
    access_token_secret: TOKENSECRET
});

function sendDM(text) {
    client.post(
        'direct_messages/events/new',
        {
            "event": {
                "type":           "message_create",
                "message_create": {
                    "target":       {"recipient_id": RECEPIENT_ID},
                    "message_data": {"text": text}
                }
            }
        }
    )
        .then(() => console.log(`DM sent! ${Date.now()}`))
        .catch(e => console.error(e));
}

http.createServer((req, res) => {
    const {headers, method} = req;
    if (method === 'POST' && headers.referer === REFERER) {
        handlePOST(req)
            .then(getJSONFromFormBody)
            .then(data => sendDM(data.msg))
            .catch(e => console.error(e));
    }

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
<html>
    <meta http-equiv="refresh" content="2;url=${REDIRECT}"/>
    <span style="position: absolute; top:50%; left:50%; transform: translate(-50%, -50%);">Thank you.</span>
</html>
`);
}).listen(PORT);
