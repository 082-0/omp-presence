# OMP Presence

Share your OMP activity on Discord. OMP Presence shows your project, optional chat title, model, effort level, and session timer. You choose what to share.

**v7 is the main Windows release.** [Download OMP Presence v7 for Windows](https://github.com/082-0/omp-presence/releases/latest/download/OMP-Presence-v7-Windows.exe). This is a portable EXE. There is no installer.

**macOS and Linux support is coming soon.** Neither platform has a download yet. The current build and the OMP process detector target Windows.

![v7 Home screen with sample data](docs/screenshots/v7-home.png)

## What changed from the beta?

The v1 beta made model and effort visible on Discord, but it asked you to set up a Discord application ID. V2 included the public OMP ID, so that step went away. V3 hid the extension setup card when it was no longer needed. V4 detected when OMP was running even before its extension sent data.

V5 added the project name, optional chat title, and username. V6 tried a full dashboard redesign and added three themes. V7 put the live status on Home and moved choices to a separate Settings screen. It also added a local profile picture and the optional **Start with OMP** setting.

These are changes found in the local v1 through v7 Windows EXEs. This repository begins with the v7 source. It does not pretend that the earlier binaries were Git commits. [Read the full version history](CHANGELOG.md).

| Earlier screens | Current Settings |
| --- | --- |
| [v1 beta](docs/screenshots/beta-v1.png) · [v5](docs/screenshots/v5.png) · [v6](docs/screenshots/v6.png) | [v7 Settings](docs/screenshots/v7-settings.png) |

The screenshots show each version's packaged interface with sample data. They do not show a real account, chat, or live Discord session.

## Run v7 on Windows

1. Download [OMP Presence v7 for Windows](https://github.com/082-0/omp-presence/releases/latest/download/OMP-Presence-v7-Windows.exe).
2. If an older OMP Presence copy is open, right-click its system tray icon and choose **Quit**. Closing its window only hides it.
3. Open the v7 EXE. Keep Discord desktop open and signed in.
4. If the app asks for the OMP extension, install it from Home and restart OMP. The extension sends the project name, optional chat title, model, and effort. If you use a named OMP profile, copy [`extension/omp-presence.js`](extension/omp-presence.js) into that profile's `agent/extensions` folder.
5. Open Settings with the gear. Enter a username if you want one in your Discord activity. Choose which details to share, then click **Save presence settings**.

The OMP, Black, and White themes save as soon as you select them. You can also choose a local profile picture. This picture appears in the app only. Your Discord account picture and the OMP artwork on the activity card do not change.

**Start with OMP** is off by default. If you enable it, click **Save presence settings** and restart OMP. The extension then starts this EXE when you open OMP. If you move the EXE, run it once from the new location. This setting does not start the app when Windows starts.

## Quick answers

**Do I need a Discord application ID?** No. V2 and later include the public OMP application ID. You do not need a bot token or the Discord Developer Portal.

**Does the app post my prompts?** No. The extension writes the project folder name, optional chat title, model, effort, and time to a local file. Prompts, tool output, and full project paths are not sent to Discord. A chat title is public when you turn on **Chat title**.

**Why does an old screen appear after I open v7?** An older copy is still running in the tray. Quit that copy first. OMP Presence allows only one running copy.

## Build from source

Use Node.js 22.13 or later on Windows. Run these commands from the project folder:

```sh
npm ci
npm test
npm run build:win
```

The portable EXE appears in `dist/`. Use `npm start` to run the app from source. The app uses Electron and the local Discord connection. The OMP extension is in `extension/`. Source, tests, artwork, and screenshots are in this repository. The Windows EXE is a release download, not a file in Git.

## Privacy and limits

The OMP extension writes the process ID, project folder name, optional chat title, model ID, effort level, and timestamps to `%APPDATA%\omp-presence\live`. The app reads the latest entry. It expires after 12 seconds. Without an entry, the app can read only the title and working directory from the first two lines of a local OMP session file. It uses only the folder name, not the full path. The extension removes its entry when OMP closes normally.

Settings are stored in `%APPDATA%\omp-presence\settings.json`. A chosen profile picture is stored in `%APPDATA%\omp-presence\avatar.png`. The optional OMP start setting also stores the EXE path and the running process ID in that folder. The app does not read login tokens or account names. The timer starts when the app detects OMP. With several OMP sessions, it cannot know which terminal has keyboard focus.

Closing the window leaves the app in the Windows system tray. Right-click the tray icon to pause or quit. Pausing stops Discord activity. The OMP extension can still update its local file while OMP runs.

## Credits

Made by [08](https://github.com/082-0). The OMP mark is based on the [OMP icon](https://github.com/can1357/oh-my-pi/blob/main/assets/icon.svg). The bundled public Discord application ID and `logo` artwork belong to the shared [OMP Discord presence application](https://github.com/abilliontokens/omp-discord-presence). This project does not control that application's future availability. OMP Presence is not affiliated with Discord.
