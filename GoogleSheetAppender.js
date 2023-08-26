const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const Papa = require('papaparse');

class GoogleSheetAppender {
	constructor(credentialsPath) {
		this.credentialsPath = credentialsPath;
		this.sheets = null;
	}

	async authorize() {
		const content = fs.readFileSync(this.credentialsPath, 'utf8');
		const credentials = JSON.parse(content);

		const auth = new GoogleAuth({
		credentials,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
		});

		this.sheets = google.sheets({ version: 'v4', auth });
	}

	async parseCSV(csvString) {
		return new Promise((resolve, reject) => {
		Papa.parse(csvString, {
			complete: (result) => {
			resolve(result.data);
			},
			error: (error) => {
			reject(error);
			},
		});
		});
	}

	async appendToSheet(sheetId, sheetName, csvString) {
		if (!this.sheets) {
			await this.authorize();
		}

		try {
			const csvData = await this.parseCSV(csvString);
			const csvDataWithoutHeaders = csvData.slice(1);  // Remove the header row

			const request = {
				spreadsheetId: sheetId,
				range: `${sheetName}`,
				valueInputOption: 'RAW',
				resource: {
				values: csvDataWithoutHeaders,
				},
			};
			const response = await this.sheets.spreadsheets.values.append(request);
			console.log(`Appended ${response.data.updates.updatedRows} rows`);
		} catch (error) {
			console.error(`Error: ${error}`);
		}
	}
}

module.exports = GoogleSheetAppender;
