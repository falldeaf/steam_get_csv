require('dotenv').config();
const Airtable = require('airtable');
const Papa = require('papaparse');

// Set up Airtable
Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: process.env.AIRTABLE_PAT
});

const base = Airtable.base(process.env.AIRTABLE_BASE);
const wishlist_table = base(process.env.AIRTABLE_WISHLIST_TABLE);
const utm_table = base(process.env.AIRTABLE_UTM_TABLE);

async function addWishlistCSV(csvString) {
	return new Promise((resolve, reject) => {
		const parsed = Papa.parse(csvString, {
			header: true,
			skipEmptyLines: true,
			dynamicTyping: true
		});

		// Get the first record data
		const recordData = parsed.data[0];

		wishlist_table.create(recordData, (err, createdRecord) => {
			if (err) {
				console.error(err);
				reject(err);
			} else {
				console.log('Added record with ID:', createdRecord.getId());
				resolve(createdRecord.getId());
			}
		});
	});
}


/*
// Set up Airtable
Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: AIRTABLE_PAT
});

const base = Airtable.base(AIRTABLE_BASE);
const table = base(AIRTABLE_TABLE);
*/

function chunkArray(array, chunkSize) {
	const results = [];
	while (array.length) {
		results.push(array.splice(0, chunkSize));
	}
	return results;
}

async function addBatchedRecords(recordsData, table) {
	const formattedRecords = recordsData.map(record => ({ fields: record }));
	return new Promise((resolve, reject) => {
		table.create(formattedRecords, (err, createdRecords) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(createdRecords.map(record => record.getId()));
		});
	});
}

async function addRecordsFromCSV(csvString, table_id) {
	const table = base(table_id);
	const parsed = Papa.parse(csvString, {
		header: true,
		skipEmptyLines: true,
		dynamicTyping: true
	});

	const recordsData = parsed.data;
	console.log(recordsData);

	const batches = chunkArray(recordsData, 10);
	const results = [];

	for (const batch of batches) {
		const batchIds = await addBatchedRecords(batch, table);
		results.push(...batchIds);
	}

	return results;
}

// Export the functions
module.exports = {
	addWishlistCSV,
	addRecordsFromCSV
};
