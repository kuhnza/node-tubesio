/*
 * custom-proxy.js
 *
 * This example demonstrates how to set a custom proxy server for 
 * an individual request. This may be required if for some reason
 * the tubes.io servers are banned from a particular domain.
 *
 * The proxy may be set for an individual request via the settings
 * object as shown below. It can also be set globally via the 
 * tubesio.http.setProxy method which will then apply to all 
 * subsequent requests.
 */

// Required imports
var tubesio = require('../lib/index')(process.env.USERNAME, process.env.API_KEY),
	http = tubesio.http;

// Optional imports
var cheerio = require('cheerio'),
	us = require('underscore.string');


/**
 * Parses the result of github.com/explore and extracts the
 * trending repositories.
 */
function parseGitHubTrendingRepos(err, body) {
	if (err) { return tubesio.finish(err); }

	// Load the raw HTML into a cheerio object so we can traverse
	// the data using CSS selectors ala jQuery.
	var $ = cheerio.load(body),
		result = {
			title: $('title').text(),
			trending: []
		};

	// Iterate over the trending repositories extracting the names
	// and hyperlinks.
	$('#trending-repositories > ol > li').each(function (i, e) {
		result.trending.push({
			name: us.trim($(e).find('h3').text()),
			href: 'https://github.com' + $(e).find('a').last().attr('href')
		});
	});

	// Return our results object
	tubesio.finish(result);	
}

/* Note the change the proxy from tubes.io to a custom one in the
 * request settings object. The proxy was chosen randomly from 
 * from http://www.hidemyass.com/proxy-list/ and may not work 
 * forever. Plug in your own if it no longer works. */
var settings = {
		complete: parseGitHubTrendingRepos,
		proxy: {
		 	host: '192.211.49.210', 
		 	port: 3128
		}
	};

// Make the request
http.request('https://github.com/explore', settings);