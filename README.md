<pre>
       ____   
______|    |  
      |    |    __        __                _        
      |    |   / /___  __/ /_  ___  _____  (_)___   
      |    |  / __/ / / / __ \/ _ \/ ___/ / / __ \  
      |    | / /_/ /_/ / /_/ /  __(__  ) / / /_/ /  
      |    | \__/\__,_/_.___/\___/____(_)_/\____/   
______|    |                                        
      |____|                                         
</pre>

The tubes.io library for [node](http://nodejs.org) is a collection of clients and utilities for 
interacting with tubes.io services. The library consists of two parts:

1. [Command Line Interface](#command-line-interface) (CLI)
2. [tubesio lib](#tubesio-lib)

The CLI is used to manage scripts and deployments while the library is meant to be included
in your node or coffee scripts to provide access to essential tubes.io services such as 
the proxy servers and other commonly used tools.

## Installation

#### Installing npm

`curl http://npmjs.org/install.sh | sh`

#### Installing tubesio 

`[sudo] npm install -g tubesio`


## Command Line Interface

The tubes.io CLI simplifies the process of environment setup and 
subsequent management of scripts deployed on tubes.io. This is 
what you'll want to use if you plan on developing scripts using
your own IDE and storing scripts in some kind of version control
instead of the web-based interface.

## Getting Started

Create a working directory where your scripts will live:

`$ mkdir my_username && cd my_username`

Then run:

`$ tubesio init`

This command will prompt you for your tubes.io username and API
key. Your API key can be found on the edit profile page once
logged in over at [tubes.io](tubes.io).

This will download both the necessary and available libraries
for your script once deployed. It will also create a .tubesio
file in the current working directory containing your environment
configuration.

## Development Workflow

The current feature set is quite limited. Only automated 
deployments are supported which means you will need to copy/paste
existing scripts from tubes.io to your local environment. Creating
new tubes must also be done from the tubes.io website.

By convention scripts should be named `<slug>.js` where slug
is the slugified version of your tube's name. For example if your
tube's name is My 1st Tube then your script name should be
`my-1st-tube.js`. This generally means replacing spaces and
special charachters with dashes. If you're unsure of what your
tube's slug name is you should take a look at your tube's endpoint. 
The slug will be the portion after the last "/" and before the format
".json" (e.g. http://tubes.io/username/tube/_my-1st-tube_.json)

Once you've copied your hub down into your local work directory
you can deploy by running:

`$ tubesio deploy my-1st-tube`

> A word of warning: The change will take effect immediately. In
> case you need to rollback, a backup of the previous script is 
> created with the .bak extension in your working directory. This
> can be deployed using the `-f` switch to specify an alternate
> file to use instead of the default. For example:
>    `$ tubes.io deploy -f my-1st-tube.js.bak my-1st-tube`

You can test the deployed script by running:

`curl <endpoint URL>`

> Note: be sure to include your API key in the querystring and any other args your tube requires.

## tubesio lib

Usage of the tubesio node library is probably best demonstrated by example. Here's a simple node
script that performs a HTTP request, parses the resulting HTML and extracts the page title:

```javascript
// Required import
var tubesio = require('tubesio')('<username>', '<apiKey>');

// Optional imports
var cheerio = require('cheerio');

// Shortcuts
request = tubesio.http.request,
args = tubesio.utils.args.demand('name'),
last = tubesio.utils.lastResult;

request('http://tubes.io/', {
    complete: function (err, body) {
       if (err) {           
           return tubesio.finish(err);
       }

       var $ = cheerio.load(body);
       tubesio.finish(null, {
           title: $('title').text(),
           hello: args.name,
           lastHello: last.hello
       });            
    }
});
```

The first line imports the tubesio lib. Notice the two arguments passed to the
call to require. This is required for authentication against tubesio services
such as the HTTP proxies.

Next we import [cheerio](https://github.com/MatthewMueller/cheerio) which is a
nice, lightweight DOM parsing and normalizing library with support for jQuery
like selectors and syntax. We also create a shortcut reference to the tubesio
[request](#request) method.

After that we set up some additional shortcuts to the request method for brevity,
the tube arguments (passed as either GET or POST parameters) and the result of
the last tube run (this will be populated if you turn on "Cache Last Result" in
your tube settings).

Calling the request method we pass the URL and attach a callback to the `complete` 
property of the request settings object. The callback is passed the body of
the resulting HTTP response. We then load the body into cheerio and extract the
title text out. 

Lastly a call to the [finish](#tubesio.finish) completes the request. It's
important that all code paths eventually call `finish`. Neglecting to do so
will cause your script to timeout as the node runtime won't know when
your script is finished. The `finish` method is also important because the 
data you pass to it is what gets returned from the API. 

> Note: `finish` only accepts objects that are JSON serializable (i.e. passing 
> a naked number or string won't work).


### Modules

* [tubesio](#tubesio)
* [tubesio.http](#tubesiohttp)
* [tubesio.logging](#tubesiologging)
* [tubesio.utils](#tubesioutils)

#### tubesio

##### tubesio.finish(err, result)

Exits the current script.

The `err` argument if defined and an instance of `Error` will cause the script
to exit with a non-zero exit code and will print the error message to stderr. The
exit code defaults to 1 but may be overridden by setting the exitCode property of
the err object.

The `result` argument should be a plain Javascript object representing the
data you wish to output. The result will be passed through JSON.stringify and
printed to stdout before exiting with exit code 0.

#### tubesio.http 

##### request(location, [settings])

A vastly simplified and elegant HTTP request method. Supports smart
switching between HTTP/HTTPS based on URL, automatic GZIP and DEFLATE 
decompression, object serialization and proxy servers. 

> Important: It's strongly advised that you use this function over 
> node's raw http.request or other third party libraries as it automatically 
> proxies requests via our IP rotation service. We will not provide support
> for people wishing to use other methods.

The `location` argument should be a string containing a URL or an object 
containing a `location` property set to the URL being requested.

The `settings` argument can be either a callback function or an object
containing a `complete` property set to the callback function to call
when the request completes.

Settings:

* complete: a callback function that takes the arugments err, body.
* cookieJar: an instance of CookieJar for cookie support. Defaults to null.
* data: a string or object. Strings are sent verbatim whilst objects are serialized 
according to the content-type set in the headers. Method will also be set to `POST` 
where method is not explicitly set. Currently detects `application/x-www-form-urlencoded` 
and `application/json`. Where no content-type header exists defaults to form encoding. 
* headers: an object containing key-value pairs of headers to send with request.
* method: the HTTP method to perform the request with. Defaults to `GET`.

##### setProxy(config)

Sets the global proxy configuration object. This will impact all requests during the lifetime
of the script. Under normal circumstances calling setProxy is not required. Importing
the tubesio library automatically configures the correct proxy.

The `config` argument can be a string, object or function. Strings are processed using
node's [url.parse](http://nodejs.org/docs/latest/api/url.html#url_url_parse_urlstr_parsequerystring_slashesdenotehost)
method. When passing a function it should produce either a string or configuration object.

Configuration objects should conform to the following structure:

```javascript
{
    host: 'hostname',
    port: 80,
    proxyAuth: 'user:pass'
}
```

> Note: port and proxyAuth are optional. Defaults to port 80 and no authentication.

##### Class: CookieJar

CookieJar provides cookie support and persistance across HTTP requests. It behaves like
a browser for the most part, simply accepting cookies and storing their values as well 
as passing cookie values with subsequent requests.

As a rule you shouldn't need to use the CookieJar class directly. Creating a CookieJar
instance and passing it with your requests is all that's required.

Example:

```javascript
var cookieJar = tubesio.http.CookieJar();

request('http://tubes.io', { 
    cookieJar: cookieJar,
    complete: function () { ... }
});
```

> Note: you should create the CookieJar instance in the global scope in order to persist
> and reuse it across requests.

###### cookieJar.get(key)

###### cookieJar.getValue(key)

###### cookieJar.set(cookieString)

###### cookieJar.toString()

#### tubesio.logging

##### Class: Logger

A logger that logs exclusively to stderr. Includes timestamps in log output 
and supports log level filtering.

###### logger.log(level, message)

###### logger.verbose(message)

###### logger.info(message)

###### logger.warn(message)

###### logger.error(message)

#### tubesio.utils

Utility functions and helpful properties.

##### args

An object containing your GET or POST parameters.

##### lastResult

An object containing the result of the last successful run of your tube. One of it's uses is for diffing against the
current result set to see if anything has changed.

This property will be null unless "Cache Last Result" is turned on within the tube meta/settings.

## Supported Languages

Only JavaScript and CoffeeScript running atop node is supported at present but we have 
plans to add more languages in future. If you'd like a particular language added then
[let us know](mailto:ideas@tubes.io). The more support we get for a language the greater 
the chance it will be added.


