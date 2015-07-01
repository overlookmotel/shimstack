# shimstack.js

# Middleware for functions

## Current status

[![NPM version](https://img.shields.io/npm/v/shimstack.svg)](https://www.npmjs.com/package/shimstack)
[![Build Status](https://img.shields.io/travis/overlookmotel/shimstack/master.svg)](http://travis-ci.org/overlookmotel/shimstack)
[![Dependency Status](https://img.shields.io/david/overlookmotel/shimstack.svg)](https://david-dm.org/overlookmotel/shimstack)
[![Dev dependency Status](https://img.shields.io/david/dev/overlookmotel/shimstack.svg)](https://david-dm.org/overlookmotel/shimstack)
[![Coverage Status](https://img.shields.io/coveralls/overlookmotel/shimstack/master.svg)](https://coveralls.io/r/overlookmotel/shimstack)

## What it does

A function stack is a stack of functions which execute one after the other, much like middleware. This module converts a function into a function stack.

The difference between normal shimming using something like [shimmer](https://www.npmjs.com/package/shimmer) and shim stack is that when a function is shimmed multiple times, the shims execute in the order they were applied rather than in reverse order.

## Usage

### Installation

    npm install shimstack

### Loading

```js
var shimstack = require('shimstack');
```

### `shimstack( function | object [, methodName] [, options] [, fn] )`

#### Stackifying

* When passed a function as first argument, it converts the function to a stack and returns it.
* When passed an object as first argument, it acts on the attribute of the object defined by `methodName`.

```js
function double(i) { return i * 2; }

double = shimstack( double );
```

```js
var x = {
    double: function(i) { return i * 2; }
};

shimstack( x, 'double' );
```

#### Adding to the stack

As above, but include a stack function as the `fn` argument.

The function must accept a function `next` as its last argument, and call `next()` to continue on to the next function in the stack.

`next()` may be called at any point, so the shim function may do things either before or after executing the next item in the stack.

`next()` must be called with arguments that the next item in the stack will be expecting. `this` context is by default maintained from the original call but can be over-riden with `next.call( alternativeContext )`.

```js
function double(i) { return i * 2; }

var doubleAndAddOne = shimstack( double, function(i, next) {
    i = next(i);
    i = i + 1;
    return i;
} );

result = double(3); // result = 6
result = doubleAndAddOne(3); // result = 7
```

This can be called repeatedly to add more to the stack.

```js
var addOneAndDoubleAndAddOne = shimstack( doubleAndAddOne, function(i, next) {
    i = i + 1;
    i = next(i);
    return i;
} );

result = addOneAndDoubleAndAddOne(3); // result = 9
```

With object methods:

```js
var x = {
    double: function(i) { return i * 2; }
};

shimstack( x, 'double', function(i, next) { return next(i) + 1; } );
shimstack( x, 'double', function(i, next) { return next(i + 1); } );

result = x.double(3); // result = 9
```

#### With Promises

```js
f = function() {
    return User.find({ where: {id: 1} }); // User.find() returns a Promise
};

f = shimstack(f, function requestId(next) {
    this.requestId = Math.random() * 1000000;
    return next();
});

f = shimstack(f, function logRequest(next) {
    var requestId = this.requestId;
    console.log('Starting request ' + requestId);
    return next().then(function() {
        console.log('Ended request ' + requestId);
    });
});
```

#### With Generators

Generators are automatically converted to promise-returning functions using [co-bluebird](https://www.npmjs.com/package/co-bluebird).

```js
f = function() {
    return User.find({ where: {id: 1} }); // User.find() returns a Promise
};

f = shimstack(f, function* requestId(next) {
    this.requestId = Math.random() * 1000000;
    yield next();
});

f = shimstack(f, function* logRequest(next) {
    var requestId = this.requestId;
    console.log('Starting request ' + requestId);
    yield next();
    console.log('Ended request ' + requestId);
});
```

### Options

#### lastArg

For functions which have a variable number of arguments, set `lastArg` to true.
Defaults to `false`.

```js
function addAll() {
    var args = Array.prototype.slice.call(arguments),
        total = 0;

    args.forEach( function(num) { total += num; } );

    return total;
}

addAll = shimstack( addAll, { lastArg: true }, function() {
    var args = Array.prototype.slice.call(arguments),
        next = args.pop();

    console.log({args: args});

    args = args.map( function(num) { return num * 2; } );

    return next.apply(this, args);
});

result =  addAll(1, 2, 3); // result = 12
```

## Tests

Use `npm test` to run the tests. Use `npm run cover` to check coverage.

But there are no tests at present!

## Changelog

See [changelog.md](https://github.com/overlookmotel/shimstack/blob/master/changelog.md)

## Issues

If you discover a bug, please raise an issue on Github. https://github.com/overlookmotel/shimstack/issues

## Contribution

Pull requests are very welcome. Please:

* ensure all tests pass before submitting PR
* add an entry to changelog
* add tests for new features
* document new functionality/API additions in README
