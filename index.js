const getStats = require('./steam_csv.js');

const MicroCommander = require('microcommander');
const mc = new MicroCommander('config.json', 'steam-stats', 5000, true);

mc.defineLog('dl_log', 50, 'Logs');

mc.defineSwitch('get_stats_switch', true, 'Switches');

mc.defineCron('get_stats', async () => {
	if(!mc.isSwitchOn('get_stats_switch')) return;

	try {
		const downloader = new getStats();
		await downloader.getAllCSVs(true, true);
		mc.appendLog('dl_log', "Stats pulled successfully");

	} catch (err) {

		mc.appendLog('dl_log', "Error: " + err);
	}
}, 'Cron Tasks');