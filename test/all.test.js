// --------------------
// shimstack module
// Tests
// --------------------

// modules
var chai = require('chai'),
	expect = chai.expect,
	Promise = require('bluebird'),
	generatorSupported = require('generator-supported'),
	shimstack = require('../lib/');

// init
chai.config.includeStack = true;

// tests

/* jshint expr: true */
/* global describe, it */

describe('Converts to stack', function() {
	it('Function', function() {
		var fn = function() {};

		var stacked = shimstack(fn);

		expect(stacked._shimstack).to.be.ok;
		expect(stacked._shimstack.final).to.equal(fn);
		expect(stacked._shimstack.stack).to.be.an.array;
		expect(stacked._shimstack.stack).to.have.length(0);
	});

	it('Object method', function() {
		var fn = function() {};
		var x = {
			fn: fn
		};

		shimstack(x, 'fn');

		var stacked = x.fn;
		expect(stacked._shimstack).to.be.ok;
		expect(stacked._shimstack.final).to.equal(fn);
		expect(stacked._shimstack.stack).to.be.an.array;
		expect(stacked._shimstack.stack).to.have.length(0);
	});
});

describe('Throws if', function() {
	it('methodName is not a string', function() {
		var fn = function() {};
		var x = {
			fn: fn
		};

		expect(function() {shimstack(x, null);}).to.throw(shimstack.Error);
	});

	it('method is not a function', function() {
		var x = {
			fn: 'not a function!'
		};

		expect(function() {shimstack(x, 'fn');}).to.throw(shimstack.Error);
	});
});

describe('Adds to stack', function() {
	it('with no existing stack', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return next() + 'b'; };

		fn = shimstack(fn, stackFn);

		expect(fn._shimstack.stack).to.have.length(1);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn);

		expect(fn()).to.equal('ab');
	});

	it('with existing stack', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return next() + 'b'; };

		fn = shimstack(fn);
		fn = shimstack(fn, stackFn);

		expect(fn._shimstack.stack).to.have.length(1);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn);

		expect(fn()).to.equal('ab');
	});

	it('with multiple stack functions', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return next() + 'b'; };
		var stackFn2 = function(next) { return next() + 'c'; };
		var stackFn3 = function(next) { return next() + 'd'; };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);
		fn = shimstack(fn, stackFn3);

		expect(fn._shimstack.stack).to.have.length(3);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn);
		expect(fn._shimstack.stack[1].fn).to.equal(stackFn2);
		expect(fn._shimstack.stack[2].fn).to.equal(stackFn3);

		expect(fn()).to.equal('adcb');
	});
});

describe('Arguments are passed', function() {
	it('1 argument', function() {
		var fn = function(x) { return x; };
		var stackFn = function(x, next) { return next(x); };
		var stackFn2 = function(x, next) { return next(x); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		expect(fn('a')).to.equal('a');
	});

	it('2 arguments', function() {
		var fn = function(x, y) { return x + y; };
		var stackFn = function(x, y, next) { return next(x, y); };
		var stackFn2 = function(x, y, next) { return next(x, y); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		expect(fn('a', 'b')).to.equal('ab');
	});

	it('flexible with lastArg option', function() {
		var fn = function() {
			var args = Array.prototype.slice.call(arguments),
		        total = '';

		    args.forEach( function(arg) { total += arg; } );

		    return total;
		};
		var stackFn = function() {
			var args = Array.prototype.slice.call(arguments),
		        next = args.pop();

		    return next.apply(this, args);
		};

		fn = shimstack(fn, {lastArg: true}, stackFn);
		fn = shimstack(fn, {lastArg: true}, stackFn);

		expect(fn('a')).to.equal('a');
		expect(fn('a', 'b')).to.equal('ab');
		expect(fn('a', 'b', 'c')).to.equal('abc');
	});
});

describe('`this` context', function() {
	it('is maintained', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return next() + this.char; };
		var stackFn2 = function(next) { return next() + this.char; };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		var result = fn.call({char: 'b'});
		expect(result).to.equal('abb');
	});

	it('can be overriden', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return next.call({char: 'c'}) + this.char; };
		var stackFn2 = function(next) { return next() + this.char; };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		var result = fn.call({char: 'b'});
		expect(result).to.equal('acb');
	});
});

describe('Works with Promises', function() {
	it('yes', function() {
		var fn = function(x) { return Promise.resolve(x); };
		var stackFn = function(x, next) { return next(x); };
		var stackFn2 = function(x, next) { return next(x); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn('a').then(function(result) {
			expect(result).to.equal('a');
		});
	});
});

if (generatorSupported) {
	require('./generators.test.inc.js');
} else {
	describe('Works with Generators', function() {
		it('skipped');
	});
}
