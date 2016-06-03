// --------------------
// shimstack module
// --------------------

// modules
var coWrap = require('co-bluebird').wrap,
    isGeneratorFn = require('is-generator').fn,
    _ = require('lodash');

// imports
var ShimstackError = require('./error');

// get global context
var globalContext;
(function() {
    globalContext = this;
})();

/**
 * Returns instance of shimstack using default options provided.
 *
 * @param {Object} defaultOptions - Options to use as default (optional)
 * @returns {Function} - shimstack instance
 */
var factory = function(defaultOptions) {
    // conform options
    defaultOptions = _.extend({
        // name: undefined,
        // arg: undefined,
        lastArg: false,
        first: false,
        genWrap: true
    }, defaultOptions || {});

    /**
     * Main export.
     *
     * @param {Function|Object} obj - Either (a) Function to be stackified or (b) Object to stackify method on
     * @param {string} methodName - If `obj` is an object, specifies which method to stackify
     * @param {Object} options - Options to use (inherits default options passed to `factory()`)
     * @param {Function} fn - Function to add to stack
     * @returns {Function} - Stackified function
     */
    var shimstack = function(obj, methodName, options, fn) {
        // conform arguments and get method
        var method;
        if (typeof obj == 'function') {
            fn = options;
            options = methodName;
            methodName = undefined;

            method = obj;
        } else if (typeof methodName != 'string') {
            throw new ShimstackError('methodName must be a string');
        } else {
            method = obj[methodName];
            if (typeof method != 'function') throw new ShimstackError('You can only shimstack a function');
        }

        if (typeof options == 'function') {
            fn = options;
            options = undefined;
        }

        // conform options
        options = _.extend({}, defaultOptions, options || {});

        // if not already stackified, shimstack method
        if (!method._shimstack) {
            method = convertToStack(method, options.genWrap);
            if (methodName) obj[methodName] = method;
        }

        // add fn to stack if provided
        if (fn) {
            // get function name and length
            if (options.name === undefined && fn.name) options.name = fn.name;
            if (options.arg === undefined) options.arg = fn.length - 1;

            // wrap generators as co-routines
            fn = wrapGenerator(fn, options.genWrap);

            // add fn to stack
            var item = {fn: fn, name: options.name, lastArg: options.lastArg, arg: options.arg},
                stack = method._shimstack.stack;
            if (options.first) {
                stack.unshift(item);
            } else {
                stack.push(item);
            }
        }

        return method;
    };

    /**
     * Create new instance of shimstack with supplied options as defaults.
     *
     * @param {Object} options - Default options (optional)
     * @returns {Function} - shimstack instance
     */
    shimstack.use = factory;

    /**
     * Constructor for all errors thrown by shimstack.
     *
     * @constructor
     * @param {string} message - Error message
     */
    shimstack.Error = ShimstackError;

    // return shimstack
    return shimstack;
};

// export shimstack with default options
module.exports = factory();

/**
 * Converts a function (or generator) to a stack.
 *
 * @param {Function} originalMethod - Function to be converted into a stack
 * @param {Boolean|Function} genWrap - `genWrap` option
 * @returns {Function} - Stackified function
 */
function convertToStack(originalMethod, genWrap) {
    // create stackified function
    var method = function() {
        return runStack(method, this, arguments);
    };

    method._shimstack = {stack: [], final: wrapGenerator(originalMethod, genWrap)};

    // return stackified function
    return method;
}

/**
 * Runs a stack.
 *
 * @param {Function} method - Stacked function
 * @param {Object} context - `this` context to execute stack and final function with
 * @param {Arguments} args - Arguments to execute stack with
 * @returns {*} - Result of running the stack
 */
function runStack(method, context, args) {
    var params = method._shimstack;
    return runStackNext(params.stack, params.final, 0, context, args);
}

/**
 * Runs a stack from item `index` onwards.
 * Calls itself recursively to iterate through whole stack.
 *
 * @param {Array} stack - Array of shims
 * @param {Function} final - Original function to run at top of stack
 * @param {number} index - Stack item index to run
 * @param {Object} context - `this` context to execute stack and final function with
 * @param {Arguments} args - Arguments to execute stack with
 * @returns {*} - Result of running the stack
 */
function runStackNext(stack, final, index, context, args) {
    if (index == stack.length) return final.apply(context, args);

    var item = stack[index];

    args = argumentsToArray(args);
    args[item.lastArg ? args.length : item.arg] = function() {
        if (this != globalContext) context = this;
        return runStackNext(stack, final, index + 1, context, arguments);
    };

    return item.fn.apply(context, args);
}

/**
 * Converts arguments object to an array.
 *
 * @param {Arguments} args - Arguments object
 * @returns {Array} - Array of arguments
 */
var _slice = Array.prototype.slice;

function argumentsToArray(args) {
    return _slice.call(args);
}

/**
 * Wraps generator function as a promise-returning function (co-routine).
 * Uses `genWrap` function (or does not wrap if false).
 * Returns functions which are not generators unaltered.
 *
 * @param {Function} fn - Function to be wrapped (if is generator function)
 * @param {boolean|Function} - `genWrap` option
 * @returns {Function} - Wrapped function
 */
function wrapGenerator(fn, genWrap) {
    if (!genWrap || !isGeneratorFn(fn)) return fn;

    if (genWrap === true) genWrap = coWrap;
    return genWrap(fn);
}
