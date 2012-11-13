var tubesio = require('../lib/index')(process.env.USERNAME, process.env.API_KEY);

tubesio.finish({ hello: 'world' });  