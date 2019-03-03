const http    = require('http');
const Twitter = require('twitter-lite');

const {
          PORT, REFERER, RECIPIENT_ID,
          CONSUMERKEY, CONSUMERSECRET,
          TOKENKEY, TOKENSECRET,
          REDIRECT, MAX_BASE64_LENGTH
      } = process.env;

const FORM_URLENCODED = 'application/x-www-form-urlencoded';

function handlePOST(req) {
    return new Promise((resolve, reject) => {
        const size = parseFloat(req.headers['content-length']);
        const MAX_SIZE = parseFloat(MAX_BASE64_LENGTH);
        const isWithinSize  = size <= MAX_SIZE;
        const isCorrectType = req.headers['content-type'] === FORM_URLENCODED;

        if (isCorrectType && isWithinSize) {
            let body = '';

            req.on('data', chunk => {
                // max length should be at most 2 * message char count
                if (body.length < MAX_SIZE) {
                    body += chunk.toString();
                }
            });
            req.on('end', () => resolve(body));
        } else {
            reject([
                'Failed to process request due to:',
                !isCorrectType && '- content being incorrectly typed',
                !isWithinSize && ( '- content being over max length ' + req.headers['content-length']+'/'+MAX_BASE64_LENGTH)
            ].filter(Boolean).join('\n'));
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
                    "target":       {"recipient_id": RECIPIENT_ID},
                    "message_data": {"text": text}
                }
            }
        }
    )
        .then(() => console.log(`DM sent:\n\n${text}\n\n`))
        .catch(e => console.error(e));
}

function respondWithThanks(res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
<html>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="2;url=${REDIRECT}"/>
    <link rel="icon" href="data:,">
    <span style="position: absolute; top:50%; left:50%; transform: translate(-50%, -50%);">Thank you!<br>Now returning to <a href="${REFERER}">${REFERER}</a>...</span>
</html>
`);
}

http.createServer((req, res) => {
    const {headers, method} = req;

    if (method === 'POST' && headers.referer.indexOf(REFERER)===0) {
        console.log(`Received from web form!`);
        handlePOST(req)
            .then(getJSONFromFormBody)
            .then(data => sendDM(data.msg))
            .catch(e => console.error(e))
            .finally(() => respondWithThanks(res));
    } else {
        console.log('Req did not pass verification checks!');
        respondWithThanks(res);
    }
}).listen(PORT);
