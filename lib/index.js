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

/*
 * shimstack function
 * Main export.
 *
 * @param {Function|Object} obj - Either (a) Function to be stackified or (b) Object to stackify method on
 * @param {String} methodName - If `obj` is an object, specifies which method to stackify
 * @param {Object} options - Options to use (inherits default options passed to `factory()`)
 * @param {Function} fn - Function to add to stack
 * @returns {Function} - Stackified function
 */
var shimstack = module.exports = function(obj, methodName, options, fn) {
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
    options = _.extend({
        // name: undefined,
        // arg: undefined,
        lastArg: false,
        first: false,
        genWrap: true
    }, options || {});

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

/*
 * convertToStack function
 * Converts a function (or generator) to a stack.
 *
 * @param {Function} originalMethod - Function to be converted into a stack
 * @param {Boolean|Function} genWrap - `genWrap` option
 * @returns {Function} - Stackified function
 */
function convertToStack(originalMethod, genWrap) {
    // create stackified function
    var method = function() {
        var context = this,
            stack = method._shimstack.stack,
            i = 0;

        var next = function() {
            if (i == stack.length) return method._shimstack.final.apply(context, arguments);

            var item = stack[i];
            i++;

            var args = Array.prototype.slice.call(arguments);
            args[item.lastArg ? args.length : item.arg] = next;

            if (this != globalContext) context = this;

            return item.fn.apply(context, args);
        };

        return next.apply(this, arguments);
    };

    method._shimstack = {stack: [], final: wrapGenerator(originalMethod, genWrap)};

    // return stackified function
    return method;
}

/*
 * wrapGenerator function
 * Wraps generator function as a promise-returning function (co-routine).
 * Uses `genWrap` function (or does not wrap if false).
 * Returns functions which are not generators unaltered.
 *
 * @param {Function} fn - Function to be wrapped (if is generator function)
 * @param {Boolean|Function} - `genWrap` option
 * @returns {Function} - Wrapped function
 */
function wrapGenerator(fn, genWrap) {
    if (!genWrap || !isGeneratorFn(fn)) return fn;

    if (genWrap === true) genWrap = coWrap;
    return genWrap(fn);
}

/*
 * Error constructor
 * Constructor for all errors thrown by shimstack.
 *
 * @param {String} message - Error message
 */
shimstack.Error = ShimstackError;
