/* 
 * arguments.js 
 *
 * Take a GET or POST value named "query" and use it to perform a 
 * search on duckduckgo.com and return the results.
 */

// Required imports
var tubesio = require('../lib/index')(process.env.USERNAME, process.env.API_KEY),
	http = tubesio.http;

// Optional imports
var jsdom = require('jsdom'),
	us = require('underscore.string');

/**
 * Parses search results into an array.
 */
function parseSearchResults(err, body) {
	if (err) { return tubesio.finish(err); }

	var result = [];

	jsdom.env({
	    html: body,
	    scripts: [
	    	'http://code.jquery.com/jquery-1.5.min.js'
	    ]
	}, function (err, window) {
		if (err) { return tubesio.finish(err); }

	    var $ = window.jQuery;

	    $('#links .results_links').each(function (i) {
			var $a = $(this).find('.links_main a');
			
			result.push({
				title: $a.text(),
				href: $a.attr('href'),
				snippet: us.trim($(this).find('.snippet').text())
			});
		});

		return tubesio.finish(result);
	});
}

/*
 * GET or POST values are passed as a command line argument to 
 * your script in JSON format. As per usual the first two arguments
 * are the program currently executing (node), your script name.
 * Consequently your GET / POST values appear third in the array.
 */
var args;
try {
	args = JSON.parse(process.argv[2]);
} catch (err) {
	tubesio.finish(new Error('Missing query argument.'));
}

/* Perform the request assuming that a value has been passed for 
 * "query" either as a GET or POST argument.
 */
http.request('http://duckduckgo.com/html/?q=' + args.query, parseSearchResults);