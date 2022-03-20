/**
 * These are worker related tasks.
 */

// Dependencies.
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');

// Instantiate the worker object.
const workers = {};

// Lookup all the checks, get their data, send to a validator.
workers.gatherAllChecks = function() {
    // Get all the checks.
    _data.list('checks', function(err, checks) {
        if(!err && checks && checks.length > 0) {
            checks.forEach(check => {
                // Read in the check data.
                _data.read('checks', check, function(err, originalCheckData) {
                    if (!err && originalCheckData) {
                        // Pass it to the check validator, and let that function continue or log errors as needed.
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.error("Error reading one of the check's data :", err);
                    }
                })
            })
        } else {
            console.error("Error: Could not find any checks to process.");
        }
    });
}

// Sanity checking the check-data.
workers.validateCheckData = function(originalCheckData) {

    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20  ? originalCheckData.id : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10  ? originalCheckData.userPhone : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['https', 'http'].includes(originalCheckData.protocol) ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].includes(originalCheckData.method) ? originalCheckData.method : false;
    originalCheckData.successCodes = originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 == 0 && originalCheckData.timeoutSeconds > 0 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not be set, if the workers have never seen this check.
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].includes(originalCheckData.state) ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked % 1 == 0 && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // If all the checks pass, pass the data along to the next step in the process.
    if (originalCheckData.id &&
        originalCheckData.userPhone && 
        originalCheckData.protocol && 
        originalCheckData.url && 
        originalCheckData.method && 
        originalCheckData.successCodes && 
        originalCheckData.timeoutSeconds
    ) {
        workers.performCheck(originalCheckData);
    } else {
        console.error("Error one of the checks is not properly formatted. Skipping it.");
    }
}

// Perform the check. send the originalCheckData and the outcome of the process, to the next step in the process.
workers.performCheck = function(originalCheckData) {
    // Perpare the initial check outcome.
    let checkOutcome = {
        'error': false,
        'responseCode': false
    };

    // Mark that the outcome has not been sent yet.
    let outcomeSent = false;

    // Parse the hostname and the path out of the original check data.
    let parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    let hostName = parsedUrl.hostname;
    let path = parsedUrl.path; // path and not the pathName, since we want the query string as well
    
    // Construct the request.
    let requestDetails = {
        protocol: originalCheckData.protocol + ':',
        hostname: hostName,
        method: originalCheckData.method.toUpperCase(),
        path,
        timeout: originalCheckData.timeoutSeconds * 1000 // convert seconds to milliseconds.
    };

    // Instantiate the request object using either http or https module.
    let _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    let req = _moduleToUse.request(requestDetails, function(res) {
        // Grab the status of the sent request.
        let status = res.statusCode;

        // Update the check outcome and pass the data along.
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event so it doesn't get thrown.
    req.on('error', function(err) {
        // Update the check outcome and pass the data along.
        checkOutcome.error = {error: true, value: err};
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the timeout event.
    req.on('timeout', function(err) {
        // Update the check outcome and pass the data along.
        checkOutcome.error = {error: true, value: 'timeout'};
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // End the request.
    req.end();
}

// Process the check outcome, update the check data as needed, trigger an alert to user as needed.
// Special logic for accomodating a check that has newver been tested before (down).
workers.processCheckOutcome = function(originalCheckData, checkOutcome)  {
    // Decide if the check is considered up or down.
    let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';

    // Decide if an alert is warranted.
    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state != state ? true : false;
    let timeOfCheck = Date.now();

    // Update the check data.
    let newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck

    // Log to file.
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    // Save the updates.
    _data.update('checks', newCheckData.id, newCheckData, function(err) {
        if(!err) {
            // Send the new check data to the next phase in the process.
            if(alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log("Check outcome has not changed, no alert needed");
            }
        } else {
            console.error("Error trying to save updates to one of the checks.");
        }
    })
}

// Alert the useer as to a change in their check status.
workers.alertUserToStatusChange = function(newCheckData) {
    let message = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + "is currently " + newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, message, function(err) {
        if(!err) {
            console.log("Success: User was alerted to a status change in their check, via sms.", msg);
        } else {
            console.error("Error: Could not send sms alert to user who had a state change in their check.");
        }
    });
}

// Function to log to file.
workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    // Form the log data.
    let logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    };

    // Convert data to a string.
    let logString = JSON.stringify(logData);

    // Determine the name of the log file.
    let logFileName = originalCheckData.id;
    // Append log string to the file.
    _logs.append(logFileName, logString, function(err) {
        if(!err) {
            console.log('Logging to file succeeded');
        } else {
            console.error("Logging to file failed");
        }
    })
}

// Timer to execute the worker-process once per minute.
workers.loop = function() {
    setInterval(function() {
        workers.gatherAllChecks();
    }, 1000*60);
}

// Rotate (compress) the log files.
workers.rotateLogs = function() {
    // List all the non compressed log files.
    _logs.list(false, function(err, logs) {
        if(!err && logs && logs.length > 0) {
            logs.forEach((logName) => {
                // Compress the data to a different file.
                let logId = logName.replace('.log', '');
                let newFileId = logId + '-' + Date.now();
                _logs.compress(logId, newFileId, function(err) {
                    if(!err) {
                        // Truncate the log.
                        _logs.truncate(logId, function(err) {
                            if(!err) {
                                console.log("Success truncating log file");
                            } else {
                                console.error("Error truncating log file");
                            }
                        })
                    } else {
                        console.error("Error compressing one of the log files, ", err);
                    }
                })
            })
        } else {
            console.log("Error : could not find any logs to rotate.");
        }
    });
}

// Tiem to execute the log rotation process once per day.
workers.logRotationLoop = function() {
    setInterval(function() {
        workers.rotateLogs();
    }, 1000*60*60*24);
}

// Init script.
workers.init = function() {
    // Execute all the checks immediately.
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on.
    workers.loop();

    // Compress all the logs immediately.
    workers.rotateLogs();

    // Call the compression loop so logs will be compressed later on.
    workers.logRotationLoop();
};

// Export the module.
module.exports = workers;
