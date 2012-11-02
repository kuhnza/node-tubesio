# tubes.io library for Node JS

The tubes.io library for Node JS is a collection of clients and utilities for 
interacting with tubes.io services. The library consists of two parts:

1. [The Command Line Interface](#Command Line Interface) (CLI)
2. [The tubesio Node JS lib](#The tubesio Node JS lib)

## Installation

### Installing NPM

`curl http://npmjs.org/install.sh | sh`

### Installing tubes.io CLI

`[sudo] npm install -g tubesio`


## Command Line Interface

A command-line interface for interacting with the tubes.io API. 

The tubes.io CLI simplifies the process of environment setup and 
subsequent management of hub scripts deployed on tubes.io.com. 

## Environment Setup

Create a working directory where your scripts will live:

`$ mkdir my_username && cd my_username`

Then run:

`$ tubesio init`

This command will prompt you for your tubes.io username and API
key. Your API key can be found on the edit profile page once
logged in over at [tubes.io](tubes.io).

This will download both the necessary and available libraries
for your script once deployed.

## Development Workflow

The current feature set is quite limited. Only automated 
deployments are supported which means you will need to copy/paste
existing scripts from tubes.io.com to your local environment. Creating
new hubs must also be done from the tubes.io website.

By convention scripts should be named `<slug>.js` where slug
is the slugified version of your hub's name. For example if your
hub's name is My 1st Hub then your script name should be
`my-1st-hub.js`. This generally means replacing spaces and
special charachters with dashes. If you're unsure of what your
hub's slug name is you should take a look at your hub's endpoint. 
The slug will be the portion after the last "/" and before the format
".json" (e.g. http://tubes.io.com/username/hub/_my-1st-hub_.json)

Once you've copied your hub down into your local work directory
you can deploy by running:

`$ tubesio deploy my-1st-tube`

> A word of warning: The change will take effect immediately. In
> case you need to rollback, a backup of the previous script is 
> created with the .bak extension in your working directory. This
> can be deployed using the `-f` switch to specify an alternate
> file to use instead of the default. For example:
>    `$ tubes.io deploy -f my-1st-tube.js.bak my-1st-tube`

## The tubesio Node JS lib

### Modules

* tubesio.[request](#request)
* tubesio.[utils](#utils)

#### Request 

TODO

#### Utils

TODO

## Supported Languages

Only JavaScript (Node JS) is supported at present but we have 
plans to add CoffeeScript and Python in the near future.


