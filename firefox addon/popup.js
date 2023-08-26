document.getElementById("sendButton").addEventListener("click", function() {
	const domain = document.getElementById("domain").value || 'partner.steampowered.com';
	const apiUrl = document.getElementById("apiUrl").value;

	// Send a message to the background script
	browser.runtime.sendMessage({
		type: "sendCookies",
		domain: domain,
		apiUrl: apiUrl
	});
});