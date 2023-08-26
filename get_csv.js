require('dotenv').config();
const fetch = require('node-fetch');
const GoogleSheetAppender = require('./GoogleSheetAppender');

(async () => {

	const table_id = process.env.TABLE_ID;
	const google_auth_path = process.env.GOOGLE_AUTH_PATH;

	const sheetAppender = new GoogleSheetAppender(google_auth_path);

	// Load and format the saved cookies
	const cookies = require('./steamcookies.json');
	const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

	// Get the Wishlist CSV
	const wl_csv = await getCSV(generateWishlistURL(getYesterday()), cookieString);
	// Split the CSV string by lines and remove the first two lines
	const cleanedCsvString = wl_csv.split('\n').slice(2).join('\n').trim();
	console.log(cleanedCsvString);
	//await sheetAppender.appendToSheet(table_id, 'Wishlists', cleanedCsvString);

	// Get the UTM CSV
	const utm_csv = await getCSV(generateUTMURL(getYesterday(true)), cookieString);
	console.log(utm_csv);
	//await sheetAppender.appendToSheet(table_id, 'UTM', utm_csv);

	/*
	const response = await fetch(generateWishlistURL(), {
		headers: {
			'Cookie': cookieString
		}
	});

	if (response.ok) {
		const csvContent = await response.text();
		// Save the CSV content to a file
		//require('fs').writeFileSync('data.csv', csvContent);
		console.log(csvContent);
		//addWishlistCSV(csvContent);
	} else {
		console.error('Failed to download CSV:', response.statusText);
	}
	*/
})();

		// Split the CSV string by lines and remove the first two lines
		//const cleanedCsvString = csvString.split('\n').slice(2).join('\n');

async function getCSV (url, cookie) {
	const response = await fetch(url, {
		headers: {
			'Cookie': cookie,
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
			throw new Error("Cookies expired");
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

//				     https://partner.steamgames.com/apps/utmtrafficstats/1411810?preset_date_range=custom&start_date=08%2F25%2F2023&end_date=08%2F25%2F2023&format=csv&content=daily
//                   https://partner.steamgames.com/apps/utmtrafficstats/1411810?preset_date_range=custom&start_date=08%2F24%2F2023&end_date=08%2F24%2F2023&format=csv&content=daily
//					 https://partner.steamgames.com/apps/navtrafficstats/1411810/?attribution_filter=all&preset_date_range=custom&start_date=08%2F25%2F2023&end_date=08%2F25%2F2023&format=csv

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