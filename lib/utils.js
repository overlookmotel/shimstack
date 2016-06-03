// --------------------
// shimstack module
// Utility functions
// --------------------

// modules
var _ = require('lodash');

// exports
var slice = Array.prototype.slice;

module.exports = {
    /**
     * Copies own properties of sources onto destination object.
     *
     * @param {Object} object - Destination object
     * @param {...Object} [sources] - Source objects
     * @returns {Object} - Returns `object`
     */
    extend: _.extend,

    /**
     * Converts arguments object to an array.
     *
     * @param {Arguments} args - Arguments object
     * @returns {Array} - Array of arguments
     */
    argumentsToArray: function(args) {
        return slice.call(args);
    }
};
