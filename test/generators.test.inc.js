// --------------------
// shimstack module
// Generator tests
// --------------------

// modules
var chai = require('chai'),
	expect = chai.expect,
	Promise = require('bluebird'),
	shimstack = require('../lib/');

// init
chai.config.includeStack = true;

// tests

/* jshint expr: true */
/* jshint esnext: true */
/* global describe, it */

describe('Generators', function() {
	it('work without arguments', function() {
		var fn = function() { return Promise.resolve('a'); };
		var stackFn = function*(next) { return yield next(); };
		var stackFn2 = function*(next) { return yield next(); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn().then(function(result) {
			expect(result).to.equal('a');
		});
	});

	it('work with arguments', function() {
		var fn = function(x) { return Promise.resolve(x); };
		var stackFn = function*(x, next) { return yield next(x); };
		var stackFn2 = function*(x, next) { return yield next(x); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn('a').then(function(result) {
			expect(result).to.equal('a');
		});
	});

	it('maintain `this` context', function() {
		var fn = function() { return Promise.resolve(this.char); };
		var stackFn = function*(next) { return (yield next()) + this.char; };
		var stackFn2 = function*(next) { return (yield next()) + this.char; };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn.call({char: 'a'}).then(function(result) {
			expect(result).to.equal('aaa');
		});
	});
});
