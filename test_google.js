const GoogleSheetAppender = require('./GoogleSheetAppender');

async function main() {
	const csvString = `DateLocal,Game,Adds,Deletes,PurchasesAndActivations,Gifts
	2023-08-25,Dark Tides,15,14,2,1`;  // Replace with your CSV string
	const sheetAppender = new GoogleSheetAppender('steam-analytics--1600495923903-fdb3b8fb81a8.json');

	await sheetAppender.appendToSheet('1R8sFXajny02SsvJuU77TnVL122o3KwX1ddYaNiKEOFo', 'Wishlists', csvString);
}

main().catch(console.error);