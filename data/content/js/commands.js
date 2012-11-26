"use strict";

(function(window) {
    var slate = window.slate = window.slate || {};

    slate.commands = {
        bindCommands : function( clear, onSuccess, onError, loaders ) {
            var commands = {};

            var safe = function( callback ) {
                try {
                    callback();
                } catch ( ex ) {
                    onError( undefined, ex );
                }
            }

            commands.help = function() {
                var str = '';

                for ( var k in commands ) {
                    if ( commands.hasOwnProperty(k) ) {
                        str += k + "\n";
                    }
                }

                return slate.lib.formatter.rawHtml( str );
            }
            commands.man = commands.help;

            commands.cls = function() {
                clear()
            }
            commands.clear = commands.cls;

            var read = function( path, callback ) {
                window.exports.fs.readFile( path, function(err, data) {
                    if ( err ) {
                        onError( undefined, err );
                    } else {
                        try {
                            onSuccess( undefined, slate.lib.formatter.rawHtml( callback(data) ) );
                        } catch ( ex ) {
                            onError( undefined, ex );
                        }
                    }
                } );
            }

            var newReader = function(path) {
                return function( callback ) {
                    read( path, callback );
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
            commands.load = function( path ) {
                var str = '';

                for ( var i = 0; i < arguments.length; i++ ) {
                    var path = arguments[i];

                    // array
                    if ( slate.util.isArray(path) ) {
                        for ( var k in path ) {
                            var p = path[k];

                            if ( p ) {
                                commands.load( p );
                            }
                        }
                    } else {
                        var lastDot   = path.lastIndexOf('.');
                        var extension = path.substring( lastDot+1 );

                        var loader    = loaders[ extension ];
                        if ( loader ) {
                            try {
                                var loaderResult = loader( path, read );

                                if ( loaderResult ) {
                                    str += loaderResult + "\n";
                                }
                            } catch ( ex ) {
                                setTimeout( function() {
                                    onError( undefined, ex );
                                }, 1 );
                            }
                        } else {
                            read( path, function(data) {
                                return '<pre class="slate-textfile">' +
                                            slate.util.htmlSafe( data ) +
                                        '</pre>'
                            } );
                        }
                    }
                }

                if ( str === '' ) {
                    return window.slate.IGNORE_RESULT;
                } else {
                    return window.slate.lib.formatter.rawHtml( str );
                }
            }

            commands.exit = function() {
                window.close();
            }

            commands.dev = function() {
                window.frame.openDevTools();
            }

            commands.cwd = function() {
                return window.process.cwd();
            }

            commands.cd = function( path ) {
                if ( path !== undefined ) {
                    // change working directory
                    try {
                        window.process.chdir( path );

                        return commands.cwd();
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

            commands.ls = function( path ) {
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
                                    var isHidden    = file.charAt(0) === '.';
                                    
                                    var type =
                                             isHidden && stats.isDirectory() ? 'slate-hidden-directory' :
                                             isHidden && stats.isFile()      ? 'slate-hidden-file'      :
                                            !isHidden && stats.isDirectory() ? 'slate-directory' :
                                            !isHidden && stats.isFile()      ? 'slate-file'      :
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

            for ( var k in commands ) {
                if ( commands.hasOwnProperty(k) ) {
                    window[k] = commands[k];
                }
            }
        }
    }
})(window)

