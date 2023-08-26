const puppeteer = require('puppeteer');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

(async () => {
	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();

	await page.goto('https://partner.steampowered.com/app/details/1411810/?dateStart=2023-08-14&dateEnd=2023-08-14');

	// Wait for user to manually complete the login and 2FA processes...
	console.log("Complete the login and 2FA, then press ENTER to continue...");

	rl.question('Press ENTER when you have finished logging in...', (answer) => {
		rl.close();

		// Proceed to save the cookies after the user has pressed ENTER
		(async () => {
			const cookies = await page.cookies();

			// Save cookies to a file or database as before...
			require('fs').writeFileSync('cookies.json', JSON.stringify(cookies));

			await browser.close();
		})();
	});
})();
