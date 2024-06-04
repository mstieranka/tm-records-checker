# Trackmania Records Checker

Use this tool to get notified (via ntfy.sh, by getting a message in the standard terminal output or in a management UI) if one of your Trackmania (2020) maps uploaded on Trackmania Exchange gets a new top 10 record.

You will need `data/config.json`:

```json
{
  "baseUrl": "https://tm.stieranka.dev",
  "api": {
    "tmx": {
      "searchParams": {
        "userId": 12345
      }
    },
    "tmBasic": {
      "email": "user@example.com",
      "password": "hunter2"
    },
    "tmOauth": {
      "clientId": "a0ad3d2709e506bbb2f9",
      "clientSecret": "a051db261d56b086e98b272119f481cf24fe73f9"
    },
    "userAgent": "tm-records-checker (runs periodically) / https://github.com/mstieranka/tm-records-checker / user@example.com"
  },
  "githubAuth": {
    "clientId": "a0ad3d2709e506bbb2f9",
    "clientSecret": "a051db261d56b086e98b272119f481cf24fe73f9",
    "allowedUsers": ["your_github_username_here"]
  },
  "notifications": {
    "ntfy": {
      "baseUrl": "https://ntfy.sh",
      "topic": "some-topic-name",
      "lengthLimit": 4096
    }
  }
}
```

The `api` section contains parameters for the APIs that are used to access the relevant data. `tmx` contains information related to Trackmania Exchange, specifically the ID of the user whose maps are to be checked, `tmBasic` contains your Ubisoft login information (used to access map records) and `tmOAuth` requires a special client ID and secret.

These are needed in order to show display names (e.g. `playerTM` instead of `bf64ca65-f1da-4662-b827-e84fb59b821f`), because Nadeo removed the endpoint from their public API (wtf?). You can learn more about how to get them [here](https://webservices.openplanet.dev/oauth/auth#machine-to-machine-flow) and in the section below.

Every option except for `notifications.ntfy` is required.

Create a database using `bun db:migrate`, build using `bun build` and run using `bun start`. This worked with `Bun 1.0.30` for me.

I'm using this for my purposes only so the implementation is a bit lacking, but if you do make a PR, I may look at it.
