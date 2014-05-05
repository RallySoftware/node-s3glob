# S3Glob

Match files stored on Amazon's Simple Storage Service (S3) with glob patterns. It's like [node-glob](https://github.com/isaacs/node-glob), but for S3.

# Configuration

Set up environment variables for S3 API access:

    export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
    export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY

# Usage

    var s3glob = require('s3glob');

    // options is optional
    s3glob('s3://my-bucket/stuff/**/*', options, function (err, files) {
      // files is an array of javascript objects with a "Key" property.
      // e.g. [{Key: 'stuff/folder/file.txt'},{Key: 'stuff/anotherfile.txt'}]
    });
