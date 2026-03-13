# Playtime Limit — Minecraft Bedrock Addon

🇩🇪 [Deutsche Version](README.de.md)

> NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

Limit your players' daily playtime on Bedrock servers and worlds — automatically, fairly, and easy to set up.

---

## Who is this for?

**👨‍👩‍👧 Parents**
Your child plays Minecraft longer than you'd like? This addon lets you set a daily time limit — after that, they're automatically kicked from the world. No technical knowledge required, set it up once and you're done. The limit resets automatically every day at midnight.

**🎮 Server owners**
Friends or players farming your server empty out of boredom? With Playtime Limit you control how long anyone can be online per day. You keep full control.

---

## Features

- ⏱ Configurable daily limit per player
- 🔔 Warning message before the limit is reached
- 🌙 Automatic reset at midnight — works correctly for players online over midnight
- 💾 Persistent data across server restarts
- 🛠 Configure via file, in-game menu, or commands
- 👁 Respawn message showing remaining time (can be disabled per player)
- 👮 Flexible admin management: operators or specific player names

---

## Installation

### Singleplayer / Realm / own world (Windows)

1. Download the `.mcaddon` file from the [Releases](../../releases) page
2. Double-click the file — Minecraft will import it automatically
3. Activate the behavior pack in your world settings

### Dedicated Server (BDS)

1. Download the `.mcaddon` and unzip it as `.zip`
2. Copy the `playtime-limit-BP` folder into `behavior_packs/` on your server
3. Add the pack to `worlds/<worldname>/world_behavior_packs.json`:
```json
[
  {
    "pack_id": "19518de4-6a60-41ff-b819-f9f6979d0eee",
    "version": [1, 0, 0]
  }
]
```
4. Restart the server

---

## Adjusting settings

There are three ways to configure the addon — from easy to technical:

### 🎮 In-game menu (recommended)
```
/playtimelimit:menu
```
Opens a graphical menu directly in-game. Admins can manage the limit, warning time, and admin list without leaving the world.

![Menu](assets/Menu.gif)

### 💬 Commands
Quick adjustments directly via chat:
```
/playtimelimit:set 90        → Set daily limit to 90 minutes
/playtimelimit:warning 5     → Warn 5 minutes before the limit
/playtimelimit:status        → Show your own remaining time
/playtimelimit:respawnmsg false  → Disable the respawn message
```

| Command | Permission | Description |
|---|---|---|
| `/playtimelimit:status` | Everyone | Shows remaining time today |
| `/playtimelimit:menu` | Everyone | Opens the menu (admin features require permission) |
| `/playtimelimit:set <minutes>` | Operators | Sets the daily limit |
| `/playtimelimit:warning <minutes>` | Operators | Sets the warning time |
| `/playtimelimit:respawnmsg <true\|false>` | Everyone | Toggles the respawn message |

### 📄 Config file
The file `scripts/playtimeConfig.js` is located in the pack folder:

**Windows (singleplayer):**
```
%APPDATA%\Minecraft Bedrock\Users\Shared\games\com.mojang\behavior_packs\PlaytimeLi\scripts\playtimeConfig.js
```
> **Important:** After every change to the file, update `lastUpdate` to the current ISO timestamp (e.g. `"2026-03-14T10:00:00.000Z"`). This is how the addon knows the file is newer than any saved in-game settings.

**Dedicated server:**
```
behavior_packs/playtime-limit-BP/scripts/playtimeConfig.js
```

```js
export const playtimeConfig = {
  LimitMinutes: 120,            // Daily limit in minutes (default: 2 hours)
  allowIngameChange: true,      // Allow admins to change settings in-game
  warningMinutesBeforeEnd: 10,  // Warn X minutes before the limit
  lastUpdate: "2026-03-13T00:00:00.000Z", // Update this whenever you change the config!
  admins: [],                   // Empty = operators only, or: ["Player1", "Player2"]
  debug: false,                 // Set to true only for troubleshooting
};
```

> **Important:** After every change to the file, update `lastUpdate` to the current ISO timestamp (e.g. `"2026-03-14T10:00:00.000Z"`). This is how the addon knows the file is newer than any saved in-game settings.

---

## How config priority works

On startup, the addon decides which settings apply:

1. If `enabled: false` in the file → file always wins
2. No saved in-game settings yet → file is used as initial config
3. File's `lastUpdate` is newer → file overrides saved settings
4. Otherwise → saved in-game settings are kept

---

## Requirements

- Minecraft Bedrock Edition **1.21+**
- No experimental settings required

---

## License

This addon is free to use and redistribute. You may modify it, but please credit the original author.

This is not an official Minecraft product and is not affiliated with Mojang or Microsoft.
