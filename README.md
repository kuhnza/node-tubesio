# tubes.io library for node

The tubes.io library for [node](http://nodejs.org) is a collection of clients and utilities for 
interacting with tubes.io services. The library consists of two parts:

1. The [Command Line Interface](#command-line-interface) (CLI)
2. The [tubes.io node lib](#tubesio-node-lib)

## Installation

### Installing NPM

`curl http://npmjs.org/install.sh | sh`

### Installing tubes.io CLI

`[sudo] npm install -g tubesio`


## Command Line Interface

A command-line interface for interacting with the tubes.io API. 

The tubes.io CLI simplifies the process of environment setup and 
subsequent management of hub scripts deployed on tubes.io. 

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

## tubes.io node lib

### Modules

* tubesio.[http](#http)
* tubesio.[logging](#logging)
* tubesio.[utils](#utils)

#### HTTP 

TODO

#### Logging

TODO

#### Utils

TODO

## Supported Languages

Only JavaScript and CoffeeScript running atop node is supported at present but we have 
plans to add more languages in future. If you'd like a particular language added then
[let us know](mailto:ideas@tubes.io). The more support we get for a language the greater 
the chance it will be added.


