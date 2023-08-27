const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const fs = require('fs');
const multer = require('multer');
const merge = require('lodash.merge');
const redis = require('redis');
const rclient = redis.createClient();

class ExpressMapper {
	constructor(configFile = 'config.json', service_name, port = 5000, discoverable = false) {
		if(service_name == null) throw new Error("service_name is null");

		this.app = express();
		this.app.use(bodyParser.json());
		this.routes = [];
		this.cronTasks = {};
		this.callbackRegistry = {};
		this.configs = {};
		this.service_name = service_name;
		this.discoverable = discoverable;
		this.port = port;
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
		// If the config file exists, read it into a variable
		let existingConfig = {};
		if (fs.existsSync(this.configFile)) {
			existingConfig = JSON.parse(fs.readFileSync(this.configFile));
		}

		//const mergedConfig = { ...existingConfig, ...this.configs };
		const mergedConfig = merge(existingConfig, this.configs);

		// Write the merged configuration back to the config file
		fs.writeFileSync(this.configFile, JSON.stringify(mergedConfig, null, 2));
	}

	// Checks if a key exists in the saved config.json file.
	// Nested keys can be checked using dot notation, e.g., 'switches.light'
	keyExistsInFile(key) {
		let exists = false;
		if (fs.existsSync(this.configFile)) {
		const fileContent = JSON.parse(fs.readFileSync(this.configFile));
		const keys = key.split('.');
		let tempObj = fileContent;
		for (const k of keys) {
			if (tempObj.hasOwnProperty(k)) {
			tempObj = tempObj[k];
			exists = true;
			} else {
			exists = false;
			break;
			}
		}
		}
		return exists;
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

	defineAction(path, callback, category = '') {
		this.defineRoute('get', `/${path}`, (req, res) => {
			callback();
			res.json({ message: 'Action executed successfully' });
		}, category, `Execute action for ${path}`);
	}

	defineSwitch(path, default_state, category = '') {
		this.configs.switches = this.configs.switches || {};

		// Use the new method to check if the switch exists in the config file
		if (!this.keyExistsInFile(`switches.${path}`)) {
		  this.configs.switches[path] = default_state;
		  this.saveConfig();
		}

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

		this.defineRoute('get', `/${path}/test`, (req, res) => {
			this.callbackRegistry[path]();
			res.json({ message: 'Cron task executed successfully' });
		}, category, `Test cron for ${path}`);


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

	defineFileUpload(path, maxFileSize, filename, category = '') {
		const storage = multer.diskStorage({
			destination: function (req, file, cb) {
				cb(null, './')  // You can change the destination here
			},
			filename: function (req, file, cb) {
				cb(null, filename)  // Use the predefined filename
			}
		});

		const upload = multer({
			storage: storage,
			limits: {
				fileSize: maxFileSize
			}
		}).single('file');  // Expect a single file input named 'file'

		this.defineRoute('post', `/${path}`, (req, res) => {
			upload(req, res, function (err) {
				if (err instanceof multer.MulterError) {
					// A Multer error occurred when uploading.
					return res.status(500).json({ error: err.message });
				} else if (err) {
					// An unknown error occurred when uploading.
					return res.status(500).json({ error: err.message });
				}

				// Everything went fine, file uploaded
				res.json({ message: 'File uploaded successfully' });
			});
		}, category, `Upload a file to ${path}`);
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

	listen() {
		this.loadConfig();
		this.initMap();
		this.app.listen(this.port, () => {
			console.log(`Server running on port ${this.port}`);

			// Register the service with Redis if discoverable is set to true
			if(!this.discoverable) return;

			rclient.hset('services', this.service_name, `node.land:${this.port}`, (err, reply) => {
				if (err) {
				  console.error(`Failed to register service: ${err}`);
				} else {
				  console.log(`Registered service: ${this.service_name} with URL: ${this.service_name}`);
				}
			});

			// Listening to various types of application termination
			['SIGINT', 'SIGTERM', 'SIGQUIT', 'uncaughtException', 'exit'].forEach(eventType => {
			process.on(eventType, (error) => {  // Added 'error' parameter to capture the error object in case of 'uncaughtException'

				if (eventType === 'uncaughtException') {
				console.error('Uncaught Exception:');
				console.error(error);
				}

				console.log(`Received event: ${eventType}`);

				try {

					rclient.hdel('services', this.service_name, (err, reply) => {
						if (err) {
							console.error(`Failed to unregister service: ${err}`);
						} else if (reply === 0) {
							console.log(`Service ${this.service_name} does not exist`);
						} else {
							console.log(`Unregistered service: ${this.service_name}`);
						}

						process.exit((eventType === 'uncaughtException') ? 1 : 0); // Use non-zero exit code for 'uncaughtException'
					});

				} catch (error) {
					console.error(error);
					process.exit(1);  // Non-zero exit code indicates failure
				}
			});// End of process.on
			});// End of forEach

		}); // End of app.listen
	}
}

module.exports = ExpressMapper;

/*
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
*/