# vplus-updater
A simple update script for Valheim Plus.
Will look for the latest version and download and install it if necessary.
Also works if Valheim Plus isn't installed yet.
Will merge config settings from your previous version into the new config and will list what was copied, removed and added.
On Linux, it will also remove the `-server` argument from the start script if server password is disabled.
You can find me on the Valheim and Valheim Plus Discords as WoollyCow#5537.

### Setup
- Place files anywhere on your server.
- Make sure Node.js 14+ and npm are installed.
- Run `npm i` to install packages
- Edit `config.json` and set `serverRoot` to the correct path *relative to the updater files*.
- To update, run: `node update.js` (or set up a cron job).
