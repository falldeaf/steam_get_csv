require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');

async function getLatestSteamGuardCode(targetSubject = 'Your Steam account: Access from new web or mobile device') {

	const user = process.env.EMAIL_USER;
	const password = process.env.EMAIL_PASS;
	const host = process.env.EMAIL_HOST;

	return new Promise((resolve, reject) => {
		const imap = new Imap({
			user: user,
			password: password,
			host: host,
			port: 993,
			tls: true,
			tlsOptions: { rejectUnauthorized: false }
		});

		imap.once('ready', function() {
		imap.openBox('INBOX', false, function(err, box) {
			if (err) {
			reject(err);
			return;
			}

			const searchCriteria = [
				'UNSEEN',
				['SINCE', 'August 28, 2023']
			];

			const fetchOptions = {
			bodies: ['HEADER', 'TEXT'],
			markSeen: false
			};

			imap.search(searchCriteria, function(err, results) {
			if (err) {
				reject(err);
				return;
			}

			if (!results || results.length === 0) {
				resolve(null);
				return;
			}

			const fetchedMails = imap.fetch(results, fetchOptions);

			let latestMail;

			fetchedMails.on('message', function(msg, seqno) {
				let mailBody = '';
				let mailHeader = '';

				msg.on('body', function(stream, info) {
					let buffer = '';

					stream.on('data', function(chunk) {
						buffer += chunk.toString('utf8');
					});

					stream.once('end', async function() {
						if (info.which === 'HEADER') {
							mailHeader = buffer;
							//console.log(mailHeader);
							const parsedHeader = await simpleParser(mailHeader);
							if (parsedHeader.subject === targetSubject) {
								latestMail = parsedHeader;
								//latestMail.text = mailBody;
							}
						} else {
							//console.log(buffer);
							mailBody = buffer;
							latestMail.text = mailBody;


							let regex = /Login Code\s*([A-Z0-9]+)/;
							let match = latestMail.text.match(regex);

							if(match) {
								let code = match[1];
								//console.log("Your Steam Guard code is: " + code);
								latestMail.code = code;
							} else {
								//console.log("No Steam Guard code found in text.");
								latestMail.code = null;
							}

						}
					});
				});
			});

			fetchedMails.once('error', function(err) {
				reject(err);
			});

			fetchedMails.once('end', function() {
				resolve(latestMail.code);
				imap.end();
			});
			});
		});
		});

		imap.once('error', function(err) {
		reject(err);
		});

		imap.once('end', function() {
			//console.log('Connection ended');
		});

		imap.connect();
	});
}

module.exports = getLatestSteamGuardCode;

/*
// Usage example:
(async function() {
	console.log(await checkEmailForSubject());
})();
*/