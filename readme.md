# dm-forwarder

Single endpoint API for forwarding form data as Twitter DMs:
1. HTML form from the `REFERER` URL sends its formData with parameter `msg` as a base64 encoded message
2. `dm-forwarder` receives the request and decodes it to get the message text
3. Then on behalf of the user who has given their keys for the config, it sends this as a DM to the Twitter 
user under `RECIPIENT_ID`
4. Message arrives for the recipient in their Twitter inbox

`dm-forwarder` was primarily built to handle HTML contact form message submissions. 
It is is **rate-limited** to only allow 3 submissions within a 30 second window per IP.

## Setup
 
1. Create a Heroku app
2. Configure Heroku "Config Vars" (environment variables):
    - Twitter API keys and secrets x 4
    - RECIPIENT_ID should be the [Twitter ID](http://gettwitterid.com)
    - REDIRECT should be a URL that end user gets sent back to after submission
    - REFERER restricts where the endpoint can be reached from
    - MAX_BASE64_LENGTH restricts how large a message can be before it gets rejected
3. Either manually deploy or automatically deployed when new commits arrive into the codebase.
