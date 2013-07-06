### 
jsdom.coffee 

Using JSDom to parse the page and collect values using jQuery: 
take a GET or POST value named "query" and use it to perform a 
search on duckduckgo.com and return the results. 
### 

# Required import
tubesio = require("../../lib/index")("<insert your username>", "<insert your API key>")

# Optional imports
jsdom = require "jsdom"
us = require "underscore.string"

# Globals
request = tubesio.http.request
args = tubesio.utils.args.demand("query")

###
Parses search results into an array.
###
parseSearchResults = (err, body) ->
    return tubesio.finish(err)  if err

    # Bootstrap a JSDom environment with a sideloaded copy of jQuery
    jsdom.env
        html: body
        scripts: ["http://code.jquery.com/jquery-1.5.min.js"]
    , (err, window) ->
        return tubesio.finish(err)  if err

        result = []

        # Iterate through the result set using familar jQuery selectors and functions.
        $ = window.jQuery
        $("#links .results_links").each (i) ->
            $a = $(this).find(".links_main a")
            result.push
                title: $a.text()
                href: $a.attr("href")
                snippet: us.trim($(this).find(".snippet").text())

        # Return the result
        tubesio.finish result

# Perform the request assuming that a value has been passed for 
# "query" either as a GET or POST argument. 
request "http://duckduckgo.com/html/?q=#{args.query}", parseSearchResults