/*
 * index.js: Top level include file defining the tubes.io node API.
 */


/**
 * Writes the result object to stdout as JSON and exits.
 *
 * @param err an Error object or null
 * @param result an object to JSON.stringify and print to stdout
 */
function finish (err, result) {
    if (err && err instanceof Error) {
        process.stderr.write(err.message);
        process.exit((err.exitCode === undefined || err.exitCode === null) ? 1 : err.exitCode);
    } else {
        process.stdout.write(JSON.stringify(result, null, 4));
        process.exit(0);
    }
}

module.exports = function (username, apiKey) {
	return {
		finish: finish,
		logging: require('./tubesio/logging'),
		http: require('./tubesio/http')(username, apiKey),
		utils: require('./tubesio/utils')
	}
};