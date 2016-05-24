// --------------------
// shimstack module
// --------------------

// modules
var co = require('co-bluebird'),
    isGeneratorFn = require('is-generator').fn,
    _ = require('lodash');

// imports
var ShimstackError = require('./error');

// exports
var globalContext;
(function() {
    globalContext = this;
})();

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
        // name: undefined
        lastArg: false,
        first: false
    }, options || {});

    // if not already stackified, shimstack method
    if (!method._shimstack) {
        method = convertToStack(method);
        if (methodName) obj[methodName] = method;
    }

    // add fn to stack if provided
    if (fn) {
        // get function name and length
        if (options.name === undefined && fn.name) options.name = fn.name;
        if (options.arg === undefined) options.arg = fn.length - 1;

        // co-ify generators
        if (isGeneratorFn(fn)) fn = co.wrap(fn);

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

function convertToStack(originalMethod) {
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

    method._shimstack = {stack: [], final: originalMethod};

    // return stackified method
    return method;
}

// expose Error class as shimstack.Error
shimstack.Error = ShimstackError;
