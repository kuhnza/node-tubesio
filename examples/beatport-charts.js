/* 
 * electro-house-top-100.js 
 *
 * Scrape the Top 100 Electro house tracks from beatport.com
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

        $('table.track-grid-top-100 tr').each(function (i) {
            if (i === 0) { return; } // Skip header row

            var $row = $(this);
            
            result.push({
                position: parseInt($row.find('td:nth-child(1)').text()),
                trackName: $row.find('td:nth-child(4) > a').text(),
                artists: $row.find('td:nth-child(5) > a').text(),
                remixers: $row.find('td:nth-child(6) > a').text(), 
                label: $row.find('td:nth-child(7) > a').text(),
                genre: $row.find('td:nth-child(8) > a').text(),
                releaseDate: Date.parse($row.find('td:nth-child(9)').text())
            });
        });

        return tubesio.finish(result);
    });
}

/* Perform the request assuming that a value has been passed for 
 * "query" either as a GET or POST argument.
 */
http.request('http://www.beatport.com/genre/electro-house/17/top-100', parseSearchResults);
