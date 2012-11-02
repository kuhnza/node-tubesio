/*
 * tubesio.js: Top level include file defining the Hubify node libs.
 */


/**
 * Writes the result object to stdout as JSON and exits.
 * 
 * @param result an object to JSON.stringify and print to stdout
 */
function finish (result) {	
	process.stdout.write(JSON.stringify(result));
	process.exit(0);
}

module.exports = function (username, apiKey) {
	return {
		finish: finish,
		logging: require('./tubesio/logging'),
		http: require('./tubesio/http')(username, apiKey),
		utils: require('./tubesio/utils')
	}
};