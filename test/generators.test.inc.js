// --------------------
// shimstack module
// Generator tests
// --------------------

// modules
var chai = require('chai'),
	expect = chai.expect,
	Promise = require('bluebird'),
	co = require('co-bluebird'),
	shimstack = require('../lib/');

// init
chai.config.includeStack = true;

// tests

/* jshint expr: true */
/* jshint esnext: true */
/* global describe, it */

describe('Generators', function() {
	it('work without arguments', function() {
		var fn = function*() { return yield Promise.resolve('a'); };
		var stackFn = function*(next) { return yield next(); };
		var stackFn2 = function*(next) { return yield next(); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn().then(function(result) {
			expect(result).to.equal('a');
		});
	});

	it('work with arguments', function() {
		var fn = function*(x) { return yield Promise.resolve(x); };
		var stackFn = function*(x, next) { return yield next(x); };
		var stackFn2 = function*(x, next) { return yield next(x); };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn('a').then(function(result) {
			expect(result).to.equal('a');
		});
	});

	it('maintain `this` context', function() {
		var fn = function*() { return yield Promise.resolve(this.char); };
		var stackFn = function*(next) { return (yield next()) + this.char; };
		var stackFn2 = function*(next) { return (yield next()) + this.char; };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn.call({char: 'a'}).then(function(result) {
			expect(result).to.equal('aaa');
		});
	});
});

describe('`genWrap` option', function() {
	it('uses provided generator wrapper', function() {
		var fn = function*() { return yield Promise.resolve('a'); };
		var stackFn = function*(next) { return yield next(); };
		var stackFn2 = function*(next) { return yield next(); };

		var wrapper = function(fn) {
			fn = co.wrap(fn);
			fn.__test = true;
			return fn;
		};

		var stacked = shimstack(fn, {genWrap: wrapper}, stackFn);
		stacked = shimstack(stacked, {genWrap: wrapper}, stackFn2);

		expect(stacked._shimstack).to.be.ok;
		expect(stacked._shimstack.final).not.to.equal(fn);
		expect(stacked._shimstack.final.__test).to.be.true;
		expect(stacked._shimstack.stack).to.be.an.array;
		expect(stacked._shimstack.stack).to.have.lengthOf(2);
		expect(stacked._shimstack.stack[0].fn).not.to.equal(stackFn);
		expect(stacked._shimstack.stack[0].fn.__test).to.be.true;
		expect(stacked._shimstack.stack[1].fn).not.to.equal(stackFn2);
		expect(stacked._shimstack.stack[1].fn.__test).to.be.true;
	});

	it('does not wrap if false', function() {
		var fn = function*() { return yield Promise.resolve('a'); };
		var stackFn = function*(next) { return yield next(); };
		var stackFn2 = function*(next) { return yield next(); };

		var stacked = shimstack(fn, {genWrap: false}, stackFn);
		stacked = shimstack(stacked, {genWrap: false}, stackFn2);

		expect(stacked._shimstack).to.be.ok;
		expect(stacked._shimstack.final).to.equal(fn);
		expect(stacked._shimstack.stack).to.be.an.array;
		expect(stacked._shimstack.stack).to.have.lengthOf(2);
		expect(stacked._shimstack.stack[0].fn).to.equal(stackFn);
		expect(stacked._shimstack.stack[1].fn).to.equal(stackFn2);
	});

	it('default behaviour if true', function() {
		var fn = function*() { return yield Promise.resolve('a'); };
		var stackFn = function*(next) { return yield next(); };
		var stackFn2 = function*(next) { return yield next(); };

		fn = shimstack(fn, {genWrap: true}, stackFn);
		fn = shimstack(fn, {genWrap: true}, stackFn2);

		return fn().then(function(result) {
			expect(result).to.equal('a');
		});
	});
});
