/* 
 * cookies.js 
 *
 * Make a request to amazon.com with a cookie jar and read back the resulting values
 * from the cookie.
 */

var CookieJar, cookieJar, cookieJarBefore, onComplete, request, tubesio;

/*
 * Required imports (replace '../../lib/index' with 'tubesio' when using these outside example dir)
 */
tubesio = require('../../lib/index')('<insert your username>', '<insert your API key>');

/*
Shortcuts
*/
request = tubesio.http.request;
CookieJar = tubesio.http.CookieJar;


/*
 *Globals (make cookieJar global so we can reuse in subsequent requests if we like)
 */
cookieJar = new CookieJar;
cookieJarBefore = cookieJar.toString();

onComplete = function(err, body) {
    if (err) { throw err; }

    return tubesio.finish({
        cookieJarBefore: cookieJarBefore,
        cookieJarAfter: cookieJar.toString()
    });
};

request('http://www.amazon.com', {
    cookieJar: cookieJar,
    complete: onComplete
});
