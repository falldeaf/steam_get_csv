const fs = require('fs');
const Papa = require('papaparse');
const NodeCache = require('node-cache');

const myCache = new NodeCache();

function compareAndCacheCSV(filePath) {
fs.readFile(filePath, 'utf8', (err, fileContent) => {
	if (err) {
	console.error('Error reading the file:', err);
	return;
	}

	Papa.parse(fileContent, {
	header: true,
	dynamicTyping: true,
	complete: (result) => {
		const cachedData = myCache.get('csvData') || [];
		const newData = [];

		result.data.forEach((row) => {
		const cachedRow = cachedData.find((r) => r.field1name === row.field1name);

		if (cachedRow) {
			// Check if any of the values have increased
			const newRow = {};
			let hasNewValue = false;

			for (const [key, value] of Object.entries(row)) {
			if (value > cachedRow[key]) {
				newRow[key] = value - cachedRow[key];
				hasNewValue = true;
			}
			}

			if (hasNewValue) {
			newData.push(newRow);
			}
		} else {
			// This is a completely new row
			newData.push(row);
		}
		});

		if (newData.length > 0) {
		const mergedData = [...cachedData, ...newData];
		myCache.set('csvData', mergedData);
		console.log('New data found and cached:', newData);
		} else {
		console.log('No new data found.');
		}
	},
	});
});
}

// Call the function with your CSV file path
compareAndCacheCSV('utm_test.csv');

compareAndCacheCSV('utm_test copy.csv');
