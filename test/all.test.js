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
		var fn = function() {return 'a';};

		var stacked = shimstack(fn);

		expect(stacked._shimstack).to.be.ok;
		expect(stacked._shimstack.final).to.equal(fn);
		expect(stacked._shimstack.stack).to.be.an.array;
		expect(stacked._shimstack.stack).to.have.lengthOf(0);

		expect(stacked()).to.equal('a');
	});

	it('Object method', function() {
		var fn = function() {return 'a';};
		var obj = {fn: fn};

		var stacked = shimstack(obj, 'fn');

		expect(obj.fn).to.equal(stacked);
		expect(stacked._shimstack).to.be.ok;
		expect(stacked._shimstack.final).to.equal(fn);
		expect(stacked._shimstack.stack).to.be.an.array;
		expect(stacked._shimstack.stack).to.have.lengthOf(0);

		expect(stacked()).to.equal('a');
	});
});

describe('Throws if', function() {
	it('method is undefined', function() {
		expect(function() {shimstack();}).to.throw(shimstack.Error);
	});

	it('method is not a function', function() {
		expect(function() {shimstack('not a function!');}).to.throw(shimstack.Error);
	});

	it('methodName is undefined', function() {
		expect(function() {shimstack({});}).to.throw(shimstack.Error);
	});

	it('methodName is not a string', function() {
		expect(function() {shimstack({}, 123);}).to.throw(shimstack.Error);
	});

	it('object attribute is undefined', function() {
		expect(function() {shimstack({}, 'fn');}).to.throw(shimstack.Error);
	});

	it('object attribute is not a function', function() {
		var obj = {fn: 'not a function!'};
		expect(function() {shimstack(obj, 'fn');}).to.throw(shimstack.Error);
	});
});

describe('Adds to stack', function() {
	it('with no existing stack', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return 'b' + next(); };

		fn = shimstack(fn, stackFn);

		expect(fn._shimstack.stack).to.have.lengthOf(1);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn);

		expect(fn()).to.equal('ba');
	});

	it('with existing stack', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return 'b' + next(); };

		fn = shimstack(fn);
		fn = shimstack(fn, stackFn);

		expect(fn._shimstack.stack).to.have.lengthOf(1);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn);

		expect(fn()).to.equal('ba');
	});

	it('with multiple stack functions', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return 'b' + next(); };
		var stackFn2 = function(next) { return 'c' + next(); };
		var stackFn3 = function(next) { return 'd' + next(); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);
		fn = shimstack(fn, stackFn3);

		expect(fn._shimstack.stack).to.have.lengthOf(3);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn);
		expect(fn._shimstack.stack[1].fn).to.equal(stackFn2);
		expect(fn._shimstack.stack[2].fn).to.equal(stackFn3);

		expect(fn()).to.equal('bcda');
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
		var fn = function() { return this.char; };
		var stackFn = function(next) { return next() + this.char; };
		var stackFn2 = function(next) { return next() + this.char; };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		var result = fn.call({char: 'a'});
		expect(result).to.equal('aaa');
	});

	it('can be overriden for later stack functions', function() {
		var fn = function() { return this.char; };
		var stackFn = function(next) { return next.call({char: 'b'}) + this.char; };
		var stackFn2 = function(next) { return next() + this.char; };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		var result = fn.call({char: 'a'});
		expect(result).to.equal('bba');
	});

	it('can be overriden for original function', function() {
		var fn = function() { return this.char; };
		var stackFn = function(next) { return next() + this.char; };
		var stackFn2 = function(next) { return next.call({char: 'b'}) + this.char; };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		var result = fn.call({char: 'a'});
		expect(result).to.equal('baa');
	});
});

