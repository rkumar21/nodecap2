nodecap2
=======

[![Join the chat at https://gitter.im/horpto/nodecap2](https://badges.gitter.im/horpto/nodecap2.svg)](https://gitter.im/horpto/nodecap2?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

It is fork of [nodecap](https://www.npmjs.com/package/nodecap) with some fixes and performance improvements.
I didn't change gh pages, docs and tests yet.

ICAP server framework for node.js - create custom HTTP proxy filters for Squid, etc. **nodecap** implements the [ICAP protocol](http://www.icap-forum.org/documents/specification/rfc3507.txt).

## Use Case
[Squid](http://www.squid-cache.org/) and other HTTP proxy servers typically provide only basic levels of filtering. **nodecap** implements the ICAP protocol, allowing for dynamic, per-request filtering and modification of requests and responses.

Examples:

* Whitelist some domains (eg http://example.com) and then dynamically graylist domains that appear frequently in the response HTML (eg example.com's asset CDN, http://cdn.example.net).
* Rewrite response content
* Verify MIME types of requests/responses
* Perform request-time validation against other services (anything you can do in node)


## Usage

See `examples/example.js` for a full example.

The basics:

	# server.js
	var ICAPServer = require('nodecap').ICAPServer;

	//  run the server
	var server = new ICAPServer({
	  debug: false,
		// 4096 by default - size of chunks that will send to Squid
		// 0 - not slice big chunks by chunkSize
		chunkSize: 0
	});
	console.log('Starting ICAP server...');
	server.listen(function(port) {
	  console.log('ICAP server listening on port ' + port);
	});


## Configuration & Getting Started

Consult your proxy's documentation to understand how to configure the proxy to talk to your ICAP server. It is recommended that you configure requests and responses to be sent to different paths (resource endpoints) on your ICAP server.

The best documentation is the example and tests, which demonstrate example ICAP requests, ICAP handling, and ICAP responses.

## API Configuration

### `server.options(path, next)`
Allows configuration of a given ICAP endpoint. To set the options for endpoint `/squid/configured/request-path`, you could use:

	# server.js
	server.options('/squid/configured/request-path', function(icapReq, icapRes, next) {
	  icapRes.setIcapStatusCode(200);
	  icapRes.setIcapHeaders({
	    'Methods': 'REQMOD',
	    'Preview': '128'
	  });
	  icapRes.writeHeaders(false);
	  icapRes.end();
	});

## API Routing

**nodecap** presents an expressjs-style API where middleware can be declared and matched to requests. Instead of request URI/method combinations, the unit of matching is domains through the `DomainList` class, which implements an efficient matcher for squid3 whitelist/blacklist syntax. Middlware is attached to handle requests to / responses from lists of domains:

### `server.request(domainList, next)`
Adds middleware to handle a REQMOD (HTTP request modification). The callback signature is `callback(icapRequest, icapResponse, httpRequest, httpResponse, next)`. Calling `next()` is optional and will continue to the next handler. Be sure to have a catch-all handler at the end. `domainList` can be either a DomainList instance - which allows matching request domains against a configured list - or the literal string`"*"` to match all requests.

### `server.response(domainList, next)`
Adds middleware to handle a RESPMOD (HTTP response modification). The `domainList` and `next` options are the same as for `server.request`.

### `server.error(err, icapReq, icapRes, next)`
Adds middleware to handle errors that occur either at the protocol level or within any options/request/response middleware.


### License

The MIT License (MIT)

Copyright (c) 2014 Joseph Savona

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
