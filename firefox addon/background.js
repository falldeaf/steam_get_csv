function postCookiesToURL(domain, postURL) {
	// Fetch all cookies for the domain
	function getAllCookiesForDomain(domain) {
		return browser.cookies.getAll({ domain: domain });
	}

	getAllCookiesForDomain(domain).then(cookies => {
		if (cookies.length) {
			// Convert the cookies array to JSON
			let cookieJson = JSON.stringify(cookies, null, 2); // The last two arguments prettify the JSON
			cookieJson = cookieJson.replace(/\s+/g, '');

			//copy to clipboard (optional)
			navigator.clipboard.writeText(cookieJson).then(() => {
				alert('Cookies copied to clipboard!');
			});

			if(postURL == null) return;

			// Convert cookies to a Blob (like a file, but in memory)
			const cookieBlob = new Blob([cookieJson], { type: 'application/json' });

			// Use FormData to simulate a file upload
			const form = new FormData();
			form.append("file", cookieBlob, "cookies.json"); // The third parameter is a filename

			// Send the cookies using fetch
			fetch(postURL, {
				method: 'POST',
				body: form
			})
			.then(response => response.json())
			.then(response => console.log(response))
			.catch(err => console.error(err));

		} else {
			alert('Failed to fetch the cookies.');
		}
	}).catch((error) => {
		console.log("Error fetching the cookies:", error);
	});
}

browser.runtime.onMessage.addListener((message) => {
	if (message.type === "sendCookies") {
		postCookiesToURL(message.domain, message.apiUrl);
	}
});

/*
browser.browserAction.onClicked.addListener(function() {
	const domain = 'partner.steampowered.com';
	const postURL = 'http://localhost:5000/steamcookie';

	postCookiesToURL(domain, postURL);
});

browser.browserAction.onClicked.addListener(function() {
	// Names of all cookies you want to retrieve
	const cookieNames = ['ak_bmsc', 'alignPriorAnnual', 'bm_sv', 'dateEnd', 'dateStart', 'priorDateEnd', 'priorDateStart', 'sessionid', 'steamDidLoginRefresh', 'steamLoginSecure'];

	// Function to get a specific cookie
	function getCookie(name) {
		return browser.cookies.get({
			url: 'https://partner.steampowered.com',
			name: name
		});
	}

	// Use Promise.all to fetch all cookies concurrently
	Promise.all(cookieNames.map(getCookie)).then(cookies => {
		// Filter out any undefined or null results (in case any cookie wasn't retrieved)
		const validCookies = cookies.filter(Boolean);

		if (validCookies.length) {
			// Convert the cookies array to JSON and copy to clipboard
			let cookieJson = JSON.stringify(validCookies, null, 2); // The last two arguments prettify the JSON

			cookieJson = cookieJson.replace(/\s+/g, '');
			navigator.clipboard.writeText(cookieJson).then(() => {
				alert('Cookies copied to clipboard!');
			});
		} else {
			alert('Failed to fetch the cookies.');
		}
	}).catch((error) => {
		console.log("Error fetching the cookies:", error);
	});
});

// Function to POST cookies to a specified URL
function postCookiesToURL(domain, postURL) {
	const cookies = browser.cookies.getAll({ domain: domain });

	const xhr = new XMLHttpRequest();
	xhr.open("POST", postURL, true);
	xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4 && xhr.status === 200) {
			alert('Cookies posted successfully!');
		}
	};
	xhr.send(JSON.stringify({
		file: cookies
	}));
}
*/