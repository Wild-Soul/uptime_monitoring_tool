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
        chosenHandler(data, function (statusCode = 200, payload = {}, contentType) {
            // Determine the type of response (fallback to JSON)
            contentType = typeof(contentType) == 'string' ? contentType : 'json';

            // Return the response-parts that are content-specific.
            let payloadString = '';
            if (contentType == 'json') {
                res.setHeader('Content-Type', 'application/json');
                payload = typeof (payload) == 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
            }

            if (contentType == 'html') {
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof (payload) == 'string' ? payload : '';
            }

            // Return the response-parts that are common to all content-type.
            res.writeHead(statusCode);
            res.end(payloadString);

            // If the response is 200, print in green otherwise in red.
            if (statusCode === 200) {
                console.log('\x1b[32m%s\x1b[0m', "Returning response:" + statusCode + payloadString);
            } else {
                console.log('\x1b[31m%s\x1b[0m', "Returning response:" + statusCode + payloadString);
            }
        });
    })

}


// Defining a request router.
server.router = {
    "": handlers.index,
    "account/create": handlers.accountCreate,
    "account/edit": handlers.accountEdit,
    "account/deleted": handlers.accountDeleted,
    "session/create": handlers.sessionCreate,
    "session/deleted": handlers.sessionDeleted,
    "checks/all": handlers.checksList,
    "checks/create": handlers.checksCreate,
    "checks/edit": handlers.checksEdit,
    "ping": handlers.ping,
    "api/users": handlers.users,
    "api/tokens": handlers.tokens,
    "api/checks": handlers.checks
}

server.init = function () {
    // Start listening for requests. HTTP server
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[36m%s\x1b[0m', "Server started listenin on port:" + config.httpPort);
    });

    // Instantiate the HTTPS server.
    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[36m%s\x1b[0m', "Server started listenin on port:" + config.httpsPort);
    });

}

// Export the server.
module.exports = server;
