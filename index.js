/**
 * Primary file for the API
 */

// Dependencies
const http = require("http");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const https = require("https");
const fs = require("fs");
const config = require("./config");
const _data = require('./lib/data');

// TESTING
// @TODO delete this.
// _data.create('test', 'newFile', {'foo': 'bar'}, function(err) {
//     console.log("This was the error", err);
// });
// _data.read('test', 'newFile', function(err, data) {
//     console.log("This was the error while reading file: ", err);
//     console.log("This is the data from file:", data);
// });
// _data.update('test', 'newFile', {'fizz': 'buzz'}, function(err) {
//     console.log("This was the error while updating", err);
// });
// _data.delete('test', 'newFile', function(err) {
//     console.log("Error while deleting file: ", err);
// });

// Intsantiate the http server
const httpServer = http.createServer(function (req, res) {
    unifiedServer(req, res);
});

// Instantiate the https server.
let httpsServerOptions =  {
    "key": fs.readFileSync("./https/key.pem"),
    "cert": fs.readFileSync("./https/cert.pem")
};

const httpsServer = https.createServer(httpsServerOptions, function (err, res) {
    unifiedServer(req, res);
});


// Define route handlers.
let handlers = {};

// Ping handler, to check the health of app.
handlers.ping = function (data, callback) {
    // Callback a http status code, and a payload object (JSON).
    callback(200);
};

// Not found handler.
handlers.notFound = function (data, callback) {
    callback(404);
};

// Defining a request router.
let router = {
    "ping": handlers.ping
}

// All the server logic for both the thtp and https server.
let unifiedServer = function (req, res) {
    // Get the url and parse it.
    let parsedUrl = url.parse(req.url, true);

    // Get the path
    let path = parsedUrl.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object.
    let queryStringObject = parsedUrl.query;

    // Get the HTTP Method.
    let method = req.method.toLowerCase();

    // Get the header as an object..
    let headers = req.headers;

    // Get the payload, if any.
    let decoder = new StringDecoder("utf-8");
    let buffer = ""; // will store the data, since we get payload in stream

    req.on("data", function (data) {
        buffer += decoder.write(data);
    });

    req.on("end", function () {
        buffer += decoder.end();

        // Choose the handler this request should go to, if one is not found then go for notFound handler.
        let chosenHandler = typeof (router[trimmedPath]) !== "undefined" ? router[trimmedPath] : handlers.notFound;

        // Construct the data object to be sent to the handler.
        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            "payload": buffer
        };

        // Route the request to the handler specified by the route (trimmedPath).
        chosenHandler(data, function (statusCode = 200, payload = {}) {
            // Convert the payload to a string.
            let payloadString = JSON.stringify(payload);

            // Return the response
            // Set the header, to indicate it's a json response
            res.setHeader("Content-Type", "application/json")
            // Write status code and then send response.
            res.writeHead(statusCode);
            res.end(payloadString);
            console.log("Returning response:", statusCode, payloadString);
        });
    })

}


// Start listening for requests. HTTP server
httpServer.listen(config.httpPort, () => {
    console.log("Server started listenin on port:", config.httpPort);
});

// Instantiate the HTTPS server.
httpsServer.listen(config.httpsPort, () => {
    console.log("Server started listenin on port:", config.httpsPort);
});
