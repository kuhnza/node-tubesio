var _ = require('underscore');

/**
 * Log levels, need I say more?
 */
LogLevel = {
    verbose: 0,
    '0': 'verbose',

    info: 1,
    '1': 'info',

    warn: 2,
    '2': 'warn',

    error: 3,
    '3': 'error'
};

module.exports.LogLevel = LogLevel;


/**
 * Logger that logs exclusively to stderr so that logging doesn't pollute the
 * scraper result which is written to stdout.
 */
function Logger(level) {
    if (_.isString(level) && _.has(LogLevel, level)) {
        this.level = LogLevel[level];    
    } else if (_.isNumber(level) && level >= 0 && level <= 4) {
        this.level = level;
    } else {
        this.level = LogLevel.info;
    }    
}

_.extend(Logger.prototype, {
    log: function (level, msg) {
        if (!msg) {
            msg = level;
            level = LogLevel.info;
        }

        if (level < this.level) { return; }

        var formatted = new Date().toISOString() + ' - ' + LogLevel[level].toUpperCase() + ': ' + msg + '\n';
        process.stderr.write(formatted);
    },
    verbose: function (msg) {
        this.log(LogLevel.verbose, msg);
    },
    info: function (msg) {
        this.log(LogLevel.info, msg);
    },
    warn: function (msg) {
        this.log(LogLevel.warn, msg);
    },
    error: function (msg) {
        this.log(LogLevel.error, msg);
    }
});

module.exports.Logger = Logger;