/*
 * utils.js: Various utilities to help in the writing of scrapers.
 */

/*
 * Imports
 */
var _  = require('underscore'),
    async = require('async'),
    argv = require('optimist').argv,
    logging = require('./logging'),
    request = require('./http').request,
    CookieJar = require('./http').CookieJar;


/*
 * Mixins
 */
_.str = require('underscore.string'); // Import Underscore.string to separate object, because there are conflict functions (include, reverse, contains)
_.mixin(_.str.exports()); // Mix in non-conflict functions to Underscore namespace if you want
_.str.include('Underscore.string', 'string');  // All functions, include conflict, will be available through _.str object


/** 
 * Argument parser object.
 */
function Args() {
    if (argv._.length >= 1) {
        try {
            // Attempt to parse 1st argument as JSON string
            _.extend(this, JSON.parse(argv._[0]));
        } catch (err) {
            // Pass, we must be in the console so don't worry about it
        }
    }
}

_.extend(Args.prototype, {
    demand: function (arg) {
        if (!_.has(this, arg)) {
            throw new Error('Missing required argument: ' + arg);
        }

        return this;
    }
});

exports.args = new Args();


/**
 * Parse last results if present.
 */
function getLastResult() {
    if (argv._.length >= 2) {
        try {
            return JSON.parse(argv._[1]);
        } catch (err) {
            // pass
        }
    }

    return null;
}

exports.lastResult = getLastResult();


/**
 * General purpose e-commerce store scraper shell. 
 */
function EStoreScraper() {
    _.defaults(this, {
        logger: new logging.Logger(),
        cookieJar: new CookieJar(),
        maxConcurrency: 10,
        startPage: '',
        agent: new http.Agent()        
    });
    
    this.agent.maxSockets = this.maxConcurrency;
    this.products = [];
    this.waiting = 0;
}

