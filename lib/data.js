/**
 * Library for storing and editing data.
 */

const fs = require("fs");
const path = require("path");
const helpers = require("./helpers");

// Container for the module (to be exported).
const lib = {};

// Base directory of the data folder.
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file.
lib.create = function (dir, file, data, callback) {
    // open the file for writing.
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // convert data to string.
            let stringData = JSON.stringify(data);

            // write to file and close it.
            fs.writeFile(fileDescriptor, stringData, function (err) {
                if (!err) {
                    fs.close(fileDescriptor, function (err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error while closing new file');
                        }
                    });
                } else {
                    callback('Error writing to new file');
                }
            })
        } else {
            callback('Could not create new file, it may already exists');
        }
    })
};

// Read data from a file.
lib.read = function (dir, file, callback) {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf-8', function (err, data) {
        if (!err && data) {
            callback(false, helpers.parseJsonToObject(data));
        } else {
            callback(err, data);
        }
    });
}

// Update data inside a file.
lib.update = function (dir, file, data, callback) {
    // Open the file for writing.
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // Convert data to string.
            let stringData = JSON.stringify(data);

            // Truncate the file.
            fs.truncate(fileDescriptor, function (err) {
                fs.writeFile(fileDescriptor, stringData, function (err) {
                    if (!err) {
                        fs.close(fileDescriptor, function (err) {
                            if (!err) {
                                callback(false);
                            } else {
                                callback('Error while closing existing file');
                            }
                        });
                    } else {
                        callback('Error writing to existing file');
                    }
                });
            });

        } else {
            callback('Could not open the file for updating, it may not exist yet');
        }
    });
}

// Deleting a file
lib.delete = function (dir, file, callback) {
    // Unlink the file.
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', function (err) {
        if (!err) {
            callback(false);
        } else {
            callback('Error deleting file');
        }
    });
}

// Export the module.
module.exports = lib;
