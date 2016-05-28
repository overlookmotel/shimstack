// --------------------
// shimstack module
// Custom error constructor
// --------------------

// modules
var util = require('util');

// exports
module.exports = ShimstackError;

/*
 * ShimstackError constructor
 * Constructor for all errors thrown by shimstack.
 * Exposed as shimstack.Error
 *
 * @param {String} message - Error message
 */
function ShimstackError(message) {
    var tmp = Error.call(this, message);
	this.name = this.constructor.name;
    this.message = tmp.message;
    Error.captureStackTrace(this, this.constructor);
}

util.inherits(ShimstackError, Error);
