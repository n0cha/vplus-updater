const os = require('os');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const ini = require('ini');

const UPDATER_CONFIG_FILE = 'config.json';
const GITHUB_ROOT = 'https://github.com';
const LATEST_PATH = '/valheimPlus/ValheimPlus/releases/latest/';
const VPLUS_CONFIG_FILE_PATH = 'BepInEx/config/valheim_plus.cfg';
const START_SCRIPT = 'start_server_bepinex.sh';

const platform = os.platform();

const ARCHIVE_FILE_NAME = {
	linux: 'UnixServer.zip',
	win32: 'WindowsServer.zip'
}[platform];

const config = require(`./${UPDATER_CONFIG_FILE}`);
const currentVersion = config.version;
const serverRoot = path.resolve(__dirname, config.serverRoot);

const end = (msg, errorLevel = 0) => {
	console[errorLevel ? 'error' : 'log']((errorLevel ? 'Error: ' : '') + msg);
	process.exit(errorLevel);
};

function listItems(items, msg) {
	if (!items.length) return;
	console.log(msg);
	items.forEach(item => console.log(`  [${item[0]}] ${item[1]} = ${item[2]}`));
}

async function downloadArchive(url) {
	console.log(`Downloading url...`);
	const archiveFile = path.resolve(__dirname, ARCHIVE_FILE_NAME);
	const response = await fetch(url);
	await new Promise(resolve => {
		const file = fs.createWriteStream(archiveFile);
		response.body.pipe(file);
		file.on('finish', resolve);
	});
	return archiveFile;
}

function readVplusConfig() {
	const vplusConfigFile = path.resolve(serverRoot, VPLUS_CONFIG_FILE_PATH);
	if (!fs.existsSync(vplusConfigFile)) return {};
	return ini.parse(fs.readFileSync(vplusConfigFile, 'utf-8'));
}

async function getLatestArchivePath() {
	let response = await fetch(`${GITHUB_ROOT}${LATEST_PATH}`)
			.catch(() => end('Could not fetch release page', 1));
	const pageContent = await response.text();
	const [ , filePath ] = pageContent.match(new RegExp(`"([\\w./]+${ARCHIVE_FILE_NAME})"`));
	return filePath;
}

async function unzipArchive(archiveFile) {
	console.log(`Unzipping ${ARCHIVE_FILE_NAME}...`);
	await fs.createReadStream(archiveFile)
			.pipe(unzipper.Extract({ path: serverRoot })).promise();
	fs.unlinkSync(archiveFile);
}

function disablePassword(oldConfig) {
	if (platform !== 'linux') return;
	if (!oldConfig?.Server?.disableServerPassword) return;

	const startScript = path.resolve(serverRoot, START_SCRIPT);
	let startScriptContent = fs.readFileSync(startScript).toString('utf-8');
	startScriptContent = startScriptContent.replace(' -password "${server_password}"', '');
	fs.writeFileSync(startScript, startScriptContent);
	console.log('Removed password argument from start script');
}

console.log('=== Valheim Plus Updater ===');

(async () => {
	try {
		const archivePath = getLatestArchivePath();
		
		const [ version ] = archivePath.match(/\d+\.\d+\.\d+/);
		
		if (version === currentVersion) end('No update needed.');
		
		const oldConfig = readVplusConfig();

		const archiveFile = await downloadArchive(`${GITHUB_ROOT}${archivePath}`);
		
		await unzipArchive(archiveFile);
		
		console.log(`Updated ${currentVersion && `version ${currentVersion} ` || ''}to version ${version}`);
		
		disablePassword(oldConfig);
		
		const newConfigContent = fs.readFileSync(vplusConfigFile, 'utf-8');
		const newConfig = ini.parse(newConfigContent);
		
		const removed = [];
		const added = [];
		const copied = [];
		
		let configContent = newConfigContent;
		
		Object.keys(oldConfig).forEach(sectionKey => {
			Object.keys(oldConfig[sectionKey]).forEach(key => {
				const defaultValue = newConfig[sectionKey][key];
				const customValue = oldConfig[sectionKey][key];
				
				if (!newConfig[sectionKey] || !(key in newConfig[sectionKey])) return removed.push([ sectionKey, key, oldConfig[sectionKey][key] ]);
				
				if (defaultValue === customValue) return;

				copied.push([ sectionKey, key, customValue ]);
				
				const sectionIndex = configContent.indexOf('[' + sectionKey + ']');
				const irrelevantPart = configContent.substring(0, sectionIndex);
				let sectionPart = configContent.substring(sectionIndex);
				const defaultLine = key + '=' + defaultValue;
				const customLine = key + '=' + customValue;
				sectionPart = sectionPart.replace(defaultLine, customLine);
				configContent = irrelevantPart + sectionPart;
			});
		});
		
		fs.writeFileSync(vplusConfigFile, configContent);
		console.log('Merged config files');
		
		Object.keys(newConfig).forEach(sectionKey => {
			Object.keys(newConfig[sectionKey]).forEach(key => {
				if (!oldConfig[sectionKey] || !(key in newConfig[sectionKey])) return added.push([ sectionKey, key, newConfig[sectionKey][key] ]);
			});
		});
		
		listItems(copied, 'Settings restored:');
		listItems(removed, 'Settings no longer used in this version:');
		listItems(added, 'New settings in this version:');
		
		config.version = version;
		await fs.writeFileSync(path.join(__dirname, UPDATER_CONFIG_FILE), JSON.stringify(config, undefined, 2));
	} catch (error) {
		end(error, 99);
	}
})();
