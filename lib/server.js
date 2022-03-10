/**
 * These are server related tasks.
 */

// Dependencies
const http = require("http");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const https = require("https");
const fs = require("fs");
const config = require("./config");
const _data = require('./data');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

// Instantiate a server module object.
let server = {};

// Intsantiate the http server
server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});

// Instantiate the https server.
server.httpsServerOptions = {
    "key": fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
    "cert": fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function (err, res) {
    server.unifiedServer(req, res);
});

// All the server logic for both the http and https server.
server.unifiedServer = function (req, res) {
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
        let chosenHandler = typeof (server.router[trimmedPath]) !== "undefined" ? server.router[trimmedPath] : handlers.notFound;

        // Construct the data object to be sent to the handler.
        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            "payload": helpers.parseJsonToObject(buffer)
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


// Defining a request router.
server.router = {
    "ping": handlers.ping,
    "users": handlers.users,
    "tokens": handlers.tokens,
    "checks": handlers.checks
}

server.init = function () {
    // Start listening for requests. HTTP server
    server.httpServer.listen(config.httpPort, () => {
        console.log("Server started listenin on port:", config.httpPort);
    });

    // Instantiate the HTTPS server.
    server.httpsServer.listen(config.httpsPort, () => {
        console.log("Server started listenin on port:", config.httpsPort);
    });

}

// Export the server.
module.exports = server;