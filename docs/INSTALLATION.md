# Installation

## Prerequisites

- Windows machine with the DayZ server installed.
- [DayZ Tools](https://store.steampowered.com/app/830640/DayZ_Tools/) (free, on Steam) for building the PBO.
- Network access from the server to the Takaro API (`https://api.takaro.io` by default).
- A Takaro account with a **registration token** for the server you want to register, OR an **identity token** + **gameServerId** if you've already registered the server through another mechanism.

## 1. Build the PBO

From a PowerShell prompt in the repo root:

```powershell
pwsh scripts/build.ps1
```

The script:
1. Stages `src/takaro_integration/` to `%TEMP%\TakaroIntegration_build\TakaroIntegration` (DayZ Tools cannot read WSL UNC paths).
2. Calls `AddonBuilder.exe` to produce `@TakaroIntegration/Addons/TakaroIntegration.pbo`.
3. Optionally signs it if you pass `-Sign keyPath\my.biprivatekey`.

If `AddonBuilder.exe` is not at the default Steam path, edit `scripts/build.ps1` and point `$AddonBuilder` to where DayZ Tools installed it.

## 2. Deploy to the server

```powershell
pwsh scripts/deploy.ps1
```

This copies `@TakaroIntegration/` to `\\SERVER\GameServers\dayz\@TakaroIntegration\`. Override the destination with `-ServerRoot 'D:\Servers\dayz'` if your server lives elsewhere.

## 3. Wire into the server start command

Find your server's start command (usually `start_server.bat` or similar) and add `@TakaroIntegration` to **`-serverMod=`**, NOT `-mod=`:

```bat
DayZServer_x64.exe ^
    -config=serverDZ.cfg ^
    -port=2302 ^
    -profiles=profiles ^
    -mod="@CF;@DabsFramework;@DayZ-Expansion-Licensed;@DayZ-Expansion-Bundle;@BaseBuildingPlus;@BBP_ExpansionCompat;@TraderPlus;@VPPAdminTools" ^
    -serverMod="@TakaroIntegration" ^
    -dologs -adminlog -netlog -freezecheck
```

Loading via `-serverMod=` ensures:
- The mod runs on the server only.
- Clients are not asked to download it.
- The server still passes signature checks to clients (the mod is not in `-mod=`).

## 4. First boot — write defaults

Boot the server once. On startup the bridge runs `TakaroConfig.Load()` which, if no config exists, writes a default at:

```
\\SERVER\GameServers\dayz\profiles\TakaroIntegration\config.json
```

You will see this line in the RPT:

```
[Takaro][WARN] No config found — wrote defaults to $profile:TakaroIntegration/config.json. Edit it and restart.
```

The bridge will be inert until you fill in tokens, so the rest of the server is unaffected.

## 5. Configure

Open the config file and set:

- `TakaroApiUrl` — usually `https://api.takaro.io`. Override only for self-hosted Takaro.
- `RegistrationToken` — paste the registration token from the Takaro dashboard. The bridge will swap this for an `IdentityToken` + `GameServerId` on first run.
- (Or skip the registration token and set `IdentityToken` + `GameServerId` directly if you already have them.)

Optional tuning:

- `EventBatchIntervalMs` — how often queued events flush. 1000ms is fine.
- `CommandPollIntervalMs` — how often we poll Takaro for inbound operations. 2000ms keeps response latency low without hammering the API.
- `MaxEventsPerBatch` — caps payload size.
- `LogVerbose` — turns on debug-level logs in the RPT.
- `DryRun` — logs what would have been sent without making any HTTP calls. Use for first-run sanity-checking.
- `MapSurvey` — `1` (default) surveys the world once, a minute after the first start, so the bridge can draw Takaro map tiles. It writes `$profile:TakaroIntegration/map/<world>.survey` in small steps and reuses that file on later starts. `0` turns it off. The console command `mapsurvey start` surveys again, for example after a map update.

See `examples/TakaroConfig.json.example` for the canonical shape.

## 6. Restart

Restart the server. You should see:

```
[Takaro] Bridge v0.1.0 starting
[Takaro] Loaded config from $profile:TakaroIntegration/config.json
[Takaro] Bootstrapping with registration token...
[Takaro] Registration complete (gameserver=...)
[Takaro] Bridge attached to MissionServer.OnInit
```

In the Takaro dashboard the server should show as **online** within a few seconds.

## Verifying

Quick smoke tests:

1. **Server online in Takaro** — dashboard shows the server with status online and the configured name.
2. **Player list** — connect with one client, run `listPlayers` from Takaro, expect to see the player's gameId/name.
3. **Outbound chat** — from Takaro, send `sendMessage` with the message `"hello"`. All connected players should see a system broadcast.
4. **Connect event** — disconnect and reconnect a client; Takaro should log a `player-disconnected` then `player-connected` event each time.
5. **Death event** — kill a player (zombie, fall damage, another player). Takaro should receive a `player-death` event with attacker (if applicable) and weapon.

If any of these fail, check the server RPT log for `[Takaro]` lines — they include the failing HTTP status codes and JSON parse errors.

## Troubleshooting

- **Nothing in Takaro dashboard.** Confirm the bridge logged `Registration complete` (or you set `IdentityToken` + `GameServerId` directly). Check `TakaroApiUrl` is reachable from the server box (`Invoke-WebRequest https://api.takaro.io/health`).
- **`HTTP register error code 401`.** Bad registration token. Generate a new one in the Takaro dashboard.
- **`Event queue full — dropped N events total`.** Either Takaro is unreachable, or `EventBatchIntervalMs` is too long. Check connectivity; lower the interval.
- **Chat events missing.** Vanilla DayZ doesn't expose a clean script-side chat hook; you need either the optional CF compatibility addon or to call `TakaroChatRouter.Route()` from your existing chat-handling mod. See [docs/EVENT_MAPPING.md](EVENT_MAPPING.md).
- **`banPlayer` only kicks the player.** The minimal build does not write to the BattlEye/VPP ban list. Use VPP for permanent bans until the VPP compat addon ships.
