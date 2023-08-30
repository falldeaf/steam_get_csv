require('dotenv').config();
const puppeteer = require('puppeteer');
const guard = require('./steam_guard.js');
const fetch = require('node-fetch');
const GoogleSheetAppender = require('./GoogleSheetAppender');

const table_id = process.env.TABLE_ID;
const google_auth_path = process.env.GOOGLE_AUTH_PATH;
const sheetAppender = new GoogleSheetAppender(google_auth_path);

//class that handles downloading the CSVs using puppeteer
class CSVDownloader {
	constructor() {
		this.browser = null;
		this.page = null;
		this.cookies = null;
	}

	async init(headless = true) {
		this.browser = await puppeteer.launch({ headless: headless });
		this.page = await this.browser.newPage();

		await this.page.goto('https://partner.steampowered.com', { waitUntil: 'networkidle2' });

		//wait for the login button to load
		await this.page.waitForSelector('div.newlogindialog_TextField_2KXGK:nth-child(1) > input:nth-child(3)');

		//fill in the username and password
		// input field is first class="newlogindialog_TextInput_2eKVn" on the page
		await this.page.type('div.newlogindialog_TextField_2KXGK:nth-child(1) > input:nth-child(3)', process.env.STEAM_USER);
		await this.page.type('div.newlogindialog_TextField_2KXGK:nth-child(2) > input:nth-child(3)', process.env.STEAM_PASS);

		//press the sign in button
		await this.page.click('.newlogindialog_SubmitButton_2QgFE');

		//wait for the 2FA modal to load
		await this.waitForTimeout(10000);

		const code = await guard();
		console.log(code);

		//fill in the 2FA code (#signInBlock > div.page_content > div > div > div > div > div.newlogindialog_FormContainer_3jLIH > form > div > div.newlogindialog_ConfirmationEntryContainer_2AnqS > div.newlogindialog_FlexCol_1mhmm.newlogindialog_AlignItemsCenter_30P8x > div > input:nth-child(1))
		await this.page.type('#signInBlock > div.page_content > div > div > div > div > div.newlogindialog_FormContainer_3jLIH > form > div > div.newlogindialog_ConfirmationEntryContainer_2AnqS > div.newlogindialog_FlexCol_1mhmm.newlogindialog_AlignItemsCenter_30P8x > div > input:nth-child(1)', code);

		await this.waitForTimeout(5000);

		//save the cookies
		this.cookies = await this.page.cookies();
		//require('fs').writeFileSync('cookies.json', JSON.stringify(this.cookies));
	}

	async getAllCSVs(headless = true, write_to_sheets = true) {
		await this.init(headless);

		const wishlists_csv = await this.downloadCSV(this.generateWishlistURL(this.getYesterday()));
		if(wishlists_csv != null) {
			// Split the CSV string by lines and remove the first two lines
			const cleanedCsvString = wishlists_csv.split('\n').slice(2).join('\n').trim();
			if(write_to_sheets) {
				await sheetAppender.appendToSheet(table_id, 'Wishlists', cleanedCsvString);
			}
		}

		const utm_csv = await this.downloadCSV(this.generateUTMURL(this.getYesterday(true)));
		if(utm_csv != null) {
			if(write_to_sheets) {
				await sheetAppender.appendToSheet(table_id, 'UTM', utm_csv);
			}
		}

		console.log(wishlists_csv);
		console.log(utm_csv);

		this.close();
	}

	async downloadCSV(url) {
		let cookies = this.cookies;
		const cookie_string = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

		//console.log(cookie_string);

		const response = await fetch(url, {
			headers: {
				'Cookie': cookie_string,
				//"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
				//"Accept-Encoding": "gzip, deflate, br",
				//"Accept-Language": "en-US,en;q=0.5",
				//"Connection": "keep-alive",
				//"DNT": "1",
				//"Host": domain,
				//"Referer": "https://partner.steampowered.com/",
				//"Sec-Fetch-Dest": "document",
				//"Sec-Fetch-Mode": "navigate",
				//"Sec-Fetch-Site": "same-origin",
				//"Sec-Fetch-User": "?1",
				//"Sec-GPC": "1",
				//"TE": "trailers",
				//"Upgrade-Insecure-Requests": "1",
				//"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0"
			}
		});

		if (response.ok) {
			const csvContent = await response.text();

			//if csvContent starts with <!DOCTYPE HTML> then the cookies are expired, throw error
			if(csvContent.startsWith("<!DOCTYPE HTML>")) {
				throw new Error("Some kind of problem downloading the CSV");
			}

			// Save the CSV content to a file
			//require('fs').writeFileSync('data.csv', csvContent);
			return csvContent.trim();
		} else {
			console.error('Failed to download CSV:', response.statusText);
			return null;
		}
	}

	async close() {
		try {
			// your code here
		} catch (error) {
			console.error('An error occurred:', error);
		}
		await this.page.close();
		await this.browser.close();
	}

	generateWishlistURL(date) {
		const baseURL = "https://partner.steampowered.com/report_csv.php?file=SteamWishlists_1411810_";
		const params = `&params=query=QueryWishlistActionsForCSV^appID=1411810^dateStart=${date}^dateEnd=${date}^interpreter=WishlistReportInterpreter`;

		return baseURL + date + "_to_" + date + params;
	}

	generateUTMURL(date) {
		const baseURL = "https://partner.steamgames.com/apps/utmtrafficstats/1411810?preset_date_range=custom";
		const params = `&start_date=${date}&end_date=${date}&format=csv&content=daily`;

		return baseURL + params;
	}

	getYesterday(use_slashes = false) {
		const today = new Date();
		const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));

		const year = yesterday.getFullYear();
		const month = String(yesterday.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
		const day = String(yesterday.getDate()).padStart(2, '0');

		if(!use_slashes) {
			return `${year}-${month}-${day}`;
		} else {

			// Formatting the date with slashes
			const slashFormattedDate = `${month}/${day}/${year}`;

			// URL encoding the formatted date
			const encodedDate = encodeURIComponent(slashFormattedDate);

			return encodedDate;
		}
	}

	waitForTimeout(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

//module.exports = CSVDownloader;

/*
async function main() {
	const downloader = new CSVDownloader();
	await downloader.getAllCSVs(false, false);
}
main();
*/