"use strict";

(function(window) {
    var slate = window.slate = window.slate || {};

    slate.commands = {
        bindCommands : function( clear, onDisplay, loaders, isDev ) {
            var commands = {};

            var safe = function( callback ) {
                try {
                    callback();
                } catch ( ex ) {
                    onDisplay( undefined, ex );
                }
            }

            commands.sleep = function( timeout ) {
                var i;
                if ( slate.util.isNumeric(timeout) ) {
                    timeout = parseInt( timeout );
                    i = 1;
                } else {
                    timeout = 1000;
                    i = 0;
                }

                for ( ; i < arguments.length; i++ ) {
                    var f = arguments[i];

                    if ( slate.util.isFunction(f) ) {
                        setTimeout( f, timeout );
                    }
                }

                return slate.IGNORE_RESULT;
            },

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

            var newColorHtml = function( colors ) {
                if (
                        colors[0] < 0 || colors[0] > 255 ||
                        colors[1] < 0 || colors[1] > 255 ||
                        colors[2] < 0 || colors[2] > 255 ||
                        colors[3] < 0 || colors[3] > 1
                ) {
                    throw new Error('invalid color given');
                }

                var strColor = 'rgba( ' + colors.join(', ') + ')';

                return '<div class="slate-embed-color" style="background: ' + strColor + ';"></div>';
            }

            var colorHexToArray = function(hex) {
                if ( hex.replace( /(#?)[a-fA-F0-9]{3,}([a-fA-F0-9]{3,})?/, '') !== '' ) {
                    throw new Error( "invalid hex value given: " + hex );
                }
                if ( hex.charAt(0) === '#' ) {
                    hex = hex.substring( 1 );
                }

                var colors = [];
                if ( hex.length === 3 ) {
                    for ( var i = 0; i < 3; i++ ) {
                        var h = hex.charAt(i);
                        colors[i] = parseInt( '0x' + h + h );
                    }
                } else if ( hex.length === 6 ) {
                    for ( var i = 0; i < 6; i += 2 ) {
                        var h = hex.charAt(i) + hex.charAt(i+1);
                        colors[i/2] = parseInt( '0x' + h );
                    }
                } else {
                    throw new Error( "invalid hex value given: " + hex );
                }

                colors[3] = 1;

                return colors;
            }

            var colorInternal = function( col ) {
                if ( col !== undefined && arguments.length > 0 ) {
                    if (
                            arguments.length === 4 &&
                            slate.util.isNumeric(arguments[0]) &&
                            slate.util.isNumberStr(arguments[1]) &&
                            slate.util.isNumberStr(arguments[2]) &&
                            slate.util.isNumberStr(arguments[3])
                    ) {
                        return newColorHtml([ arguments[0], arguments[1], arguments[2], arguments[3] ]);
                    } else if (
                            arguments.length === 3 &&
                            slate.util.isNumberStr(arguments[0]) &&
                            slate.util.isNumberStr(arguments[1]) &&
                            slate.util.isNumberStr(arguments[2])
                    ) {
                        return newColorHtml([ arguments[0], arguments[1], arguments[2], 1 ]);
                    } else if ( arguments.length > 1 ) {
                        var str = '';

                        for ( var i = 0; i < arguments.length; i++ ) {
                            str += colorInternal( arguments[i] );
                        }

                        return str;
                    } else if ( slate.util.isArrayArguments(col) ) {
                        return colorInternal.apply( null, col );
                    } else if ( slate.util.isString(col) ) {
                        return newColorHtml( colorHexToArray(col) );
                    } else {
                        throw new Error("unknown color item given");
                    }
                } else {
                    return '';
                }
            }

            commands.color = function( col ) {
                var r = '';
                if ( col !== undefined && arguments.length > 0 ) {
                    r = colorInternal.apply( null, arguments );
                }

                if ( r !== '' ) {
                    setTimeout( function() {
                        onDisplay( undefined, window.slate.lib.formatter.rawHtml(r) );
                    }, 1 );
                }

                return window.slate.IGNORE_RESULT;
            }

            commands.echo = function() {
                for ( var i = 0; i < arguments.length; i++ ) {
                    setTimeout( function() {
                        onDisplay( undefined, arguments[i] );
                    }, 1 );
                }

                return window.slate.IGNORE_RESULT;
            }

            var read = function( path, callback ) {
                window.exports.fs.readFile( path, function(err, data) {
                    if ( err ) {
                        onDisplay( undefined, new Error('file not found ' + err.path) );
                    } else {
                        try {
                            onDisplay( undefined, slate.lib.formatter.rawHtml( callback(data) ) );
                        } catch ( ex ) {
                            onDisplay( undefined, ex );
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
                                    onDisplay( undefined, ex );
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
                return slate.util.absoluteUrl( '.' );
            }

            commands.cd = function( path ) {
                if ( path !== undefined ) {
                    // change working directory
                    try {
                        window.process.chdir( path );

                        return commands.cwd();
                    } catch ( ex ) {
                        onDisplay( undefined, es );
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
                if ( arguments.length === 0 ) {
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
                            onDisplay( undefined, ex );
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

                                onDisplay( undefined, resultsToString(results) );
                            } );
                        }
                    } );

                    return window.slate.IGNORE_RESULT;
                } else if ( path ) {
                    var results = [];

                    for ( var k in path ) {
                        var isProto = path.hasOwnProperty( k );
                        var isFun   = slate.util.isFunction( path[k] );

                        var type =
                                isProto &&  isFun ? 'slate-prototype-function' :
                                isProto && !isFun ? 'slate-prototype-property' :
                               !isProto &&  isFun ? 'slate-object-function'    :
                               !isProto && !isFun ? 'slate-object-property'    :
                                                    ''                   ;

                        results.push({
                                type: type,
                                value: k
                        });
                    }

                    return resultsToString( results );
                } else {
                    return window.slate.IGNORE_RESULT;
                }
            }

            if ( isDev ) {
                commands.reloadCss = function() {
                    var styles = document.getElementsByTagName( 'link' );
                    var timestamp = '?v=' + Date.now();

                    for ( var i = 0; i < styles.length; i++ ) {
                        var style = styles[i];

                        if ( style.href ) {
                            style.href = style.href.replace(/\?.*$/, '') + timestamp;
                        }
                    }

                    return slate.IGNORE_RESULT;
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

