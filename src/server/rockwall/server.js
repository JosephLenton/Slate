"use static";

/**
 * Rockwall Server
 *
 * The core server handling section of Rockwall.
 */

exports.Server = (function() {
    var RockwallRequest  = require( './rockwall-request.js'  ).RockwallRequest,
        RockwallResponse = require( './rockwall-response.js' ).RockwallResponse;

    var http = require('http'),
        fs   = require('fs');

    var rockwall = function() {
        this.fileMimeTypes = {};

        this.notFoundFun = null;

        this.publicFolder = '';
        this.realPublicFolder = '';

        this.routing = {};
    };

    var ensureSlash = function( str ) {
        if ( str === '' ) {
            return './';
        } else if ( str.charAt(str.length-1) !== '/' ) {
            return str + '/';
        } else {
            return str;
        }
    }

    var parseExtension = function( str ) {
        var lastDot = str.lastIndexOf( '.' );

        if ( lastDot !== -1 ) {
            return str.substring( lastDot+1 );
        } else {
            return '';
        }
    }

    var trimSlashes = function( str ) {
        if ( str === '' || str === '/' || str === '//' ) {
            return '';
        } else {
            /*
             * Remove leading, and trailing, slashes.
             */
            if ( str.charAt(0) === '/' ) {
                if ( str.charAt(str.length-1) === '/' ) {
                    return str.substring( 1, str.length1 );
                } else {
                    return str.substring( 1, str.length );
                }
            } else if ( str.charAt(str.length-1) === '/' ) {
                return str.substring( 0, str.length-1 );
            } else {
                return str;
            }
        }
    }

    var parseUrl = function( str ) {
        var query = {},
            parts = []
            partsStr = '';

        str = trimSlashes( str );

        if ( str !== '' ) {
            var queryStr = null;

            /*
             * Handle the query section.
             */
            var queryParam = str.indexOf( '?' );
            if ( queryParam !== -1 ) {
                partsStr = str.substring( 0, queryParam );
                queryStr = str.substring( queryParam );

                queryParts = queryStr.split( '&' );
                for ( var i = 0; i < queryParts.length; i++ ) {
                    var queryPart = queryParts[i];
                    var equal = queryPart.indexOf('=');

                    if ( equal !== -1 ) {
                        query[ queryPart.substring(0, equal) ] = queryPart.substring(equal+1);
                    } else {
                        query[ queryPart ] = true;
                    }
                }
            } else {
                partsStr = str;
            }

            parts = partsStr.split('/');
        } else {
            partsStr = str;
        }

        return {
                fileUrl : partsStr,
                url     : str,
                parts   : parts,
                query   : query
        }
    }

    var runRequest = function( url, req, res, fun ) {
        console.log( 'request ' + req.url );

        if ( fun ) {
            fun(url, req, res);
        }
    }

    var runNotFound = function( url, req, res, fun ) {
        res.writeHead( 404, {'Content-Type': 'text/html'} );

        console.log( 'unknown ' + req.url );

        if ( fun ) {
            fun( url, req, res );
        }

        res.end();
    }

    var getRoute = function( routes, parts ) {
        if ( parts.length === 0 ) {
            return routes[''];
        } else {
            for ( var i = 0; i < parts.length; i++ ) {
                var next = parts[i];

                if ( routes.hasOwnProperty(next) ) {
                    var routes = routes[ next ];

                    if ( typeof routes === 'function' ) {
                        return routes;
                    } else if ( routes === undefined ) {
                        break;
                    }
                } else {
                    break;
                }
            }

            return undefined;
        }
    }

    var setRoute = function( routes, url, action ) {
        var parts = trimSlashes(url).split( '/' );

        for ( var i = 0; i < parts.length-1; i++ ) {
            var part = parts[i];
            var nextRoute = routes[part];

            if ( nextRoute === undefined ) {
                routes[part] = nextRoute = {};
            } else if ( typeof nextRoute !== 'object' ) {
                throw new Error("route already exists for " + url);
            }

            routes = nextRoute;
        }

        var last = parts[parts.length-1];

        if ( routes[last] !== undefined ) {
            throw new Error("route already exists for " + url);
        }

        routes[ last ] = action;
    }

    rockwall.prototype = {
        serveFile: function( fileUrl, req, res, ifNotFound, success ) {
            var self = this;

            if ( ! ifNotFound ) {
                ifNotFound = function() {
                    runNotFound( fileUrl, req, res );
                }
            }

            try {
                var path = fs.realpathSync( this.realPublicFolder + fileUrl ).replace( /\\/g, "/" );

                if ( path.indexOf(this.realPublicFolder) === 0 ) {
                    fs.exists( path, function(exists) {
                        if ( exists ) {
                            fs.readFile( path, function( err, data ) {
                                if ( err ) {
                                    ifNotFound.call( self );
                                } else {
                                    var ext  = parseExtension( fileUrl );
                                    var mime = self.fileMimeTypes[ ext ] || 'text/plain';

                                    console.log( '   file ' + req.url );

                                    res.writeHead( 200, {'Content-Type': mime} );
                                    res.write( data );

                                    if ( success ) {
                                        success();
                                    }

                                    res.end();
                                }
                            } );
                        } else {
                            ifNotFound.call( self );
                        }
                    } );

                    return true;
                }
            } catch ( err ) {
                ifNotFound.call( self );
            }

            return false;
        },

        mime: function( ext, mime ) {
            if ( arguments.length === 2 ) {
                if ( ext.charAt(0) === '.' ) {
                    ext = ext.substring( 1 );
                }

                this.fileMimeTypes[ ext ] = mime;
            } else {
                if ( typeof ext === 'object' ) {
                    for ( var k in ext ) {
                        if ( ext.hasOwnProperty(k) ) {
                            this.mime( k, ext[k] );
                        }
                    }
                }
            }

            return this;
        },

        handleFileRequest: function(url, req, res) {
            if ( url.fileUrl !== '' ) {
                var ifNotFound = function() {
                    this.handleRequest( url, req, res );
                }

                if ( this.serveFile(url.fileUrl, req, res, ifNotFound) ) {
                    return;
                }
            }

            this.handleRequest( url, req, res );
        },

        handleRequest: function(url, req, res) {
            var action = getRoute( this.routing, url.parts );

            if ( action !== undefined ) {
                runRequest(
                        url, req, res,
                        action
                );
            } else {
                runNotFound(
                        url, req, res,
                        this.notFoundFun
                );
            }
        },

        pageNotFound: function( notFoundFun ) {
            this.notFoundFun = notFoundFun;
        },

        route: function( url, action ) {
            if ( arguments.length === 1 ) {
                if ( typeof url === 'object' ) {
                    for ( var k in url ) {
                        if ( url.hasOwnProperty(k) ) {
                            setRoute( this.routing, k, url[k] );
                        }
                    }
                } else {
                    throw new Error( 'Invalid argument given' );
                }
            } else {
                setRoute( this.routing, url, action );
            }
        },

        start: function( publicFolder, port ) {
            if ( port === undefined ) {
                port = 80;
            }

            this.publicFolder     = ensureSlash( publicFolder );
            this.realPublicFolder = ensureSlash( fs.realpathSync(this.publicFolder) ).replace( /\\/g, '/' );

            if ( ! this.notFoundFun ) {
                throw new Error( 'no page not found function provided' );
            }

            var self = this;
            http.createServer(function(req, res) {
                var url = parseUrl( req.url );

                self.handleFileRequest( url,
                        new RockwallRequest(req),
                        new RockwallResponse(res)
                );
            }).listen( port );

            console.log( 'server listening on port ' + port );
        }
    }

    return rockwall;
})();

