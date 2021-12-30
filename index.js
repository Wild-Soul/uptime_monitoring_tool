/**
 * Primary file for the API
 */

// Dependencies
const http = require("http");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");

// The server should respond to all requests with a string
const server = http.createServer(function (req, res) {
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
        let chosenHandler = typeof(router[trimmedPath]) !== "undefined" ? router[trimmedPath] : handlers.notFound;

        // Construct the data object to be sent to the handler.
        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            "payload": buffer
        };

        // Route the request to the handler specified by the route (trimmedPath).
        chosenHandler(data, function(statusCode=200, payload={}) {
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

});

// Define route handlers.
let handlers = {};

// Sample handler.
handlers.sample = function(data, callback) {
    // Callback a http status code, and a payload object (JSON).
    callback(406, {"name": "sample handler"});
};

// Not found handler.
handlers.notFound = function(data, callback) {
    callback(404);
};

// Defining a request router.
let router = {
    "sample": handlers.sample
}

// Start listening for requests.
server.listen(config.port, () => {
    console.log("Server started listenin on port:", config.port, "in", config.envName, "mode");
})