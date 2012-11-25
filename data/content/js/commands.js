"use strict";

(function(window) {
    var slate = window.slate = window.slate || {};

    slate.commands = {
        bindCommands : function( onSuccess, onError ) {
            var safe = function( callback ) {
                try {
                    callback();
                } catch ( ex ) {
                    onError( undefined, ex );
                }
            }

            /**
             * Loads ...
             *  - a text file, gets dumped in a pre
             *  - images
             *  - html files, inputted in a HTML frame
             *  - an url, inputted in a HTML frame
             *  - an array of any of the above
             */
            window.load = function( path ) {
                // array
                if ( slate.util.isArray(path) ) {
                    for ( var k in path ) {
                        var p = path[k];

                        if ( p ) {
                            window.load( p );
                        }
                    }
                } else {
                    // todo
                }
            }

            window.exit = function() {
                window.close();
            }

            window.dev = function() {
                window.frame.openDevTools();
            }

            window.cwd = function() {
                return window.process.cwd();
            }

            window.cd = function( path ) {
                if ( path !== undefined ) {
                    // change working directory
                    try {
                        window.process.chdir( path );

                        return window.cwd();
                    } catch ( ex ) {
                        onError( undefined, es );
                        return window.slate.IGNORE_RESULT;
                    }
                // if user did nothing, we do nothing
                } else {
                    return window.slate.IGNORE_RESULT;
                }
            }

            var resultsToString = function( results ) {
                var str = '';

                for ( var k in results ) {
                    var r = results[k];

                    if ( r.type ) {
                        str += '<span class="' + r.type + '">';
                    }

                    str += window.slate.util.htmlSafe( r.value );

                    if ( r.type ) {
                        str += '</span>';
                    }

                    str += "\n";
                }

                return window.slate.lib.formatter.rawHtml( str );
            }

            window.ls = function( path ) {
                if ( path === undefined ) {
                    path = ".";
                }

                if (
                        typeof path === 'string' ||
                        ( path instanceof String )
                ) {
                    // list directories
                    window.exports.fs.readdir( path, function(ex, files) {
                        var results = [];

                        if ( ex ) {
                            onError( undefined, ex );
                        } else {
                            safe( function() {
                                for ( var i = 0; i < files.length; i++ ) {
                                    var file = files[i];

                                    var stats       = window.exports.fs.statSync( path + '/' + file );
                                    var isDirectory = stats.isDirectory();
                                    var isFile      = stats.isFile();

                                    var type =
                                            stats.isDirectory() ? 'directory' :
                                            stats.isFile()      ? 'file'      :
                                                                  ''          ;

                                    results.push({
                                            type: type,
                                            value: file
                                    });
                                }

                                onSuccess( undefined, resultsToString(results) );
                            } );
                        }
                    } );

                    return window.slate.IGNORE_RESULT;
                } else {
                    var results = [];

                    for ( var k in path ) {
                        var isProto = path.hasOwnProperty( k );
                        var isFun   = slate.util.isFunction( path[k] );

                        var type =
                                isProto &&  isFun ? 'prototype-function' :
                                isProto && !isFun ? 'prototype-property' :
                               !isProto &&  isFun ? 'object-function'    :
                               !isProto && !isFun ? 'object-property'    :
                                                    ''                   ;

                        results.push({
                                type: type,
                                value: k
                        });
                    }

                    return resultsToString( results );
                }
            }
        }
    }
})(window)

