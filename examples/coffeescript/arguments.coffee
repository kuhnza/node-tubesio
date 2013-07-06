### 
arguments.coffee

Demonstrate the usage of GET or POST arguments within a tube script. When POSTed arguments may be
encoded as x-www-form-urlencoded or application/json.
###

###
Required imports (replace '../../lib/index' with 'tubesio' when using these outside example dir)
###
tubesio = require('../../lib/index')('<insert your username>', '<insert your API key>')

###
Use the tubesio.utils.args object to parse our arguments object and specify required arguments
using the chainable demand function.
###
args = tubesio.utils.args.demand('name')
                         .demand('age')   

# Apply both our require arguments to the result
result = { 
	name: args.name 
	age: args.age
}

# Include an optional gender argument if present
if args.gender? 
	result.gender = args.gender

# Return the result
tubesio.finish result
