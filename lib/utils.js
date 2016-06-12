// --------------------
// shimstack module
// Utility functions
// --------------------

// modules
var _ = require('lodash');

// exports
var _slice = Array.prototype.slice,
    _concat = Array.prototype.concat,
    _hasOwnProperty = Object.prototype.hasOwnProperty;

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
        return _slice.call(args);
    },

    /**
     * Determines if a property is inherited from object's prototype.
     * The opposite of `obj.hasOwnProperty()`.
     *
     * @param {Object} obj - Object
     * @param {string} name - Property name
     * @returns {Boolean} - `true` if inherited, `false` if not
     */
    prototypeProperty: function(obj, name) {
        return !_hasOwnProperty.call(obj, name);
    },

    /**
     * Returns prototype of an object.
     *
     * @param {Object} obj - Object
     * @returns {Object} - Prototype of object
     */
    getPrototypeOf: function(obj) {
        return Object.getPrototypeOf(obj);
    },

    /**
     * Concatenate multiple arrays into one.
     * If only one array, returns it.
     *
     * @param {Array} arrays - Array of arrays
     * @returns {Array} - Combined array
     */
    concatArrays: function(arrays) {
        if (arrays.length == 1) return arrays[0];
        return _concat.apply([], arrays);
    }
};