_.extend(EStoreScraper.prototype, {
    addSubCategory: function (name, href, parent) {
        var href = url.resolve(this.startPage, href);
            
        if (href === parent.href) { return; }

        var category = {
                name: parent.name + ' / ' + name,
                href: href
            };

        if (!parent.subCategories) {
            parent.subCategories = {};
        }    
        parent.subCategories[href] = category;

        return category;
    },
    dedupeProductsByHref: function(products) {
        var productSet = {},
            nProducts = products.length;
        for (var i = 0; i < nProducts; i++) {
            var p = products[i];

            if (p.href in productSet) {
                var up = productSet[p.href];                 
                up.categories = _.union(up.categories, p.categories)
            } else {
                productSet[p.href] = p;
            }
        }

        return _.values(productSet);
    },
    dedupeProductsById: function(products) {
        var productSet = {},
            nProducts = products.length;
        for (var i = 0; i < nProducts; i++) {
            var p = products[i];

            if (!p.id) {
                // On the off chance we didn't get to the product detail page...
                shasum = crypto.createHash('sha256');
                p.id = shasum.update(p.href).digest('hex');
            }

            if (p.id in productSet) {
                var up = productSet[p.id];                 
                up.categories = _.union(up.categories, p.categories)
            } else {
                productSet[p.id] = p;
            }
        }

        return _.values(productSet);
    },
    fetch: function(location, settings, callback) {
        this.logger.verbose('Fetching: ' + location + '. Waiting on ' + this.waiting++);        
        var settings = settings || {},
            defaults = {
                cookieJar: this.cookieJar,
                agent: this.agent,
                complete: (function(err, body, res) {
                    if (err) { return callback(err); }                    

                    this.logger.verbose(location + ' finished loading. Waiting on ' + this.waiting--);
                    callback(null, body, res);
                }).bind(this)
            };
        request(location, _.defaults(settings, defaults));
    },
    fetchAndParseHtml: function (location, settings, parser, callback) {                
        this.fetch(location, settings, (function (err, body, res) {
            if (err) { return callback(err); }

            var $ = cheerio.load(body);                

            try {             
                parser($, function(err, result, next) {
                    if (err) { return callback(err); }                                        
                    callback(null, result, next);
                });                   
            } catch (err) {            
                callback(err);
            }
        }).bind(this));
    },
    flattenCategories: function (categories) {
        var out = {},
            a = _.values(categories);
        for (var i = 0; i < a.length; i++) {            
            var cat = _.clone(a[i]); // Clone so we don't modify original

            // Prune stubbed out links
            if (cat.href !== 'javascript:void(0);' && cat.href !== '#') {
                out[cat.href] = cat;                
            }

            if (cat.subCategories) {
                cat.subCategories = _.clone(cat.subCategories); // again so we don't modify original                     
                _.extend(out, this.flattenCategories(cat.subCategories));
                delete cat.subCategories; // delete cloned copy when we're done
            }
        }

        return out;
    },
    scrape: function(callback) {
        this.scrapeCategories(this.startPage, (function (err, categories) {
            if (err) { return callback(err); } 

            this.products = [];    
            async.forEachLimit(categories, this.maxConcurrency, this.scrapeProductListing.bind(this), (function (err) {                                
                if (err) { return callback(err); }            
                    
                // Ensure we only hit each unique URL once
                this.products = this.dedupeProductsByHref(this.products);

                async.forEachLimit(this.products, this.maxConcurrency, this.scrapeProductDetails.bind(this), (function (err) {
                    if (err) { return callback(err); }
                    
                    // Remove duplicate products with different HREFs
                    this.products = this.dedupeProductsById(this.products);

                    callback(null, this.products);
                }).bind(this));
            }).bind(this));
        }).bind(this));        
    },    
    scrapeCategories: function(href, callback) {
        this.logger.verbose('Scraping categories...');
        this.fetchAndParseHtml(href, null,
            this._scrapeCategories.bind(this), callback);
    },
    scrapeProductListing: function(category, callback) {
        this.logger.verbose('Scraping category ' + category.href);        
        var allProducts = [];

        function processResults (err, products, next) {
            if (err) { return callback(err); }

            var nProducts = products.length
            for (var i = 0; i < nProducts; i++) {                
                products[i].categories = [category.name];                
            }
            
            allProducts = allProducts.concat(products);

            if (next) {                                
                this.fetchAndParseHtml(next, null, 
                    this._scrapeProductListing.bind(this), processResults.bind(this));               
            } else { 
                this.logger.verbose('finished scraping ' + category.href);
                this.products = this.products.concat(allProducts);               
                callback(null, allProducts);
            }
        }   

        this.fetchAndParseHtml(category.href, null, 
            this._scrapeProductListing.bind(this), processResults.bind(this));
    },
    scrapeProductDetails: function(product, callback) {
        this.logger.verbose('Scraping product ' + product.href);
        this.fetchAndParseHtml(product.href, null, 
            this._scrapeProductDetails.bind(this), (function (err, productDetails) {
                if (err) { 
                    // Ignore so we can keep going...
                    this.logger.verbose('Error retrieving product page ' + product.href);                    
                    productDetails = {};
                } else {                    
                    // Generate unique ID for product
                    shasum = crypto.createHash('sha256');
                    productDetails.id = shasum.update(this.startPage + productDetails.sku).digest('hex');
                }

                callback(null, _.defaults(product, productDetails));                
            }).bind(this));
    },
    _scrapeCategories: function($, callback) {
        // Each category must at least conform to  { name: '', href: '' }        
        callback(new Error('_scrapeCategories not implemented.'));
    },
    _scrapeProductListing: function($, callback) {        
        // Each product must at least conform to  { name: '', href: '', category: [''] }
        callback(new Error('_scrapeProductListing not implemented.'));
    },
    _scrapeProductDetails: function($, callback) {        
        // Each product must at least conform to  { name: '', href: '', sku: '', category: [''] }
        callback(new Error('_scrapeProductDetails not implemented.'));
    }
});