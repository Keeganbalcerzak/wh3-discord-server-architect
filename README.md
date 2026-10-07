# WH3 Discord AI Bot

A small Discord bot (Node.js, discord.js v14) for setting up a **Total War: Warhammer III** community server: casual head-to-head Immortal Empires campaigns, matchmaking, faction talk, rulesets and battle clips.

## Commands

| Command | What it does |
| --- | --- |
| `/ping` | Health check. |
| `/plan-server prompt:<text>` | Sends your description to an LLM via [OpenRouter](https://openrouter.ai) (default model `openai/gpt-oss-20b:free`) and replies with a suggested server layout: roles, categories and channels. Nothing is created. |
| `/build-wh3-server confirm:true` | Creates a ready-made WH3 layout in the current server: roles (moderator, campaign host, experience tiers, timezones, faction fans), categories, text and voice channels, a staff-only category, and pinned starter messages. Only members with **Manage Server** can run it, and it does nothing unless `confirm` is `true`. It's safe to re-run because existing roles and channels with the same name are reused. |

## Setup

1. Install Node.js 18 or newer (the bot uses the built-in `fetch`).
2. Create an application and bot at the [Discord Developer Portal](https://discord.com/developers/applications) and copy the bot token and the application (client) ID.
3. Get an API key from [OpenRouter](https://openrouter.ai/keys).
4. Copy the env template and fill it in:
   ```bash
   cp .env.example .env
   ```
   - `DISCORD_TOKEN`: bot token
   - `CLIENT_ID`: application ID
   - `GUILD_ID`: the server to register slash commands in (commands are registered per guild, so they show up right away)
   - `OPENROUTER_API_KEY`: OpenRouter key
5. Install and run:
   ```bash
   npm install
   node index.js
   ```

## Inviting the bot

Generate an invite URL (OAuth2 URL Generator) with the scopes `bot` and `applications.commands`, and these bot permissions:

- View Channels
- Send Messages
- Read Message History
- Manage Messages (to pin starter messages)
- Manage Channels (to create categories and channels)
- Manage Roles (to create roles and channel permission overwrites)

The bot's role must sit above any roles it needs to manage. No privileged gateway intents are needed; the bot only uses the `Guilds` intent.

## Notes

- Keep `.env` private. It's listed in `.gitignore`.
- The free OpenRouter models are rate-limited. If `/plan-server` fails, check your key and try again later, or change `model` in `askAI()` in `index.js`.
