require('dotenv').config();
const fetch = require('node-fetch');
const expressMapper = require('./expressmapper.js');
const GoogleSheetAppender = require('./GoogleSheetAppender');

const table_id = process.env.TABLE_ID;
const google_auth_path = process.env.GOOGLE_AUTH_PATH;
const sheetAppender = new GoogleSheetAppender(google_auth_path);
const em = new expressMapper('config.json', 5000, false);

em.defineLog('mylog', 50, 'Logs');

em.defineAction('test', () => {
	console.log('test');
	em.appendLog('mylog', 'test');
}, '');

em.defineFileUpload('steamcookies', 2 * 1024 * 1024, 'steamcookies.json', 'File Uploads');

em.defineSwitch('getwishlistsswitch', true, 'Switches');

em.defineCron('getwishlists', async () => {
	if(!em.isSwitchOn('getwishlistsswitch')) return;

	console.log('Get Wishlists!');

	// Get the Wishlist CSV
	const wl_csv = await getCSV(generateWishlistURL(getYesterday()), 'steamcookies');
	// Split the CSV string by lines and remove the first two lines
	const cleanedCsvString = wl_csv.split('\n').slice(2).join('\n').trim();

	if(wl_csv != null) {
		await sheetAppender.appendToSheet(table_id, 'Wishlists', cleanedCsvString);
		em.appendLog('mylog', "Wishlists: success");
	}
}, 'Cron Tasks');

em.defineSwitch('getutmswitch', true, 'Switches');

em.defineCron('getutm', async () => {
	if(!em.isSwitchOn('getutmswitch')) return;

	console.log('Get UTM!');

	// Get the UTM CSV
	const utm_csv = await getCSV(generateUTMURL(getYesterday(true)), 'steamcookies');
	if(utm_csv != null) {
		await sheetAppender.appendToSheet(table_id, 'UTM', utm_csv);
		em.appendLog('mylog', "UTM: success");
	}
}, 'Cron Tasks');

// On server restart, the loaded configurations will apply.
em.listen();

async function getCSV (url, cookie_name) {

	//check if cookie file exists
	if(!require('fs').existsSync('./' + cookie_name + '.json')) {
		em.appendLog('mylog', `cookies file ${cookie_name}.json doesn't exist`);

		fetch('https://ntfy.sh/fall_problems', {
			method: 'POST',
			body: 'Steam-Stats: Cookie file not found'
		});
		return;
	}

	// Load and format the saved cookies
	const cookies = require('./' + cookie_name + '.json');
	const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

	const response = await fetch(url, {
		headers: {
			'Cookie': cookieString,
			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
			"Accept-Encoding": "gzip, deflate, br",
			"Accept-Language": "en-US,en;q=0.5",
			"Connection": "keep-alive",
			"DNT": "1",
			//"Host": "partner.steampowered.com",
			//"Referer": "https://partner.steampowered.com/",
			"Sec-Fetch-Dest": "document",
			"Sec-Fetch-Mode": "navigate",
			"Sec-Fetch-Site": "same-origin",
			"Sec-Fetch-User": "?1",
			"Sec-GPC": "1",
			"TE": "trailers",
			"Upgrade-Insecure-Requests": "1",
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0"
		}
	});

	if (response.ok) {
		const csvContent = await response.text();

		console.log(csvContent);

		//if csvContent starts with <!DOCTYPE HTML> then the cookies are expired, throw error
		if(csvContent.startsWith("<!DOCTYPE HTML>")) {
			em.appendLog('mylog', `Seeing HTML, cookies expired, or some other error`);
			fetch('https://ntfy.sh/fall_problems', {
				method: 'POST',
				body: 'Steam-Stats: Seeing HTML, cookies expired, or some other error'
			});
			return;
		}

		// Save the CSV content to a file
		//require('fs').writeFileSync('data.csv', csvContent);
		return csvContent.trim();
	} else {
		console.error('Failed to download CSV:', response.statusText);
		return null;
	}
}

function generateWishlistURL(date) {
	const baseURL = "https://partner.steampowered.com/report_csv.php?file=SteamWishlists_1411810_";
	const params = `&params=query=QueryWishlistActionsForCSV^appID=1411810^dateStart=${date}^dateEnd=${date}^interpreter=WishlistReportInterpreter`;

	return baseURL + date + "_to_" + date + params;
}

//
//                    https://partner.steamgames.com/apps/utmtrafficstats/1411810?preset_date_range=custom&start_date=08%2F24%2F2023&end_date=08%2F24%2F2023&format=csv&content=daily
//darktideststus url  https://partner.steamgames.com/apps/utmtrafficstats/1411810?preset_date_range=custom&start_date=08%2F25%2F2023&end_date=08%2F25%2F2023&format=csv&content=daily
//dynamic url         https://partner.steamgames.com/apps/utmtrafficstats/1411810?preset_date_range=custom&start_date=08%2F25%2F2023&end_date=08%2F25%2F2023&format=csv&content=daily
function generateUTMURL(date) {
	const baseURL = "https://partner.steamgames.com/apps/utmtrafficstats/1411810?preset_date_range=custom";
	const params = `&start_date=${date}&end_date=${date}&format=csv&content=daily`;

	return baseURL + params;
}

function getYesterday(use_slashes = false) {
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