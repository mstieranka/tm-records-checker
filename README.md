# Trackmania Records Checker

Use this tool to get notified (via ntfy.sh, by getting a message in the standard terminal output or in a management UI) if one of your Trackmania (2020) maps uploaded on Trackmania Exchange gets a new top 10 record.

> [!NOTE]
> I'm using this for my purposes only so the implementation is a bit lacking. If you make a PR, I may look at it, but functionality of this app is not guaranteed and neither is ongoing development. Thank you for understanding.

## Getting started

First, pull/download this repository. Then create a `data/` folder inside (this is where the config and database are stored).

Inside this `data/` folder, create a `config.json` file. It looks something like this:

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

Config options:
* `baseUrl` *[required]* - the URL for the application, this is used in push notifications and the login process
* `api` *[required]* - parameters for the APIs that are used to access the relevant data
  *  `tmx` *[required]* - contains information related to Trackmania Exchange, specifically the ID of the user whose maps are to be checked
  *  `tmBasic` *[required]* - contains your Ubisoft login information (used to access map records)
  *  `tmOAuth` *[required]* - requires a special client ID and secret; it's needed in order to show display names (e.g. `playerTM` instead of `bf64ca65-f1da-4662-b827-e84fb59b821f`), because Nadeo removed the endpoint from their public API (wtf?). You can learn more about how to get the ID and secret [here](https://webservices.openplanet.dev/oauth/auth#machine-to-machine-flow).
* `githubAuth` *[required]* - this app uses the GitHub OAuth API for logging in, so you'll need a GitHub account and [an OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) (use `{baseUrl}/auth/callback` as the callback URL)
  * `clientId`, `clientConfig` *[required]* - client ID and secret for the OAuth app
  * `allowedUsers` *[required]* - the app only allows access to the people in this list, so put your or your friends' usernames here 
* `notifications` - only [ntfy](https://ntfy.sh) is supported currently. Just create a topic with some long and random name (these are unauthenticated, so it's better to be secure) and then set that as the `topic`.

To run the app, create a database using `bun db:migrate`, build using `bun build` and run using `bun start`. This worked with `Bun 1.0.30` for me. Alternatively, there's a Docker Compose config in this repo, so `docker compose up -d` should work.
