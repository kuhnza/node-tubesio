var _ = require('underscore'),
	async = require('async'),
	http = require('http'),
	url = require('url'),	
	util = require('util');

function basicAuthHeader(username, apiKey) {
	return {
		'Authorization': 'apikey ' + new Buffer(username + ':' + apiKey).toString('base64')
	}
}

/**
 * BaseCommand: An abstract base class for commands to implement. 
 */
function BaseCommand() {}

_.extend(BaseCommand.prototype, {
	help: function () {},
	run: function (nconf, argv, callback) {
		console.error('Not implemented.');
	}
});


/**
 * PrivilegedCommand: Abstract base class for commands that access protected
 * Hubify APIs.
 */
function PrivilegedCommand() {
	BaseCommand.call(this);
}

util.inherits(PrivilegedCommand, BaseCommand);

_.extend(PrivilegedCommand.prototype, {
	checkCredentialsExist: function(nconf) {		
		if (!nconf.get('username')) {
			throw new Error('Missing username! Specify it using --username argument or run `hubify init`.');		
		}

		if (!nconf.get('apiKey')) {
			throw new Error('Missing API key! Specify it using --apiKey argument or run `hubify init`.');
		}	
	}
})


/**
 * Creates a new hub script.
 */
function CreateCommand() {
	PrivilegedCommand.call(this);
}

util.inherits(CreateCommand, BaseCommand);


/**
 * Deploys a hub script.
 */
function DeployCommand() {
	PrivilegedCommand.call(this);
}

util.inherits(DeployCommand, PrivilegedCommand);

_.extend(DeployCommand.prototype, {
	help: function() {
		console.log('\nUsage: hubify deploy [-f filename] hub-name\n' +
					'\n' +
					'Deploys a hubscript to hubify. Unless -f option is ' + 
					'provided will look for a script of the same name as the ' + 
					'hub ending in .js in the current directory.\n' +					
					'\nWhere:\n' +
					'  -f\tFilename of the file to deploy.\n' +
					'\nNote: deployed scripts take immediate effect.\n');
	},
	run: function (nconf, argv, callback) {
		try {
			this.checkCredentialsExist(nconf);
		} catch (err) {
			return callback(err);
		}

		if (argv._.length < 2) {
			return callback(new Error('Missing argument: hub-name.'));
		}

		var filename,
			fs = require('fs'),
			hubName = argv._[1];

		if (argv.f) {
			filename = argv.f;
		} else {
			// TODO support other file types
			filename = hubName + '.js';
		}

		var host = nconf.get('host')
			username = nconf.get('username'),
			apiKey = nconf.get('apiKey');

		async.waterfall([
			function (callback) {
				// Read hub script in from local file
				fs.readFile(filename, function (err, data) {
					if (err) { return callback(err); }

					callback(null, data.toString());
				});
			},
			function (script, callback) {
				// Lookup hub ID/details via username and slug
				var options = url.parse('http://' + host + '/api/v1/hub/?owner__username=' + username + '&slug=' + hubName);			
				options.headers = basicAuthHeader(username, apiKey);

				var req = http.request(options, function (res) {
					if (res.statusCode == 401 || res.statusCode === 403) {
						return callback(new Error('Unable to complete your request. Invalid credentials supplied.'));
					} else if (res.statusCode >= 400) {
						return callback(new Error('Unable to complete your request. Server returned ' + res.statusCode));
					}

					var body = '';
					res.on('data', function (chunk) {
						body += chunk;
					});

					res.on('end', function () {
						var responseData = JSON.parse(body);
						if (responseData.total === 0) {
							return callback(new Error('Deployment failed. Hub `' + hubName + '` does not exist.'));
						}

						var hub = responseData.results[0];
						fs.writeFileSync(filename + '.bak', hub.definition);

						callback(null, script, hub);
					});
				});

				req.on('error', function (err) {				
					callback(err);
				});	

				req.end();
			}, function (script, hub, callback) {
				var payload = JSON.stringify({ definition: script }),
					options = url.parse('http://' + host + '/api/v1/hub/'  + hub.id + '/');
					options.method = 'PUT';
					options.headers = basicAuthHeader(username, apiKey);
					options.headers['Content-Type'] = 'application/json';
					options.headers['Content-Length'] =	payload.length;

				var req = http.request(options, function (res) {					
					if (res.statusCode == 401 || res.statusCode === 403) {
						return callback(new Error('Unable to complete your request. Invalid credentials supplied.'));
					} else if (res.statusCode >= 400) {
						return callback(new Error('Unable to complete your request. Server returned ' + res.statusCode));
					}

					callback(null, 'Deployed.');
				});

				req.on('error', function (err) {
					callback(err);
				});											

				req.write(payload);				
				req.end();							
			}	
		], function (err, result) {
			if (err) { return callback(err); }

			callback(null, result);
		});
	}
});

/**
 * Initialises a hubify development environment in the current directory.
 */
function InitCommand() {
	BaseCommand.call(this);
}

util.inherits(InitCommand, BaseCommand);

_.extend(InitCommand.prototype, {
	deps: ['async', 'cheerio', 'jsdom', 'underscore', 'underscore.string', 'hubstack'],
	help: function() {
		console.log('\nUsage: hubify init\n' +
					'\n' +
					'Initialises a hubify development environment in the ' +
					'current directory.');
	},
	run: function(nconf, argv, callback) {
		var self = this,
			npm = require('npm'),
			prompt = require('prompt'),
			properties = [{
				name: 'username',
			    description: 'Enter your Hubify username:'.white,
			    message: 'Username cannot be blank.', 		      		      
			    required: true
			},{
				name: 'apiKey',
			    description: 'Enter your Hubify API key:'.white, 		      		      
			    message: 'API key cannot be blank.',
			    required: true
			}];

		prompt.message = '';
		prompt.delimiter = '';

		prompt.start();

		prompt.get(properties, function (err, result) {
		    if (err) { return handleErr(err, self); }

		    async.series([
		    	function (callback) {
		    		nconf.set('username', result.username);
		    		nconf.set('apiKey', result.apiKey);

		    		nconf.save(function (err) {
		    			if (err) { callback(err); }
		    			callback(null);
		    		});
		    	},
		    	function (callback) {
		    		npm.load(function () {
		    			npm.commands.install(self.deps, function (err) {
		    				callback(err);
		    			})
		    		});
		    	}
		   	], function (err, result) {
		   		if (err) { return callback(err); }

		   		callback(null, 'Initialized.')
		   	});
		});
	}
});


/**
 * Creates a new hub script.
 */
function RollbackCommand() {
	PrivilegedCommand.call(this);
}

util.inherits(RollbackCommand, BaseCommand);

_.extend(RollbackCommand.prototype, {
	help: function() {
		console.log('\nUsage: hubify rollback [-f filename] hub-name\n' +
					'\n' +
					'Rolls back to previous version of hubscript. Unless -f option is ' + 
					'provided will look for a script of the same name as the ' + 
					'hub ending in .bak in the current directory.\n' +					
					'\nWhere:\n' +
					'  -f\tFilename of the file to deploy.\n' +
					'\nNote: deployed scripts take immediate effect.\n');
	},
});


module.exports = {
	create: CreateCommand,
	delete: BaseCommand,
	deploy: DeployCommand,
	init: InitCommand,
	run: BaseCommand,
	rollback: BaseCommand
};