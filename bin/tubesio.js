#!/usr/bin/env node

/*
 * External imports
 */
var argv = require('optimist').argv,
	_ = require('underscore'),    
    http = require('http'),
    nconf = require('nconf');

/*
 * Internal imports
 */
var commands = require('./commands');

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function handleErr(err, command) {
	console.error(err.message);
	//command.help();
}

function usage() {
	console.log('\nUsage: tubesio <command>');
	console.log('');
	console.log('where command is one of:\n');
	console.log('\tcreate, delete, deploy, init, run, rollback');
	process.exit(1);
}

function main() {
	var config, command;
	
	nconf.argv()
         .env()
         .file(process.cwd() + '/.tubesio')
         .file('user', getUserHome() + '/.tubesio')
         .defaults({ host: 'tubes.io' });

	if (argv._.length === 0) {
		usage();
	}

	command = argv._[0]
	if (_.has(commands, command)) {
		command = new commands[command]();
		if (argv._.length > 1 && argv._[1] === 'help') {
			command.help();	
		} else {
			command.run(nconf, argv, function(err, result) {
				if (err) { return handleErr(err, command); }
				console.log(result);
			});
		}
	} else {
		console.error('Unknown command: ' + command);
		usage();
	}
}

main();