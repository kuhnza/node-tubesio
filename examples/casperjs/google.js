/*
 * google.js
 *
 * Perform two searches on Google and aggregate the results.
 *
 * Adapted from the basic example at http://casperjs.org/
 */

var links = [];
var casper = require("casper").create(); 

function getLinks() {
    var links = document.querySelectorAll("h3.r a");
    return Array.prototype.map.call(links, function(e) {
        try {
            // google handles redirects hrefs to some script of theirs
            return (/url\?q=(.*)&sa=U/).exec(e.getAttribute("href"))[1];
        } catch (err) {
            return e.getAttribute("href");
        }
    });
}

casper.start("https://www.google.com/", function() {
    // search for 'tubes.io' from google form
    this.fill('form[action="/search"]', { q: "tubes.io" }, true);
});

casper.then(function() {
    // aggregate results for the 'tubesio' search
    links = this.evaluate(getLinks);
    // now search for 'casperjs' by fillin the form again
    this.fill('form[action="/search"]', { q: "casperjs" }, true);
});

casper.then(function() {
    // aggregate results for the 'phantomjs' search
    links = links.concat(this.evaluate(getLinks));
});

casper.run(function() {
    console.log(JSON.stringify(links));
    this.exit();
});