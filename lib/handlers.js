/**
 * Request handlers.
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Define the handlers.
let handlers = {};

// Users.
handlers.users = function (data, callback) {
    let acceptableMethdos = ["post", "get", "put", "delete"];

    // if it's one of the acceptable methods.
    if (acceptableMethdos.includes(data.method)) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for the users submethods.
handlers._users = {};


// Users - post
// Requried data: firstName, lastName, phone, password, tosAggrement
// Optinal data: none
handlers._users.post = function (data, callback) {
    // Check that all the required fields are filled out.
    let firstName = typeof (data.payload.firstName) == "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof (data.payload.lastName) == "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof (data.payload.phone) == "string" && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof (data.payload.password) == "string" && data.payload.password.trim().length > 10 ? data.payload.password.trim() : false;
    let tosAgreement = typeof (data.payload.tosAgreement) == "boolean" && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && password && phone && tosAgreement) {
        // Make sure that the user doesn't already exists.
        _data.read('users', phone, function (err, data) {
            if (err) {
                // Hash the password.
                let hashedPassword = helpers.hash(password);

                if (hashedPassword) {

                    // Create the user object.
                    let userObject = {
                        firstName,
                        lastName,
                        phone,
                        "hashedPassword": hashedPassword,
                        tosAgreement
                    };

                    // Store the user
                    _data.create('users', phone, userObject, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log("Error while creating user: ", err);
                            callback(500, { "Error": "Could not create the new user" });
                        }
                    });
                } else {
                    callback(500, { "Error": "Could nto hash the user\'s password" })
                }
            } else {
                // User already exists with that phone number.
                callback(400, { "Error": "A user with the phone number already exists" });
            }
        });
    } else {
        callback(400, { 'Error': "Missing required fields" });
    }
}


// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function (data, callback) {
    // Check that the phone number provided is valid.
    let phone = typeof (data.queryStringObject.phone) == "string" && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false;
    if (phone) {

        // Get the token from the headers
        let token = typeof (data.headers.token) == "string" ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {

            if (tokenIsValid) {
                // Lookup the user.
                _data.read("users", phone, function (err, userData) {
                    if (!err && userData) {
                        // Remove the hashed password from the user object before sending the response.
                        delete userData.hashedPassword;
                        callback(200, userData);
                    } else {
                        callback(404)
                    }
                });
            } else {
                callback(403, { "Error": "Missing required token in header, or token is invalid" });
            }
        });

    } else {
        callback(400, { "Error": "Missing required field" });
    }
}


// Users - put
// Required data: phone
// Optional data: firstName, lastName, password, (at least one must be specified)
handlers._users.put = function (data, callback) {
    // Check for the required field
    let phone = typeof (data.payload.phone) == "string" && data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    let firstName = typeof (data.payload.firstName) == "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof (data.payload.lastName) == "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof (data.payload.password) == "string" && data.payload.password.trim().length > 10 ? data.payload.password.trim() : false;

    // Error if the phone is invalid.
    if (phone) {

        // Get the token from the headers
        let token = typeof (data.headers.token) == "string" ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {

            if (tokenIsValid) {

                if (firstName || lastName || password) {
                    // Lookup the user
                    _data.read("users", phone, function (err, userData) {
                        if (!err && userData) {
                            // Update the fields necessary.
                            if (firstName) {
                                userData.firstName = firstName;
                            }
                            if (lastName) {
                                userData.firstName = lastName;
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }

                            // Store the new updates
                            _data.update('users', phone, userData, function (err) {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log("Error while updating user: ", err);
                                    callback(500, { "Error": "Could not update the user" });
                                }
                            });
                        } else {
                            callback(400, { "Error": "The specified user does not exists" });
                        }
                    })
                } else {
                    callback(400, { "Error": "Missing fields to update" });
                }

            } else {
                callback(403, { "Error": "Missing required token in header, or token is invalid" });
            }
        });

    } else {
        callback(400, { 'Error': "Missing required field" })
    }
}


// Users - delete
// Required field: phone
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = function (data, callback) {
    // Check that the phone number provided is valid.
    let phone = typeof (data.queryStringObject.phone) == "string" && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false;
    if (phone) {

        // Get the token from the headers
        let token = typeof (data.headers.token) == "string" ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {

            if (tokenIsValid) {

                // Lookup the user.
                _data.read("users", phone, function (err, userData) {
                    if (!err && userData) {
                        _data.delete("users", phone, function (err) {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, { "Error": "Could not delete the specified user" });
                            }

                        });
                    } else {
                        callback(404, { "Error": "Could not find the specified user" })
                    }
                });

            } else {
                callback(403, { "Error": "Missing required token in header, or token is invalid" });
            }

        });
    } else {
        callback(400, { "Error": "Missing required field" });
    }
}


// Tokens.
handlers.tokens = function (data, callback) {

    let acceptableMethdos = ["post", "get", "put", "delete"];

    // if it's one of the acceptable methods.
    if (acceptableMethdos.includes(data.method)) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};


// Container for all the tokens methdos.
handlers._tokens = {};

// Tokens - post
// Required data: phone, password.
// Optional data: None
handlers._tokens.post = function (data, callback) {
    let phone = typeof (data.payload.phone) == "string" && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof (data.payload.password) == "string" && data.payload.password.trim().length > 10 ? data.payload.password.trim() : false;

    if (phone && password) {
        // Lookup the user who matches the phone number.
        _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
                // Hash the sent password, and compare it to the password stored in the user object.
                let hashedPassword = helpers.hash(password);

                if (hashedPassword == userData.hashedPassword) {
                    // If valid, create a new token with a random name. Set expiration date one hour in the future.
                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() + 1000 * 60 * 60;
                    let tokenObject = {
                        phone,
                        id: tokenId,
                        expires
                    };

                    // Store the token.
                    _data.create('tokens', tokenId, tokenObject, function (err) {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, { "Error": "Couldn\'t create the new token" });
                        }
                    })
                } else {
                    callback(400, { "Error": "Password did not match the specified user\'s stored password" });
                }
            } else {
                callback(400, { "Error": "Could not find the specified user" });
            }
        });
    } else {
        callback(400, { "Error": "Missing required filed(s)" });
    }
};

// Tokens - get
// Required data: token id
// Option data: None
handlers._tokens.get = function (data, callback) {
    // Check that the id is valid.
    let tokenId = typeof (data.queryStringObject.tokenId) == "string" && data.queryStringObject.tokenId.trim().length == 20 ? data.queryStringObject.tokenId : false;
    console.log(data.queryStringObject);
    if (tokenId) {
        _data.read('tokens', tokenId, function (err, tokenData) {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { "Error": "Missing required fields" });
    }
};

// Tokens - put
// Required data: id, extend (boolean)
// Optional data: None
handlers._tokens.put = function (data, callback) {

    let tokenId = typeof (data.payload.tokenId) == "string" && data.payload.tokenId.trim().length == 20 ? data.payload.tokenId.trim() : false;
    let extend = typeof (data.payload.extend) == "boolean" && data.payload.extend ? true : false;

    if (tokenId && extend) {
        // Look up the token.
        _data.read("tokens", tokenId, function (err, tokenData) {
            if (!err && tokenData) {
                // Check if the token is still valid (not expired).
                if (tokenData.expires > Date.now()) {
                    // Set the expiration an hour from now.
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    // Store the new updates.
                    _data.update("tokens", tokenId, tokenData, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { "Error": "Could not update token'\s expiration" });
                        }
                    });
                } else {
                    callback(400, { "Error": "The token has already expired and cannot be extended" });
                }
            } else {
                callback(400, { "Error": "Specified token does not exists" });
            }
        })
    } else {
        callback(400, { "Error": "Missing required field(s)" });
    }
};

// Tokens - delete
// Required data: id
// Optional data: None
handlers._tokens.delete = function (data, callback) {
    // Check that the token provided is valid.
    let tokenId = typeof (data.queryStringObject.tokenId) == "string" && data.queryStringObject.tokenId.trim().length == 20 ? data.queryStringObject.tokenId : false;
    if (tokenId) {
        // Lookup the token.
        _data.read("tokens", tokenId, function (err, tokenData) {
            if (!err && tokenData) {
                _data.delete("tokens", tokenId, function (err) {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, { "Error": "Could not delete the specified token" });
                    }

                });
            } else {
                callback(404, { "Error": "Could not find the specified token" })
            }
        });
    } else {
        callback(400, { "Error": "Missing required field" });
    }
};


// Verify if a given token id is a currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback) {
    // Lookup the token
    _data.read("tokens", id, function (err, tokenData) {
        if (!err && tokenData) {
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    })
}


// Checks.
handlers.checks = function (data, callback) {

    let acceptableMethdos = ["post", "get", "put", "delete"];

    // if it's one of the acceptable methods.
    if (acceptableMethdos.includes(data.method)) {
        handlers._checks[data.method](data, callback);
    } else {
        callback(405);
    }
};


// Container for all the checks methods.
handlers._checks = {};

// Checks -- post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: None
handlers._checks.post = function (data, callback) {
    // Validate all the inputs.
    let protocol = typeof (data.payload.protocol) == "string" && ["https", "http"].indexOf(data.payload.protocol) > -1 ? data.payload.protocol.trim() : false;
    let url = typeof (data.payload.url) == "string" && data.payload.url.length > 0 ? data.payload.url.trim() : false;
    let method = typeof (data.payload.method) == "string" && ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1 ? data.payload.protocol.trim() : false;
    let successCodes = typeof (data.payload.successCodes) == "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof (data.payload.timeoutSeconds) == "number" && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {

        // Get the token from the headers.
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        // Lookup the user by reading the token.
        _data.read('tokens', token, function (err, tokenData) {
            if (!err && tokenData) {

                let userPhone = tokenData.phone;
                // Lookup the user data.
                _data.read('users', userPhone, function (err, userData) {

                    if (!err && userData) {
                        let userChecks = typeof (userData) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify that the user has less than max checks per user.
                        if (userChecks.length < config.maxChecks) {
                            // Create a random id for the check.
                            let checkId = helpers.createRandomString(20);

                            // Create the check object and include the user's phone.
                            let checkObject = {
                                "id": checkId,
                                userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeoutSeconds
                            }

                            // Save the object.
                            _data.create('checks', checkId, checkObject, function (err) {
                                if (!err) {
                                    // Add the check id to the user's object.
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // Save the new user data.
                                    _data.update('users', userPhone, userData, function (err) {
                                        if (!err) {
                                            // Return the data about the new checks.
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, { "Error": "Could not update the user with the new check" });
                                        }
                                    });

                                } else {
                                    callback(500, { "Error": "Could not create the new check" });
                                }
                            })
                        } else {
                            callback(400, { "Error": `The user already has the maximum number of checks (${config.maxChecks})` })
                        }

                    } else {
                        callback(403);
                    }
                });

            } else {
                callback(403);
            }
        });

    } else {
        callback(400, { "Error": "Missing required inputs, or inputs are invalid" });
    }

}

// Checks - get
// Required data: id
// Optional data: None
handlers._checks.get = function (data, callback) {
    // Check that the id is valid.
    let id = typeof (data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;
    if (id) {

        // Lookup the check
        _data.read('checks', id, function (err, checkData) {

            if (!err && checkData) {
                // Get the token from the headers
                let token = typeof (data.headers.token) == "string" ? data.headers.token : false;
                // Verify that the given token is valid and belongs to the same user who created the check.
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {

                    if (tokenIsValid) {
                        // Return the checkData.
                        callback(200, checkData);
                    } else {
                        callback(403, { "Error": "Missing required token in header, or token is invalid" });
                    }
                });
            } else {
                callback(404);
            }
        });

    } else {
        callback(400, { "Error": "Missing required field" });
    }
}

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds one of them must be present.
handlers._checks.put = function (data, callback) {
    // Check for the required field.
    let id = typeof (data.payload.id) == "string" && data.payload.id.trim().length == 20 ? data.payload.id : false;
    // Check for the optional fields.
    let protocol = typeof (data.payload.protocol) == "string" && ["https", "http"].indexOf(data.payload.protocol) > -1 ? data.payload.protocol.trim() : false;
    let url = typeof (data.payload.url) == "string" && data.payload.url.length > 0 ? data.payload.url.trim() : false;
    let method = typeof (data.payload.method) == "string" && ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1 ? data.payload.protocol.trim() : false;
    let successCodes = typeof (data.payload.successCodes) == "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof (data.payload.timeoutSeconds) == "number" && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (id) {
        // Check for one of the field to be updated.
        if (protocol || url || method || successCodes || timeoutSeconds) {

            // Lookup the check.
            _data.read("checks", id, function (err, checkData) {
                if (!err && checkData) {
                    // Get the token from the headers
                    let token = typeof (data.headers.token) == "string" ? data.headers.token : false;
                    // Verify that the given token is valid and belongs to the same user who created the check.
                    handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                        if (tokenIsValid) {
                            // Update the check wehre necessary.
                            if (protocol) {
                                checkData.protocol = protocol;
                            }
                            if (url) {
                                checkData.url = url;
                            }
                            if (method) {
                                checkData.method = method;
                            }
                            if (successCodes) {
                                checkData.successCodes = successCodes;
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            // Store the new data.
                            _data.update('checks', id, checkData, function (err) {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(500, { "Error": "Could not update the check data" });
                                }
                            });

                        } else {
                            callback(403);
                        }
                    });

                } else {
                    callback(400, { "Error": "Check id did not match" });
                }
            });

        } else {
            callback(400, { "Error": "Missing fields to be updated" });
        }

    } else {
        callback(400, { "Error": "Missing required field" });
    }
}

// Checks - delete
// Required field: id
// Optional data: None
handlers._checks.delete = function (data, callback) {
    // Check that the phone number provided is valid.
    let id = typeof (data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;
    if (id) {

        // Lookup the check
        _data.read('checks', id, function (err, checkData) {
            if (!err && checkData) {

                // Get the token from the headers
                let token = typeof (data.headers.token) == "string" ? data.headers.token : false;
                // Verify that the given token is valid for the phone number
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {

                    if (tokenIsValid) {

                        // Delete the check data
                        _data.delete('checks', id, function (err) {
                            if (!err) {

                                // Lookup the user.
                                _data.read("users", checkData.userPhone, function (err, userData) {
                                    if (!err && userData) {

                                        let userChecks = typeof (userData) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        // Remove the deleted check from the checks list.
                                        let checkPosition = userChecks.indexOf(id);
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1);
                                            // Re-save the user's data.
                                            _data.update("users", checkData.userPhone, userData, function (err) {
                                                if (!err) {
                                                    callback(200);
                                                } else {
                                                    callback(500, { "Error": "Could not update the user" });
                                                }

                                            });
                                        } else {
                                            callback(500, { "Error": "Could not find the check on the users object, so could not remove it" });
                                        }

                                    } else {
                                        callback(404, { "Error": "Could not find the user who created the check" });
                                    }
                                });

                            } else {
                                callback(500, { "Error": "Could not delete the check data" });
                            }
                        })

                    } else {
                        callback(403, { "Error": "Missing required token in header, or token is invalid" });
                    }

                });

            } else {
                callback(400, { "Error": "The specified id does not exists" });
            }
        })
    } else {
        callback(400, { "Error": "Missing required field" });
    }
}

// Ping handler, to check the health of app.
handlers.ping = function (data, callback) {
    // Callback a http status code, and a payload object (JSON).
    callback(200);
};

// Not found handler.
handlers.notFound = function (data, callback) {
    callback(404);
};

// Export the module.
module.exports = handlers;
