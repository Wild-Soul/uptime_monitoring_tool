/**
 * Library for storing and rotating logs.
 */

// Dependencies.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module.
const lib = {};

// Base directory of the logs.
lib.baseDir = path.join(__dirname,'/../.logs/');

// Append a string to a file. Create the file if it does not exist.
lib.append = function(file, str, callback) {
    // Open the file for appending.
    fs.open(lib.baseDir+file+'.log', 'a', function(err, fileDescriptor) {
        if(!err && fileDescriptor) {
            // Append to the file and close it.
            fs.appendFile(fileDescriptor, str+'\n', function(err) {
                if(!err) {
                    fs.close(fileDescriptor, function(err) {
                        if(!err) {
                            callback(false);
                        } else {
                            callback('Error closing file that was being appended');
                        }
                    });
                } else {
                    callback('Error appending to file');
                }
            });
        } else {
            callback('Could not open file for appending');
        }
    });
};

// List all the logs, and optionally include the compressed logs.
lib.list = function(includeCompressedLogs, callback) {
    fs.readdir(lib.baseDir, function(err, data) {
        if(!err && data && data.length > 0) {
            let trimmedFileNames = [];
            data.forEach(fileName => {
                // Add the .log files.
                if(fileName.includes('.log')) {
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }

                // Optionally add compressed files (.gz files)
                if (fileName.includes('.gz.b64') && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });

            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
}

// Compress the contents on one .log file into a .gz.64 file within the same directory.
lib.compress = function(logId, newFileId, callback) {
    let sourceFile = logId + '.log';
    let destFile = newFileId + '.gz.b64';

    // Read the source file
    fs.readFile(lib.baseDir+sourceFile, 'utf8', function(err, inputString) {
        if(!err && inputString) {
            // Compress the data using gzip.
            zlib.gzip(inputString, function(err, buffer) {
                if(!err && buffer) {
                    // Send the data to the destination file.
                    fs.open(lib.baseDir + destFile, 'wx', function(err, fileDescriptor) {
                        if(!err && fileDescriptor) {
                            // Write to the destination file.
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
                                if(!err) {
                                    // Close the destination file.
                                    fs.close(fileDescriptor, function(err) {
                                        if(!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
}

// Decompress the contents of a .gz.b64 file into a string variable.
lib.decompress = function(fileId, callback) {
    let fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir+fileName, 'utf8', function(err, str) {
        if(!err && str) {
            // Decompress the data.
            let inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, function(err, outputBuffer) {
                if(!err && outputBuffer) {
                    // Callback
                    let outputString = outputBuffer.toString();
                    callback(false, outputString);
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err);
        }
    });
}

// Truncate a log file.
lib.truncate = function(logId, callback) {
    fs.truncate(lib.baseDir+logId+'.log', 0, function(err) {
        if(!err) {
            callback(false);
        } else {
            callback(err);
        }
    });
}

// Export the module.
module.exports = lib;
