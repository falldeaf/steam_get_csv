require('dotenv').config();
const Airtable = require('airtable');
const Papa = require('papaparse');

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE;
const AIRTABLE_TABLE = process.env.AIRTABLE_UTM_TABLE;

// Set up Airtable
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: AIRTABLE_PAT
});

const base = Airtable.base(AIRTABLE_BASE);
const table = base(AIRTABLE_TABLE);

function chunkArray(array, chunkSize) {
    const results = [];
    while (array.length) {
        results.push(array.splice(0, chunkSize));
    }
    return results;
}

async function addBatchedRecords(recordsData) {
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

async function addRecordsFromCSV(csvString) {
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
        const batchIds = await addBatchedRecords(batch);
        results.push(...batchIds);
    }

    return results;
}

//anonymous function
(async () => {


	try {
        const result = await addRecordsFromCSV(`Date,Source,Campaign,Medium,Content,Term,"Device Type",Visits,"Trusted Visits","Tracked Visits","Returning Visits",Wishlists,Purchases,Activations
		2023-08-16,,,,,,Desktop,1,1,1,0,0,0,0
		2023-08-17,,,,,,Desktop,1,1,0,0,0,0,0
		2023-08-16,SteamPeek,,,,,Mobile,1,1,0,0,0,0,0
		2023-08-16,Twitter,profile,,,,Desktop,1,1,0,0,0,0,0
		2023-08-16,keylol,,,,,Mobile,1,0,0,0,0,0,0
		2023-08-16,twitter,wishlistwednesday,,,,Desktop,9,7,1,0,1,0,0
		2023-08-17,twitter,wishlistwednesday,,,,Desktop,0,0,0,0,1,0,0
		2023-08-16,reddit,indiegames,,,,Desktop,3,3,0,0,0,0,0
		2023-08-17,reddit,indiegames,,,,Mobile,1,1,0,0,0,0,0
		2023-08-17,reddit,indiegames,,,,Desktop,2,0,0,0,0,0,0
		2023-08-17,twitter,letsplay,,,,Desktop,1,1,0,0,0,0,0`);
        console.log("Successfully added records:", result);
    } catch (error) {
        console.error("Error while adding records:", error);
    }
})();