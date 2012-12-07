"use strict";

(function() {
    var handleAjaxResponse = function( callback ) {
        return function(err, ajax, src) {
            if ( err ) {
                callback( err );
            } else {
                var headers = ajax.getAllResponseHeaders();
                var headersObj = {},
                    mime;

                if ( headers ) {
                    headers = headers.split("\n");

                    for ( var i = 0; i < headers.length; i++ ) {
                        var header = headers[i];
                        var firstColon = header.indexOf(':');

                        if ( firstColon === -1 ) {
                            headersObj[ header ] = '';
                        } else {
                            headersObj[ header.substr(0, firstColon) ] =
                                    header.substr( firstColon+1 );
                        }
                    }

                    mime = ajax.getResponseHeader( 'content-type' ).split(';')[0];
                } else {
                    mime = 'text/plain';
                }

                callback({
                        src     : src,

                        status  : ajax.status,

                        type    : ajax.responseType,
                        text    : ajax.responseText,
                        xml     : ajax.responseXML,

                        mime    : mime,
                        headers : headers
                })
            }
        }
    }

    var get = function( path, callback ) {
        slate.util.ajaxGet( path, handleAjaxResponse(callback) );
    }

    var head = function( path, callback ) {
        slate.util.ajaxHead( path, handleAjaxResponse(callback) );
    }

    var read = function( path, onDisplay ) {
        if ( path.search(/http(s?):\/\//) !== -1 ) {
            slate.util.ajaxGet( path, function(err, data, mime) {
                if ( err ) {
                    onDisplay( err );
                } else {
                    if ( mime ) {
                        mime = mime.
                                replace( /^[a-zA-Z]+\//, '' ).
                                replace( /;.*$/, '' );
                    } else {
                        var lastDot   = path.lastIndexOf('.'),
                            lastSlash = Math.max(
                                    path.lastIndexOf('/'),
                                    path.lastIndexOf("\\")
                            );

                        if ( lastDot > lastSlash ) {
                            mime = path.substring( lastDot + 1 );
                        } else {
                            mime = null;
                        }
                    }

                    if ( ! tryLoader(path, data, mime, onDisplay) ) {
                        onDisplay( data )
                    }
                }
            } );
        } else {
            slate.util.ajaxGet( path, function(err, data, mime) {
                if ( err ) {
                    onDisplay( new Error('file not found ' + path) );
                } else {
                    try {
                        onDisplay( data );
                    } catch ( ex ) {
                        onDisplay( ex );
                    }
                }
            } )
        }
    }

    var newReader = function(path) {
        return function( callback ) {
            read( path, callback );
        }
    }

    var tryLoader = function( path, data, mime, onDisplay ) {
        if ( mime.indexOf('/') !== -1 ) {
            mime = mime.split('/')[1];
        }

        var loader = slate.data.loaders[ mime ];

        if ( loader ) {
            try {
                var loaderResult = loader(
                        path,
                        data ?
                                function(callback) { callback(data);      } :
                                function(callback) { read(path, callback) }
                );

                if ( loaderResult !== undefined ) {
                    onDisplay( loaderResult );

                    return loaderResult;
                }
            } catch ( ex ) {
                onDisplay( ex );
            }

            return true;
        } else {
            return false;
        }
    }

    var applyLoader = function( path, mime, onDisplay ) {
        if ( mime ) {
            var r = tryLoader( path, undefined, mime, onDisplay );

            if ( r ) {
                return r;
            }
        }

        read( path, onDisplay );
    }

    /**
     * Loads ...
     *  - a text file, gets dumped in a pre
     *  - images
     *  - html files, inputted in a HTML frame
     *  - an url, inputted in a HTML frame
     *  - an array of any of the above
     */
    var load = function( path, onDisplay, state ) {
        if ( path instanceof File ) {
            path = file.path;
        }

        if ( slate.util.isString(path) ) {
            if ( path.search(/^http(s?):\/\//) !== -1 ) {
                // don't know the mime type, so we do a head request, and guess
                head( path, function( request ) {
                    applyLoader( path, request.mime, onDisplay );
                } )
            } else {
                if ( path.search(/^file:\/\//) !== -1 ) {
                    path = slate.util.absoluteUrl( path );
                }

                var lastDot   = path.lastIndexOf( '.' );
                var extension = path.substring( lastDot+1 );

                return applyLoader( path, extension, onDisplay );
            }
        } else {
            throw new Error( "unknown value given for load" );
        }
    }

    slate.commandEach({
            load: load,
            head: head,
            get : get
    })
})();
