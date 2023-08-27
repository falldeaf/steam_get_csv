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

	async appendToSheet(sheet_id, sheet_name, csv_string) {
		if (!this.sheets) {
			await this.authorize();
		}

		try {
			const csv_data = await this.parseCSV(csv_string);
			const csv_data_without_headers = csv_data.slice(1);  // Remove the header row

			const request = {
				spreadsheetId: sheet_id,
				range: `${sheet_name}`,
				valueInputOption: 'USER_ENTERED',
				resource: {
					values: csv_data_without_headers,
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
