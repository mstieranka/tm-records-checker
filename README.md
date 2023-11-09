# Trackmania Records Checker

Use this tool to get notified (via Pushbullet or simply by getting a message in the standard terminal output) if one of your Trackmania (2020) maps uploaded on Trackmania Exchange gets a new top 10 record.

You will need `config.json` in the root repo folder:

```json
{
  "tmxSearchOptions": {
    "tmxUserId": 12345
  },
  "pushbulletAuthKey": "o.0a1b2c3d4e5f6g7h8i9x",
  "tmAuth": {
    "email": "user@example.com",
    "password": "hunter2"
  },
  "userAgent": "tm-records-checker (runs every 24h) / https://github.com/mstieranka/tm-records-checker",
  "tmOAuth": {
    "clientId": "a0ad3d2709e506bbb2f9",
    "clientSecret": "a051db261d56b086e98b272119f481cf24fe73f9"
  }
}
```

`tmxUserId` is your user ID on TMX. This is shown as "ID" on your TMX profile page.
`tmAuth` is the email and password to your Ubisoft account (needed for authentication to the Trackmania API).

If you want display names to be shown (e.g. `playerTM` instead of `bf64ca65-f1da-4662-b827-e84fb59b821f`), you'll need to provide your own OAuth2 client ID and client secret to access the Trackmania OAuth API (because Nadeo removed the endpoint from their public API - wtf?). You can learn more about how to get that [here](https://webservices.openplanet.dev/oauth/auth#machine-to-machine-flow) and in the section below.

`tmxSearchOptions`, and `tmAuth` are mandatory, `pushbulletAuthKey`, `tmOAuth` and `userAgent` are optional (there's a default user agent and without Pushbullet, output will only be printed to stdout).

Run using `bun start`. This worked with `Bun 1.0.6` for me.

If using `docker-compose.yml`, make sure to create `records.json` beforehand, otherwise the container creation will throw an error.

I'm using this for my purposes only so the implementation is a bit lacking, but if you do make a PR, I may look at it.
