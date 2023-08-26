//get AIRTABLE_PAT from .env file
require('dotenv').config();
const Papa = require('papaparse');

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE;

const Airtable = require('airtable');

// Set up Airtable
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: AIRTABLE_PAT
});

const base = Airtable.base(AIRTABLE_BASE);
const table = base(AIRTABLE_TABLE);

const sampleRecord = {
    DateLocal: '2023-8-18',
    Game: 'Dark Tides',
    Adds: 131,
    Deletes: 0,
    PurchasesAndActivations: 0,
    Gifts: 0
};

table.create(sampleRecord, (err, createdRecord) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Added record with ID:', createdRecord.getId());
    }
});
