var sinon = require('sinon');
var should = require('should');
var s3glob = require('../');

describe('S3Glob', function () {

	beforeEach(function () {
		this.sandbox = sinon.sandbox.create();
		this.listObjects = this.sandbox.stub(s3glob.s3, 'listObjects');
	});

	it('should return an error if the file path cannot be parsed', function (done) {
		s3glob('/can/not/parse/this', function (err, objects) {
			should.exist(err);
			should.not.exist(objects);
			done();
		});
	});

	it('should return an error if no pattern is provided', function (done) {
		s3glob('s3://bucket', function (err, objects) {
			should.exist(err);
			should.not.exist(objects);
			done();
		});
	});

	it('should return an error if an error occurs while listing objects', function (done) {
		var error = new Error('oops');
		this.listObjects.yields(error);
		s3glob('s3://bucket/*', function (err, objects) {
			err.should.equal(error);
			should.not.exist(objects);
			done();
		});
	});

	it('should return unique objects that match the pattern', function (done) {
		this.listObjects.yields(null, {
			IsTruncated: false,
			Contents: [
				{ Key: 'other/stuff.js' },
				{ Key: 'test/1.js' },
				{ Key: 'test/1/2/3.j,s' },
				{ Key: 'test/1/2/3.js' },
				{ Key: 'test/1/2/3.txt' }
			]
		});
		s3glob('s3://bucket/test/**/*.js', function (err, objects) {
			should.not.exist(err);
			objects.should.eql([
				{ Key: 'test/1.js' },
				{ Key: 'test/1/2/3.js' }
			]);
			done();
		});
	});

	it('should return unique objects that match the pattern from multiple responses', function (done) {
		this.listObjects.onCall(0).yields(null, {
			IsTruncated: true,
			Contents: [
				{ Key: 'other/stuff.js' },
				{ Key: 'test/1.js' },
				{ Key: 'test/1/2/3.js' }
			]
		});
		this.listObjects.onCall(1).yields(null, {
			IsTruncated: false,
			Contents: [
				{ Key: 'test/1/2/3.js' },
				{ Key: 'test/1/2/3.txt' }
			]
		});
		s3glob('s3://bucket/test/**/*.js', function (err, objects) {
			should.not.exist(err);
			objects.should.eql([
				{ Key: 'test/1.js' },
				{ Key: 'test/1/2/3.js' }
			]);
			done();
		});
	});

	afterEach(function () {
		this.sandbox.restore();
	});

});
