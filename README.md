# vplus-updater
A simple update script for Valheim Plus.
Will look for the latest version and download and update if necessary.
Will merge config settings from your previous version into the new config and will list what was copied, removed and added.
Will also remove the `-server` argument from the start script if server password is disabled.
Written in Node.js so technically cross-platform, but it only supports the Unix version of V+ for now.
Bug me enough and I will add Windows support.
You can find me on the Valheim Discord as WoollyCow#5537.

### Setup
- Place files anywhere on your server.
- Make sure Node.js and npm are installed.
- Run `npm i` to install packages
- Edit `updater.json` and set `serverRoot` to the correct path *relative to the updater files*.
- To update, run: `node index.js` (or set up a cron job).
