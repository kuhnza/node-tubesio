/*
 * Imports
 */
var _  = require('underscore'),
    async = require('async'),
	cp = require('child_process'),
	http = require('http'),
    request = require('request'),
	url = require('url'),	
	util = require('util');


/*
 * Mixins
 */
_.str = require('underscore.string'); // Import Underscore.string to separate object, because there are conflict functions (include, reverse, contains)
_.mixin(_.str.exports()); // Mix in non-conflict functions to Underscore namespace if you want
_.str.include('Underscore.string', 'string');  // All functions, include conflict, will be available through _.str object


function apiKeyAuthHeader(username, apiKey) {
	return 'apikey ' + new Buffer(username + ':' + apiKey).toString('base64')
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
});


/**
 * Creates a new tube script.
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



			options = url.parse('http://' + host + '/api/v1/tubes/');
			options.method = 'POST';			
			options.headers = apiKeyAuthHeader(username, apiKey);
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
 * Deploys a tube script.
 */
function DeployCommand() {
	PrivilegedCommand.call(this);
}

util.inherits(DeployCommand, PrivilegedCommand);

_.extend(DeployCommand.prototype, {
	help: function() {
		console.log('\nUsage: tubesio deploy <filename>\n' +
					'\n' +
					'Deploys a tubescript to tubesio. Tube scripts files should be named using a dasherized \n' +
                    'version of their full name. For example Electro House Top 100 becomes electro-house-top-100.js\n' +
					'\nNote: deployed scripts take immediate effect.\n');
	},
	run: function (nconf, argv, callback) {
        var filename, idx, tubeName, host, username, apiKey;

		try {
			this.checkCredentialsExist(nconf);
		} catch (err) {
			return callback(err);
		}

		if (argv._.length < 2) {
			return callback(new Error('Missing argument: filename.'));
		}

        // Check for presence of extension, if not there then assume .js
        filename = argv._[1];
        idx = filename.indexOf('.');
        if (idx > -1) {
            tubeName = filename.substr(0, idx);
        } else {
            tubeName = filename;
            filename += '.js';
        }

		host = nconf.get('host');
		username = nconf.get('username');
		apiKey = nconf.get('apiKey');

		async.waterfall([
			function (callback) {
                var fs, script, tubes, tube;

                fs = require('fs');

                // Read tube script in from local file
                script = fs.readFileSync(filename).toString('utf-8');

				// Lookup tube ID/details via API using slug
                request.get({
                    url: 'http://' + host + '/api/v1/tubes/?slug=' + tubeName,
                    headers: { 'authorization': apiKeyAuthHeader(username, apiKey) }
                }, function onResponse(err, res, body) {
                    if (err) { return callback(err); }

                    if (res.statusCode == 401 || res.statusCode === 403) {
                        return callback(new Error('Invalid credentials supplied.'));
                    } else if (res.statusCode >= 400) {
                        return callback(new Error('An unexpected error occurred. Remote server returned ' + res.statusCode + ': ' + body));
                    }

                    // Hack until slug filter properly implemented
                    tubes = JSON.parse(body).results;
                    _.each(tubes, function onItem(item) {
                        if (tubeName === item.slug) {
                            tube = item;
                            return false;
                        }
                    });

                    if (!tube) {
                        return callback(new Error('Tube `' + tubeName + '` does not exist.'));
                    }

                    fs.writeFileSync(filename + '.bak', tube.definition);

                    callback(null, script, tube);
                });
			}, function (script, tube, callback) {
                request.post({
                    url: 'http://' + host + '/api/v1/tubes/'  + tube.id + '/',
                    headers: {
                        'authorization': apiKeyAuthHeader(username, apiKey),
                        'x-http-method-override': 'PATCH'
                    },
                    json: { definition: script }
                }, function onResponse(err, res, body) {
                    if (res.statusCode == 401 || res.statusCode === 403) {
                        return callback(new Error('Invalid credentials supplied.'));
                    } else if (res.statusCode >= 400) {
                        return callback(new Error('An unexpected error occurred. Remote server returned ' + res.statusCode + ': ' + util.inspect(body)));
                    }

                    callback(null, 'Deployed.');
                });
			}	
		], function onComplete(err, result) {
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
	deps: ['async', 'cheerio', 'jsdom', 'underscore', 'underscore.string', 'tubesio'],
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
 * Creates a new tube script.
 */
function RollbackCommand() {
	PrivilegedCommand.call(this);
}

util.inherits(RollbackCommand, BaseCommand);

_.extend(RollbackCommand.prototype, {
	help: function() {
		console.log('\nUsage: tubesio rollback [-f filename] tube-name\n' +
					'\n' +
					'Rolls back to previous version of tubescript. Unless -f option is ' +
					'provided will look for a script of the same name as the ' + 
					'tube ending in .bak in the current directory.\n' +
					'\nWhere:\n' +
					'  -f\tFilename of the file to deploy.\n' +
					'\nNote: deployed scripts take immediate effect.\n');
	}
});

/**
 * Runs a tube script
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