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
2. [tubesio node lib](#tubesio-node-lib)

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

## tubesio node lib

Usage of the tubesio node library is probably best demonstrated by example. Here's a simple node
script that performs a HTTP request, parses the resulting HTML and extracts the page title:

```javascript
// Required import
var tubesio = require('tubesio')(process.env.USERNAME, process.env.API_KEY);

// Optional imports
var cheerio = require('cheerio'),
    request = tubesio.http.request;

request('http://tubes.io/', {
    complete: function (err, body) {
       if (err) {           
           return tubesio.finish(err);
       }
       
       var $ = cheerio.load(body);
       tubesio.finish({ 
           title: $('title').text()
       });            
    }
});
```

The first line imports the tubesio lib. Notice the two arguments passed to the
call to require. This is required for authentication against tubesio services
such as the HTTP proxies. By convention we can pass these details in directly
making use of the fact that the node runtime environment has your username and 
API key set for your convenience. Of course these are just strings and can be
hard-coded if you require it.

Next we import [cheerio](https://github.com/MatthewMueller/cheerio) which is a
nice, lightweight DOM parsing and normalizing library with support for jQuery
like selectors and syntax. We also create a shortcut reference to the tubesio
[request](#request) method.

Calling the request method we pass the URL and attach a callback to the `complete` 
property of the request settings object. The callback is passed the body of
the resulting HTTP response. We then load the body into cheerio and extract the
title text out. 

Lastly a call to the [finish](#tubesio-finish) completes the request. It's 
important that all code paths eventually call `finish`. Neglecting to do so
will cause your script to timeout as the node runtime won't know when
your script is finished. The `finish` method is also important because the 
data you pass to it is what gets returned from the API. `finish` only accepts
objects that are JSON serializable (i.e. passing a naked number or string 
won't work).


### Modules

* [tubesio.http](#http)
* [tubesio.logging](#logging)
* [tubesio.utils](#utils)

#### tubesio.http 

TODO

#### tubesio.logging

TODO

#### tubesio.utils

TODO

## Supported Languages

Only JavaScript and CoffeeScript running atop node is supported at present but we have 
plans to add more languages in future. If you'd like a particular language added then
[let us know](mailto:ideas@tubes.io). The more support we get for a language the greater 
the chance it will be added.


