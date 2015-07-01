// --------------------
// shimstack module
// --------------------

// modules
var util = require('util'),
    co = require('co-bluebird'),
    isGeneratorFn = require('is-generator').fn,
    _ = require('lodash');

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
        throw new shimstack.Error('methodName must be a string');
    } else {
        method = obj[methodName];
        if (typeof method != 'function') throw new shimstack.Error('You can only shimstack a function');
    }

    if (typeof options == 'function') {
        fn = options;
        options = undefined;
    }

    // conform options
    options = _.extend({
        // name: undefined
        lastArg: false
    }, options || {});

    // if not already stackified, shimstack method
    if (!method._shimstack) {
        method = convertToStack(method);
        if (methodName) obj[methodName] = method;
    }

    // add fn to stack if provided
    if (fn) {
        // get function name
        if (options.name === undefined && fn.name) options.name = fn.name;

        // co-ify generators
        if (isGeneratorFn(fn)) fn = co.wrap(fn);

        // add fn to stack
        method._shimstack.stack.push({fn: fn, name: options.name, lastArg: options.lastArg});
    }

    return method;
};

function convertToStack(originalMethod) {
    // create stackified function
    var method = function() {
        var _this = this,
            stack = method._shimstack.stack,
            i = 0;

        var next = function() {
            if (i == stack.length) return method._shimstack.final.apply(_this, arguments);

            var item = stack[i];
            i++;

            var args = Array.prototype.slice.call(arguments);
            args[item.lastArg ? args.length : item.fn.length - 1] = next;

            var context = this;
            if (context == globalContext) context = _this;

            return item.fn.apply(context, args);
        };

        return next.apply(this, arguments);
    };

    method._shimstack = {stack: [], final: originalMethod};

    // return stackified method
    return method;
}

shimstack.Error = function(message) {
    var tmp = Error.call(this, message);
	tmp.name = this.name = 'ShimstackError';
    this.message = tmp.message;
    Error.captureStackTrace(this, this.constructor);
};
util.inherits(shimstack.Error, Error);
