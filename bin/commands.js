var async = require('async'),
	cp = require('child_process'),
	http = require('http'),
	url = require('url'),	
	util = require('util');

var _  = require('underscore');
_.str = require('underscore.string'); // Import Underscore.string to separate object, because there are conflict functions (include, reverse, contains)
_.mixin(_.str.exports()); // Mix in non-conflict functions to Underscore namespace if you want
_.str.include('Underscore.string', 'string');  // All functions, include conflict, will be available through _.str object


function basicAuthHeader(username, apiKey) {
	return {
		'Authorization': 'apikey ' + new Buffer(username + ':' + apiKey).toString('base64')
	}
}

function getExtension(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i);
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
 * tubes.io APIs.
 */
function PrivilegedCommand() {
	BaseCommand.call(this);
}

util.inherits(PrivilegedCommand, BaseCommand);

_.extend(PrivilegedCommand.prototype, {
	checkCredentialsExist: function(nconf) {		
		if (!nconf.get('username')) {
			throw new Error('Missing username! Specify it using --username argument or run `tubesio init`.');		
		}

		if (!nconf.get('apiKey')) {
			throw new Error('Missing API key! Specify it using --apiKey argument or run `tubesio init`.');
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

_.extend(CreateCommand.prototype, {
	help: function() {

	},
	run: function(nconf, argv, callback) {
		try {
			this.checkCredentialsExist(nconf);
		} catch (err) {
			return callback(err);
		}

		var self = this,
			npm = require('npm'),
			prompt = require('prompt'),
			properties = [{
				name: 'name',
			    description: 'Give your tube a name:'.white,
			    message: 'Name cannot be blank.', 		      		      
			    required: true
			}];

		prompt.message = '';
		prompt.delimiter = '';

		prompt.start();

		prompt.get(properties, function (err, result) {
		    if (err) { return handleErr(err, self); }

			var options, req, data;

			data = JSON.stringify({
				owner: nconf.get('username'),
				name: result.name
			});

			options = url.parse('http://' + host + '/api/v1/hub/');
			options.method = 'POST';			
			options.headers = basicAuthHeader(username, apiKey);
			options.headers['Content-Type'] = 'application/json';
			options.headers['Content-Length'] = data.length;

			req = http.request(options, function (res) {
				var body = '';

				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					body += chunk;
				});

				res.on('end', function () {
					callback(null);
				});
			});

			req.write(data);
			req.end();
		});
	}
});


/**
 * Deploys a hub script.
 */
function DeployCommand() {
	PrivilegedCommand.call(this);
}

util.inherits(DeployCommand, PrivilegedCommand);

_.extend(DeployCommand.prototype, {
	help: function() {
		console.log('\nUsage: tubesio deploy [-f filename] hub-name\n' +
					'\n' +
					'Deploys a hubscript to tubesio. Unless -f option is ' + 
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
 * Initialises a tubesio development environment in the current directory.
 */
function InitCommand() {
	BaseCommand.call(this);
}

util.inherits(InitCommand, BaseCommand);

_.extend(InitCommand.prototype, {
	deps: ['async', 'cheerio', 'jsdom', 'underscore', 'underscore.string', 'hubstack', 'tubesio'],
	help: function() {
		console.log('\nUsage: tubesio init\n' +
					'\n' +
					'Initialises a tubesio development environment in the ' +
					'current directory.');
	},
	run: function(nconf, argv, callback) {
		var self = this,
			npm = require('npm'),
			prompt = require('prompt'),
			properties = [{
				name: 'username',
			    description: 'Enter your tubes.io username:'.white,
			    message: 'Username cannot be blank.', 		      		      
			    required: true
			},{
				name: 'apiKey',
			    description: 'Enter your tubes.io API key:'.white, 		      		      
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
		console.log('\nUsage: tubesio rollback [-f filename] hub-name\n' +
					'\n' +
					'Rolls back to previous version of hubscript. Unless -f option is ' + 
					'provided will look for a script of the same name as the ' + 
					'hub ending in .bak in the current directory.\n' +					
					'\nWhere:\n' +
					'  -f\tFilename of the file to deploy.\n' +
					'\nNote: deployed scripts take immediate effect.\n');
	}
});

/**
 * Runs a hub script
 */
function RunCommand() {
	PrivilegedCommand.call(this);
}

util.inherits(RunCommand, BaseCommand);

RunCommand.RUNTIMES = {
	'node': true,
	'coffee': true,
	'phantomjs': true
};

_.extend(RunCommand.prototype, {
	help: function () {

	},
	run: function (nconf, argv, callback) {
		var tubeArgs = { api_key: nconf.get('apiKey') };

		// Reparse arguments because we have more specific requirements.
		argv = require('optimist').boolean('p')
								  .boolean('production')
								  .argv;

		_.extend(tubeArgs, require('optimist').parse(argv._.slice(2)));
		if (tubeArgs._.length > 0) {
	        try {
	            // Attempt to parse 1st argument as JSON string
	            _.extend(tubeArgs, JSON.parse(tubeArgs._[0]));
	        } catch (err) {
	            throw new Error('Error parsing arguments: ' + err.message);
	        }
	    }
		delete tubeArgs['_'];
		delete tubeArgs['$0'];
		tubeArgs = JSON.stringify(tubeArgs);

		if (argv.p || argv.production) {
			this.runRemote(nconf, argv, tubeArgs, callback);
		} else {
			this.runLocal(nconf, argv, tubeArgs, callback);
		}
	},
	runLocal: function (nconf, argv, tubeArgs, callback) {
		var runtime, filename, path, args, options, ext, startTime, endTime;

		// Figure out which runtime to execute with
		filename = argv._[1];
		if (argv.r) {
			if (argv.r in RunCommand.RUNTIMES) {
				runtime = argv.r;
			} else {
				return callback(new Error('Unsupported runtime: ' + argv.r));
			}
		} else {
			ext = getExtension(filename);
			switch (ext) {
				case '.coffee':
					runtime = 'coffee';
					break;
				case '.js':
					runtime = 'node';
					break;
				case '':
					runtime = 'node';
					break;
				default:					
					return callback(new Error('Unrecognised extension: ' + ext));
			}
		}

		// Setup environment
		path = runtime + ' ' + filename + ' ' + tubeArgs.replace(/"/g, '\\"');
		options = {
			env: {
				USERNAME: nconf.get('username'),
				API_KEY: nconf.get('apiKey')
			},
			timeout: 1000 * 30 
		}
		
		// Run the script
		startTime = new Date();
		runtime = cp.exec(path, options, function (err, stdout, stderr) {
            var response = {};
            
            if (err) {
                response.success = false;                
                if (err.signal === 'SIGKILL') {                    
                    response.result = 'Script exceeded timeout (' + (options.timeout / 1000) + 's) and was terminated.'
                } else {
                    response.result = 'Script returned non-zero exit code: ' + err.code;
                }   
            } else {
                response.success = true;                
                        
                try {
                    response.result = JSON.parse(stdout);

                    if (_.isArray(response.result)) {
                        response.totalResults = response.result.length;
                    }                    
                } catch (err) {                    
                    response.success = false;
                    response.result = 'Script failed to output valid JSON. Error: ' + err.message + '\nOutput: ' + stdout;                    
                }
            }            
          
          	// Append debugging info to result
            endTime = new Date();
            _.extend(response, {
                time: {
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                    elapsed: endTime - startTime
                },
                log: _.lines(stderr)
            });

            callback(null, JSON.stringify(response, null, 4));
        });
	},
	runRemote: function (nconf, argv, tubeArgs, callback) {
		var slug = argv._[1],
			options = url.parse('http://' + nconf.get('host') + '/' + nconf.get('username') + '/tube/'  + slug.replace(getExtension(slug), '') + '.json');

		options.method = 'POST';
		options.headers = {
			'Content-Type': 'application/json',
			'Content-Length': tubeArgs.length
		};

		var req = http.request(options, function (res) {					
			var body;

			if (res.statusCode == 401 || res.statusCode === 403) {
				return callback(new Error('Unable to complete your request. Invalid credentials supplied.'));
			} else if (res.statusCode >= 400) {
				return callback(new Error('Unable to complete your request. Server returned ' + res.statusCode));
			}

			body = '';
			res.on('data', function (chunk) {
				body += chunk;
			});

			res.on('end', function () {
				callback(null, body);
			});
		});

		req.on('error', function (err) {
			callback(err);
		});											

		req.write(tubeArgs);				
		req.end();				
	}
});


module.exports = {
	create: CreateCommand,
	delete: BaseCommand,
	deploy: DeployCommand,
	init: InitCommand,
	run: RunCommand,
	rollback: BaseCommand
};