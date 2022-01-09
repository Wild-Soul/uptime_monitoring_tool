/**
 * Request handlers.
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

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
// @TODO Only let an authenticated user access their object, don't let them access anyone else's.
handlers._users.get = function (data, callback) {
    // Check that the phone number provided is valid.
    let phone = typeof (data.queryStringObject.phone) == "string" && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false;
    if (phone) {
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
        callback(400, { "Error": "Missing required field" });
    }
}


// Users - put
// Required data: phone
// Optional data: firstName, lastName, password, (at least one must be specified)
// @TODO Only let an authenticatd user update their own object, don't let them update anyone else's
handlers._users.put = function (data, callback) {
    // Check for the required field
    let phone = typeof (data.payload.phone) == "string" && data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    let firstName = typeof (data.payload.firstName) == "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof (data.payload.lastName) == "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof (data.payload.password) == "string" && data.payload.password.trim().length > 10 ? data.payload.password.trim() : false;

    // Error if the phone is invalid.
    if (phone) {
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
        callback(400, { 'Error': "Missing required field" })
    }
}


// Users - delete
// Required field: phone
// @TODO Only let an authenticated user delete their object. Don't let anyone else do it
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = function (data, callback) {
    // Check that the phone number provided is valid.
    let phone = typeof (data.queryStringObject.phone) == "string" && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false;
    if (phone) {
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
