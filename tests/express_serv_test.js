const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const fs = require('fs');

class ExpressMapper {
	constructor(configFile = 'config.json') {
		this.app = express();
		this.app.use(bodyParser.json());
		this.routes = [];
		this.cronTasks = {};
		this.callbackRegistry = {};
		this.configs = {};
		// Ensure `this.configs.crons` is an object
		if (!this.configs.crons) {
			this.configs.crons = {};
		}
		this.configFile = configFile;
	}

	loadConfig() {
		if (fs.existsSync(this.configFile)) {
			this.configs = JSON.parse(fs.readFileSync(this.configFile));

			// Restart the cron tasks using the callback registry
			if (this.configs.crons) {
				for (let path in this.configs.crons) {
					const cronString = this.configs.crons[path].cron;
					const taskCallback = this.callbackRegistry[path];

					if (taskCallback && cron.validate(cronString)) {
						// If a task for this path already exists, destroy it before creating a new one
						if (this.cronTasks[path]) {
							this.cronTasks[path].destroy();
						}

						// Create and start a new cron task using the callback from our registry
						this.cronTasks[path] = cron.schedule(cronString, taskCallback);
					}
				}
			}
		}
	}

	saveConfig() {
		fs.writeFileSync(this.configFile, JSON.stringify(this.configs, null, 2));
	}

	defineRoute(method, path, callback, category = '', description) {
		this.app[method](path, callback);
		this.routes.push({
		method: method.toUpperCase(),
		path: path,
		category: category,
		description: description
		});
	}

	isSwitchOn(path) {
		return this.configs.switches && this.configs.switches[path] === true;
	}

	defineSwitch(path, category = '') {
		this.configs.switches = this.configs.switches || {};

		this.defineRoute('post', `/${path}/toggle`, (req, res) => {
		this.configs.switches[path] = !this.configs.switches[path];
		res.json({ status: this.configs.switches[path] ? 'ON' : 'OFF' });
		}, category, `Toggle switch for ${path}`);

		this.defineRoute('get', `/${path}/status`, (req, res) => {
		res.json({ status: this.configs.switches[path] ? 'ON' : 'OFF' });
		}, category, `View switch status for ${path}`);
	}

	defineCron(path, taskCallback, category = '') {
		// Register the callback using the path as the key
		if (this.callbackRegistry[path]) {
			throw new Error("A callback already exists for this path");
		}
		this.callbackRegistry[path] = taskCallback;

		this.defineRoute('post', `/${path}/set`, (req, res) => {
		const cronString = req.body.cron;
		if (!cron.validate(cronString)) {
			return res.status(400).json({ error: 'Invalid cron string' });
		}

		// If a task for this path already exists, destroy it before creating a new one
		if (this.cronTasks[path]) {
			this.cronTasks[path].destroy();
		}

		// Create a new cron task using the callback from our registry
		this.cronTasks[path] = cron.schedule(cronString, this.callbackRegistry[path]);
		// Save the cron string and path (as callback reference) to the configs
		this.configs.crons[path] = {
			cron: cronString
		};

		res.json({ message: 'Cron task set successfully' });
		}, category, `Set cron for ${path}`);

		this.defineRoute('get', `/${path}/view`, (req, res) => {
		res.json({ cron: this.configs.crons[path] ? this.configs.crons[path].cron : null });
		}, category, `View cron for ${path}`);
	}

	defineColor(path, category = '') {
		this.configs.colors = this.configs.colors || {};

		this.defineRoute('post', `/${path}/set`, (req, res) => {
		const color = req.body.color;
		// Simple validation for color - this can be extended
		if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
			return res.status(400).json({ error: 'Invalid color format' });
		}

		this.configs.colors[path] = color;
		res.json({ message: 'Color set successfully' });
		}, category, `Set color for ${path}`);

		this.defineRoute('get', `/${path}/view`, (req, res) => {
		res.json({ color: this.configs.colors[path] });
		}, category, `View color for ${path}`);
	}

	defineLog(path, maxLines = Infinity, category = '') {
		// Create or ensure the log file exists for this path
		const logFilePath = `./${path}.log`;
		if (!fs.existsSync(logFilePath)) {
			fs.writeFileSync(logFilePath, '');  // Create an empty file
		}

		// Register the max lines allowed for this log path
		this.app.locals[path] = maxLines;

		// Define a route to view the log entries for this path
		this.defineRoute('get', `/${path}/view`, (req, res) => {
			const logs = fs.readFileSync(logFilePath, 'utf-8');
			res.send(`<pre>${logs}</pre>`);  // Wrapping in <pre> for better formatting
		}, category, `View logs for ${path}`);
	}

	appendLog(path, message) {
		const logFilePath = `./${path}.log`;

		if (!fs.existsSync(logFilePath)) {
			throw new Error(`No log defined for path: ${path}`);
		}

		const timestamp = new Date().toISOString();
		const logEntry = `${timestamp}: ${message}\n`;  // New line for each log entry

		fs.appendFileSync(logFilePath, logEntry);  // Append the log entry to the file

		// Trim logs if they exceed maxLines for this path
		const maxLines = this.app.locals[path];
		const logs = fs.readFileSync(logFilePath, 'utf-8').split('\n').filter(Boolean);
		if (logs.length > maxLines) {
			const trimmedLogs = logs.slice(-maxLines); // Keep the latest `maxLines` logs
			fs.writeFileSync(logFilePath, trimmedLogs.join('\n'));
		}
	}

	initMap() {
		this.app.get('/map', (req, res) => {
		res.json(this.routes);
		});

		this.app.post('/save', (req, res) => {
		this.saveConfig();
		res.json({ message: 'Configurations saved successfully' });
		});
	}

	listen(port) {
		this.loadConfig();
		this.initMap();
		this.app.listen(port, () => {
		console.log(`Server running on port ${port}`);
		});
}
}

// Example usage:
const api = new ExpressMapper();

let x = 0;

api.defineSwitch('myswitch', 'Switches');

api.defineCron('mycron', () => {
	if(api.isSwitchOn('myswitch')) {
		console.log('Cron task executed! ' + x);
		api.appendLog('mylog', 'Log entry ' + x);
		x++;
	}
}, 'Cron Tasks');

api.defineLog('mylog', 50, 'Logs');

api.defineColor('mycolor', 'Color Settings');

// On server restart, the loaded configurations will apply.
api.listen(5000);
