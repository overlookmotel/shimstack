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

describe('Works with Generators', function() {
	it('yes', function() {
		var fn = function(x) { return Promise.resolve(x); };
		var stackFn = function*(x, next) { var y = yield next(x); return y; };
		var stackFn2 = function*(x, next) { var y = yield next(x); return y; };

		fn = shimstack(fn, stackFn);
		fn = shimstack(fn, stackFn2);

		return fn('a').then(function(result) {
			expect(result).to.equal('a');
		});
	});
});
