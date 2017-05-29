# shimstack.js

[![Greenkeeper badge](https://badges.greenkeeper.io/overlookmotel/shimstack.svg)](https://greenkeeper.io/)

# Middleware for functions

## Current status

[![NPM version](https://img.shields.io/npm/v/shimstack.svg)](https://www.npmjs.com/package/shimstack)
[![Build Status](https://img.shields.io/travis/overlookmotel/shimstack/master.svg)](http://travis-ci.org/overlookmotel/shimstack)
[![Dependency Status](https://img.shields.io/david/overlookmotel/shimstack.svg)](https://david-dm.org/overlookmotel/shimstack)
[![Dev dependency Status](https://img.shields.io/david/dev/overlookmotel/shimstack.svg)](https://david-dm.org/overlookmotel/shimstack)
[![Coverage Status](https://img.shields.io/coveralls/overlookmotel/shimstack/master.svg)](https://coveralls.io/r/overlookmotel/shimstack)

## What it does

A function stack is a stack of functions which execute one after the other, much like middleware. This module converts a function into a function stack.

The difference between normal shimming using something like [shimmer](https://www.npmjs.com/package/shimmer) and `shimstack` is that when a function is shimmed multiple times, the shims execute in the order they were applied - rather than in reverse order.

## Usage

### Installation

```
npm install shimstack
```

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
var obj = {
    double: function(i) { return i * 2; }
};

shimstack( obj, 'double' );
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
var obj = {
    double: function(i) { return i * 2; }
};

shimstack( obj, 'double', function(i, next) { return next(i) + 1; } );
shimstack( obj, 'double', function(i, next) { return next(i + 1); } );

result = obj.double(3); // result = 9
```

#### Prototype methods

If a method being shimmed is on an object's prototype, by default `shimstack` won't shim the prototype, but reference it on the object.

```js
function Classy() {};
Classy.prototype.x = function() { return 'A'; };

var obj = new Classy();
shimstack( obj, 'x', function(next) { return 'B' + next(); } );
result = obj.x(); // result = 'BA'

var obj2 = new Classy();
result = obj2.x(); // result = 'A'
// NB the prototype has not been affected
```

You can also apply shims on the prototype itself:

```js
function Classy() {};
Classy.prototype.x = function() { return 'A'; };

var obj = new Classy();
shimstack( obj, 'x', function(next) { return 'B' + next(); } );
shimstack( Classy.prototype, 'x', function(next) { return 'C' + next(); } );

result = obj.x(); // result = 'CBA'
```

Note that the shim added to `Classy.prototype.x` takes effect even though it's added *after* the shim on `obj.x`.

The order of execution is by default to run shims on the prototype first, followed by the shims on the object.

If the prototype itself has a prototype, the order of execution is from bottom of the prototype chain to top:

```js
function Shape() {}
function Rectangle() {}
util.inherits(Rectangle, Shape);
function Square() {}
util.inherits(Square, Rectangle);

Shape.prototype.x = function() { return 'x'; };

shimstack( Shape.prototype, 'x', function(next) { return 'Shape-' + next(); } );
shimstack( Rectangle.prototype, 'x', function(next) { return 'Rectangle-' + next(); } );
shimstack( Square.prototype, 'x', function(next) { return 'Square-' + next(); } );

var square = new Square();
result = square.x(); // result = 'Shape-Rectangle-Square-x'
```

Default behavior can be changed with the `protoInherit` and `protoFirst` options (see below).

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

#### With Generators (co-routines)

Generators are automatically converted to promise-returning functions (co-routines) using [co-bluebird](https://www.npmjs.com/package/co-bluebird).

An alternative wrapper can be specified, or generator wrapping disabled with `options.genWrap`.

```js
var fn = function() {
    return User.find({ where: {id: 1} }); // User.find() returns a Promise
};

fn = shimstack(fn, function* requestId(next) {
    this.requestId = Math.random() * 1000000;
    var result = yield next();
    return result;
});

fn = shimstack(fn, function* logRequest(next) {
    var requestId = this.requestId;
    console.log('Starting request ' + requestId);
    var result = yield next();
    console.log('Ended request ' + requestId);
    return result;
});
```

### `shimstack.use( [options] )` method

Returns a new independent instance of `shimstack`. If `options` are provided, the new instance uses these as default options for all calls thereafter.

```js
var shimstack = require('shimstack').use( { genWrap: co.wrap } );

// `gen` is wrapped using `co.wrap()` rather than the default
shimstack(obj, 'prop', function* gen() { /* ... */ } );

// default options can still be overridden on individual calls
// `gen` is wrapped using the default wrapper
shimstack(obj, 'prop', { genWrap: true }, function* gen() { /* ... */ } );
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

    args = args.map( function(num) { return num * 2; } );

    return next.apply(this, args);
});

result = addAll(1, 2, 3); // result = 12
```

#### first

Adds `fn` to the bottom of the stack rather than the top. i.e. it will execute first.

This is like normal shimming with something like [shimmer](https://www.npmjs.com/package/shimmer).

```js
function a(s) {return s};
var b = shimstack( a, function addB(s, next) { return 'B' + next(s); } );
var c = shimstack( b, function addC(s, next) { return 'C' + next(s); } );
var d = shimstack( c, {first: true}, function addD(s, next) { return 'D' + next(s); } );
var e = shimstack( d, {first: true}, function addE(s, next) { return 'E' + next(s); } );

// Execution order: addE, addD, addB, addC
result = e('A'); // result = 'EDBCA'
```

#### protoInherit

When `true` (the default), shimming an object's method which is inherited from it's prototype doesn't affect the prototype, but references it so only affect the object itself (as in the examples above).

Set to `false` to disable this.

#### protoFirst

When `true` (the default), shims on an object's prototype execute before the shims on the object itself, as in the examples above.

Set to `false` to go "top to bottom" instead.

#### genWrap

By default, generators are treated as co-routines and wrapped into promise-returning functions using [co-bluebird](https://www.npmjs.com/package/co-bluebird).

`genWrap` option allows specifying an alternate wrapping function, or disabling wrapping altogether.

```js
shimstack(obj, 'prop', { genWrap: co.wrap }, function *() { /* ... */ });
```

Set as `false` to disable generator wrapping.

Set as `true` to use default wrapper. This is the default value.

To create an instance of `shimstack` which always uses an alternative wrapper, use `shimstack.use( { genWrap: myWrapper } )`.

## Tests

Use `npm test` to run the tests. Use `npm run cover` to check coverage.

Generator tests only run on node v4 and above. To run them on node v0.12 in harmony mode, use `npm run test-harmony`.

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
