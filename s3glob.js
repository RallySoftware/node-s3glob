var async = require('async');
var AWS = require('aws-sdk');
var Minimatch = require('minimatch').Minimatch;

var fileLocationPattern = /^s3n?:\/\/([^\/]+)\/(.*)$/;
var s3 = new AWS.S3();

/*
Parses a string in the format:

's3://bucket/globPattern'

Into an object like:

{
	Bucket: 'bucket',
	Pattern: 'globPattern'
}
*/
function parseFileLocation (fileLocation) {
	var match = fileLocationPattern.exec(fileLocation);
	if (match && match.length >= 3) {
		return {
			Bucket: match[1],
			Pattern: match[2]
		};
	}
};

/*
Find the longest string prefix of the pattern
so we can limit the amount of objects returned
by S3
*/
function longestStringPrefix (minimatchPattern) {
	var i = 0;
	while (typeof minimatchPattern[i] === 'string') {
		i++;
	}

	if (i > 0) {
		return minimatchPattern.slice(0, i).join('/');
	}
};

/*
Return an array of the values in a javascript object.
*/
function values (object) {
	var values = [];
	for (var key in object) {
		if (object.hasOwnProperty(key)) {
			values.push(object[key]);
		}
	}
	return values;
};

/*
S3 only returns up to a maximum of 1000 keys in a listObjects response
This helper detects a truncated response, makes a request for the next
"page", and then knits the responses together.
*/
function listAllObjects (params, callback) {
	var objects = [];
	var marker = '';
	var isTruncated = true;

	async.whilst(
		function () { return isTruncated; },
		function (callback) {
			params.Marker = marker;
			s3glob.s3.listObjects(params, function (err, data) {
				if (err) {
					return callback(err);
				} else if (data && data.Contents && data.Contents.length) {
					isTruncated = data.IsTruncated;
					marker = data.Contents[data.Contents.length - 1].Key;
					objects = objects.concat(data.Contents);
				} else {
					isTruncated = false;
				}
				callback();
			});
		},
		function (err) {
			if (err) {
				return callback(err);
			}
			callback(null, objects);
		}
	);
};

function s3glob (fileLocation, options, callback) {
	// Options are optional...
	if (typeof callback === 'undefined') {
		callback = options;
		options = {};
	}

	var params = parseFileLocation(fileLocation);

	if (!params || !params.Bucket || !params.Pattern) {
		return callback(new Error('Unable to parse "' + fileLocation + '", expected a string in the format "s3://bucket/pattern"'));
	}

	var pattern = params.Pattern;
	delete params.Pattern;

	var minimatch = new Minimatch(pattern, options);

	// Keep track of matched objects by key
	var matchedObjects = {};

	async.each(minimatch.set, function (minimatchPattern, callback) {
		var prefix = longestStringPrefix(minimatchPattern);
		if (prefix) {
			params.Prefix = prefix;
		}

		listAllObjects(params, function (err, objects) {
			if (err) {
				return callback(err);
			}
			for (var i = 0, ii = objects.length; i < ii; ++i) {
				var object = objects[i];
				if (minimatch.match(object.Key)) {
					matchedObjects[object.Key] = object;
				}
			}
			callback();
		});
	}, function (err) {
		if (err) {
			return callback(err);
		}
		callback(null, values(matchedObjects));
	});
};

s3glob.s3 = s3;
module.exports = s3glob;
