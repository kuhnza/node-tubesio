var tubesio = require('tubesio')(process.env.USERNAME, process.env.API_KEY);

tubesio.finish({hello: 'world'});  