const redis = require('redis');
const rclient = redis.createClient();
/*
const service_name = 'steam-stats';
const port = 5000;

rclient.on('error', function(err) {
    console.error('Error:', err);
});

rclient.on('end', function() {
    console.error('Redis client disconnected');
});

rclient.set(service_name, `node.land:${port}`, (err, reply) => {
	if (err) {
		console.error(`Failed to register service: ${err}`);
	} else {
		console.log(`Registered service: ${service_name}`);
	}
});
*/

// List all services
rclient.hgetall('services', (err, services) => {
	if (err) {
	  console.error(`Failed to retrieve services: ${err}`);
	} else if (services === null) {
	  console.log("No active services.");
	} else {
	  console.log('Active services:');
	  for (const [key, value] of Object.entries(services)) {
		console.log(`Service Name: ${key}, URL: ${value}`);
	  }
	}

	// Close the client
	rclient.quit(() => {
	  console.log("Redis client connection closed.");
	});
});