describe('`first` option', function() {
	it('executes before', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return 'b' + next(); };
		var stackFn2 = function(next) { return 'c' + next(); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, {first: true}, stackFn2);

		expect(fn._shimstack.stack).to.have.lengthOf(2);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn2);
		expect(fn._shimstack.stack[1].fn).to.equal(stackFn);

		expect(fn()).to.equal('cba');
	});

	it('executes most recently added first', function() {
		var fn = function() { return 'a'; };
		var stackFn = function(next) { return 'b' + next(); };
		var stackFn2 = function(next) { return 'c' + next(); };
		var stackFn3 = function(next) { return 'd' + next(); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, {first: true}, stackFn2);
		fn = shimstack(fn, {first: true}, stackFn3);

		expect(fn._shimstack.stack).to.have.lengthOf(3);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn3);
		expect(fn._shimstack.stack[1].fn).to.equal(stackFn2);
		expect(fn._shimstack.stack[2].fn).to.equal(stackFn);

		expect(fn()).to.equal('dcba');
	});
});

describe('`use` method', function() {
	it('creates new shimstack instance', function() {
		var shimstack2 = shimstack.use();

		expect(shimstack2).to.be.ok;
		expect(shimstack2).not.to.equal(shimstack);
	});

	it('new instance has own use method', function() {
		var shimstack2 = shimstack.use();
		var shimstack3 = shimstack2.use();

		expect(shimstack3).to.be.ok;
		expect(shimstack3).not.to.equal(shimstack);
		expect(shimstack3).not.to.equal(shimstack2);
	});

	it('uses provided options as defaults', function() {
		var shimstack2 = shimstack.use({first: true});

		var fn = function() { return 'a'; };
		var stackFn = function(next) { return 'b' + next(); };
		var stackFn2 = function(next) { return 'c' + next(); };

		fn = shimstack2(fn, stackFn);
		fn = shimstack2(fn, stackFn2);

		expect(fn._shimstack.stack).to.have.lengthOf(2);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn2);
		expect(fn._shimstack.stack[1].fn).to.equal(stackFn);

		expect(fn()).to.equal('cba');
	});

	it('options do not affect original instance', function() {
		var shimstack2 = shimstack.use({first: true}); // jshint ignore:line

		var fn = function() { return 'a'; };
		var stackFn = function(next) { return 'b' + next(); };
		var stackFn2 = function(next) { return 'c' + next(); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		expect(fn._shimstack.stack).to.have.lengthOf(2);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn);
		expect(fn._shimstack.stack[1].fn).to.equal(stackFn2);

		expect(fn()).to.equal('bca');
	});

	it('provided default options can be overriden', function() {
		var shimstack2 = shimstack.use({first: true});

		var fn = function() { return 'a'; };
		var stackFn = function(next) { return 'b' + next(); };
		var stackFn2 = function(next) { return 'c' + next(); };

		fn = shimstack2(fn, {first: false}, stackFn);
		fn = shimstack2(fn, {first: false}, stackFn2);

		expect(fn._shimstack.stack).to.have.lengthOf(2);
		expect(fn._shimstack.stack[0].fn).to.equal(stackFn);
		expect(fn._shimstack.stack[1].fn).to.equal(stackFn2);

		expect(fn()).to.equal('bca');
	});
});

describe('Promises', function() {
	it('work without arguments', function() {
		var fn = function() { return Promise.resolve('a'); };
		var stackFn = function(next) { return next(); };
		var stackFn2 = function(next) { return next(); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn().then(function(result) {
			expect(result).to.equal('a');
		});
	});

	it('work with arguments', function() {
		var fn = function(x) { return Promise.resolve(x); };
		var stackFn = function(x, next) { return next(x); };
		var stackFn2 = function(x, next) { return next(x); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn('a').then(function(result) {
			expect(result).to.equal('a');
		});
	});

	it('maintain `this` context', function() {
		var fn = function() { return Promise.resolve(this.char); };
		var stackFn = function(next) { var c = this.char; return next().then(function(x) { return x + c; }); };
		var stackFn2 = function(next) { var c = this.char; return next().then(function(x) { return x + c; }); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn.call({char: 'a'}).then(function(result) {
			expect(result).to.equal('aaa');
		});
	});
});

if (generatorSupported) {
	require('./generators.test.inc.js');
} else {
	describe('Generators', function() {
		it('skipped');
	});

	describe('`genWrap` option', function() {
		it('skipped');
	});
}
