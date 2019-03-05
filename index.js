const http                = require('http');
const Twitter             = require('twitter-lite');
const {RateLimiterMemory} = require('rate-limiter-flexible');

const {
          PORT, REFERER, RECIPIENT_ID,
          CONSUMERKEY, CONSUMERSECRET,
          TOKENKEY, TOKENSECRET,
          REDIRECT, MAX_BASE64_LENGTH
      } = process.env;

const FORM_URLENCODED = 'application/x-www-form-urlencoded';

function handlePOST(req) {
    return new Promise((resolve, reject) => {
        const size          = parseFloat(req.headers['content-length']);
        const MAX_SIZE      = parseFloat(MAX_BASE64_LENGTH);
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
                !isWithinSize && ('- content being over max length ' + req.headers['content-length'] + '/' + MAX_BASE64_LENGTH)
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
        .then(() => console.log(`DM sent:\n${text}`))
        .catch(e => console.error(e));
}

function respondWithHTML(res, message = "Thank you!") {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
<html style="text-align:center; line-height: 100vh; font-family: sans-serif">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="5;url=${REDIRECT}"/>
<link rel="icon" href="data:,">${message}</html>
`);
}

function permitRequest(req, res) {
    const {headers, method} = req;

    if (method === 'POST' && headers.referer.indexOf(REFERER) === 0) {
        console.log(`Received from web form!`);
        handlePOST(req)
            .then(getJSONFromFormBody)
            .then(data => sendDM(data.msg))
            .catch(e => console.error(e))
            .finally(() => respondWithHTML(res));
    } else {
        console.log('Req did not pass verification checks!');
        respondWithHTML(res, `Please send your message via the form at <a href="${REDIRECT}">${REDIRECT}</a>`);
    }
}

function denyRequest(req, res) {
    respondWithHTML(res, 'You have tried to make too many requests too soon!');
}

const rateLimiter = new RateLimiterMemory({
    points:   3,
    duration: 30
});

http.createServer((req, res) => {
    const {connection} = req;

    rateLimiter.consume(connection.remoteAddress, 1)
        .then(() => permitRequest(req, res))
        .catch(() => denyRequest(req, res));
}).listen(PORT);
