# Changelog

All notable changes to this project will be documented here.

## [1.0.0] - 2026-03-13

### Initial Release

- Daily playtime limit with automatic kick
- Configurable limit, warning time and admin list via `playtimeConfig.js`
- In-game admin menu (`/playtimelimit:menu`)
- Commands: `status`, `set`, `warning`, `respawnmsg`
- Persistent player data and config via DynamicProperties
- Persistent `knownPlayers` list for admin menu
- Midnight reset — works correctly for players online over midnight
- Per-player respawn message toggle
- Config priority system: file vs. saved world config via `lastUpdate` timestamp
- Debug logging via `debug: true` in config
