### 
cookies.coffee 

Make a request to amazon.com with a cookie jar and read back the resulting values
from the cookie.
###

###
Required imports (replace '../lib/index' with 'tubesio' when using these outside example dir)
###
tubesio = require('../lib/index')('<insert your username>', '<insert your API key>')

###
Shortcuts
###
request = tubesio.http.request
CookieJar = tubesio.http.CookieJar

###
Globals (make cookieJar global so we can reuse in subsequent requests if we like)
###
cookieJar = new CookieJar
cookieJarBefore = cookieJar.toString()


onComplete = (err, body) ->
	if err then throw err

	# Print out before and after values to show that cookies have been set.
	# Though we're finishing the example here we could just as easily reuse
	# the cookie in a subsequent request such as might be required when 
	# logging into a website.
	tubesio.finish { 
		cookieJarBefore: cookieJarBefore
		cookieJarAfter: cookieJar.toString() 
	}


# Make a request including the cookieJar in our settings object.
request 'http://www.amazon.com', {
	cookieJar: cookieJar
	complete: onComplete
}


