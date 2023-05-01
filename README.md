# Trackmania Records Checker

Use this tool to get notified (via PushBullet or simply by getting a message in the standard terminal output) if one of your Trackmania (2020) maps uploaded on Trackmania Exchange gets a new top 10 record.

You will need `config.json` in the root repo folder:

```json
{
  "tmxSearchOptions": {
    "tmxUsername": "user_tmx"
  },
  "pushbulletAuthKey": "o.0a1b2c3d4e5f6g7h8i9x",
  "tmAuth": {
    "email": "user@example.com",
    "password": "hunter2"
  }
}
```

Keep in mind `tmxUsername` is your username on TMX, not in-game. `tmAuth` is the email and password to your Ubisoft account (needed for authentication to the Trackmania API).

`tmxSearchOptions` and `tmAuth` are mandatory, `pushbulletAuthKey` is optional (if not provided, messages will only be sent to stdout).

Build using `npm run build`, run using `npm start`.

I'm using this for my purposes only so the implementation is a bit lacking, but if you do make a PR, I may look at it.
