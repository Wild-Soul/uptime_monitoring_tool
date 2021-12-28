/**
 * Primary file for the API
 */

// Dependencies
const http = require("http");
const url = require("url");

// The server should respond to all requests with a string
const server = http.createServer(function(req, res) {
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

    // Send the response
    res.end("Hello World\n");
    console.log("Request received on path: ", trimmedPath, "with method:", method);
    console.log("Query string params:", queryStringObject, "with headers:", headers);
});

// Start listening for requests.
server.listen(3000, () => {
    console.log("Server started listenin on port:", 3000);
})