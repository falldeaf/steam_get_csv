require('dotenv').config();
const fetch = require('node-fetch');
const expressMapper = require('./expressmapper.js');
const GoogleSheetAppender = require('./GoogleSheetAppender');

const em = new expressMapper('config.json', 5000, false);

em.defineLog('mylog', 50, 'Logs');

em.defineAction('test', () => {
	console.log('test');
	em.appendLog('mylog', 'test');
}, '');

em.defineFileUpload('steamcookie', 2 * 1024 * 1024, 'steamcookie.json', 'File Uploads');

em.defineSwitch('getwishlistsswitch', 'Switches');

em.defineCron('getwishlists', async () => {
	if(!em.isSwitchOn('getwishlistsswitch')) return;

	console.log('Get Wishlists!');

	// Load the saved cookies
	const cookies = require('./steamcookie.json');

	// Format cookies for the request header
	const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

	// Get the Wishlist CSV
	const wl_csv = await getCSV(generateWishlistURL(), cookieString);

	if(wl_csv == null) {
		em.appendLog('mylog', "couldn't get wishlist csv");
		em.setSwitch('getwishlistsswitch', false);
		return;
	} else {
		// Split the CSV string by lines and remove the first two lines
		const cleanedCsvString = wl_csv.split('\n').slice(2).join('\n');
		airtable.addWishlistCSV(cleanedCsvString);
		em.appendLog('mylog', "Wishlists: success");
	}
}, 'Cron Tasks');

em.defineSwitch('getutmswitch', 'Switches');

em.defineCron('getutm', async () => {
	if(!em.isSwitchOn('getutmswitch')) return;

	console.log('Get UTM!');

	// Load the saved cookies
	const cookies = require('./steamcookie.json');

	// Format cookies for the request header
	const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

	// Get the UTM CSV
	const utm_csv = await getCSV(generateUTMURL(), cookieString);
	airtable.addRecordsFromCSV(utm_csv, process.env.AIRTABLE_UTM_TABLE);

	if(utm_csv == null) {
		em.appendLog('mylog', "couldn't get utm csv");
		em.setSwitch('getutmswitch', false);
		return;
	} else {
		airtable.addRecordsFromCSV(utm_csv, process.env.AIRTABLE_UTM_TABLE);
		em.appendLog('mylog', "UTM: success");
	}

}, 'Cron Tasks');

// On server restart, the loaded configurations will apply.
em.listen();

async function getCSV (url, cookie) {
	const response = await fetch(url, {
		headers: {
			'Cookie': cookie
		}
	});

	//if csvContent starts with <!DOCTYPE HTML> then the cookies are expired
	if(csvContent.startsWith("<!DOCTYPE HTML>")) return null;

	if (response.ok) {
		const csvContent = await response.text();
		// Save the CSV content to a file
		//require('fs').writeFileSync('data.csv', csvContent);
		return csvContent;
	} else {
		console.error('Failed to download CSV:', response.statusText);
		return null;
	}
}

function generateWishlistURL() {
	// Get 'yesterday' date and format to YYYY-MM-DD
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	const formattedDate = yesterday.toISOString().slice(0, 10);

	const baseURL = "https://partner.steampowered.com/report_csv.php?file=SteamWishlists_1411810_";
	const params = `&params=query=QueryWishlistActionsForCSV^appID=1411810^dateStart=${formattedDate}^dateEnd=${formattedDate}^interpreter=WishlistReportInterpreter`;

	return baseURL + formattedDate + "_to_" + formattedDate + params;
}

// generateUTMURL(); https://partner.steamgames.com/apps/utmtrafficstats/1411810?preset_date_range=yesterday&start_date=08%2F17%2F2023&end_date=08%2F18%2F2023&format=csv&content=daily
function generateUTMURL() {
	// Get 'yesterday' date and format to MM/DD/YYYY
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	const formattedDate = yesterday.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'});

	const baseURL = "https://partner.steamgames.com/apps/utmtrafficstats/1411810?preset_date_range=yesterday&start_date=";
	const params = "&end_date=" + formattedDate + "&format=csv&content=daily";

	return baseURL + formattedDate + params;
}