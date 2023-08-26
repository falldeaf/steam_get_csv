function generateSteamURL() {
	// Get 'yesterday' date and format to YYYY-MM-DD
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	const formattedDate = yesterday.toISOString().slice(0, 10);

	const baseURL = "https://partner.steampowered.com/report_csv.php?file=SteamWishlists_1411810_";
	const params = `&params=query=QueryWishlistActionsForCSV^appID=1411810^dateStart=${formattedDate}^dateEnd=${formattedDate}^interpreter=WishlistReportInterpreter`;

	return baseURL + formattedDate + "_to_" + formattedDate + params;
}

// Generate and log the updated URL
const updatedURL = generateSteamURL();
console.log(updatedURL);