"use strict";

(function(window) {
    var slate = window.slate = window.slate || {};

    slate.commands = {
        bindCommands : function( clear, onDisplayFun, loaders, isDev ) {
            var onDisplay = function( v ) {
                setTimeout( function() {
                    onDisplayFun( undefined, v );
                }, 1 );
            }

            var commands = {};

            var safe = function( callback ) {
                try {
                    callback();
                } catch ( ex ) {
                    onDisplay( ex );
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
                    onDisplay( window.slate.lib.formatter.rawHtml(r) );
                }

                return window.slate.IGNORE_RESULT;
            }

            commands.echo = function() {
                for ( var i = 0; i < arguments.length; i++ ) {
                    onDisplay( arguments[i] );
                }

                return window.slate.IGNORE_RESULT;
            }

            var read = function( path, callback ) {
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
                                onDisplay(
                                        undefined,
                                        slate.lib.formatter.rawHtml(
                                                generateTextHtml( data )
                                        )
                                ); 
                            }
                        }
                    } );
                } else {
                    slate.util.ajaxGet( path, function(err, data, mime) {
                        if ( err ) {
                            onDisplay( new Error('file not found ' + err.path) );
                        } else {
                            try {
                                onDisplay( callback(data) );
                            } catch ( ex ) {
                                onDisplay( ex );
                            }
                        }
                    } )
                }
            }

            var generateTextHtml = function(data) {
                return '<pre class="slate-textfile">' +
                            slate.util.htmlSafe( data ) +
                        '</pre>'
            }

            var newReader = function(path) {
                return function( callback ) {
                    read( path, callback );
                }
            }

            var tryLoader = function( path, data, mime, onDisplay ) {
                var loader = loaders[ mime ];

                if ( loader ) {
                    try {
                        var loaderResult = loader(
                                path,
                                data ?
                                        function(path, callback) { callback(data); } :
                                        read
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

                read( path, function(data, mime) {
                    return generateTextHtml( data ); 
                } );
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
                    } else if ( slate.util.isString(path) ) {
                        if ( path.search(/^http(s?):\/\//) !== -1 ) {
                            return applyLoader( path, undefined, onDisplay );
                        } else {
                            if ( path.search(/^file:\/\//) !== -1 ) {
                                path = slate.util.absoluteUrl( path );
                            }

                            var lastDot   = path.lastIndexOf( '.' );
                            var extension = path.substring( lastDot+1 );

                            return applyLoader( path, extension, onDisplay );
                        }
                    }
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
                        onDisplay( es );
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

            commands.ls = function() {
                var callback = onDisplay;

                var end;
                if ( slate.util.isFunction(arguments.length[ arguments.length-1 ]) ) {
                    callback = arguments[ arguments.length-1 ];
                    end = arguments.length-1;
                } else {
                    end = arguments.length;
                }

                if (
                        arguments.length === 0 ||
                        ( arguments.length === 1 && callback !== onDisplay )
                ) {
                    var r = lsInner( '.', callback );

                    if ( r ) {
                        callback( r );
                    }
                } else {
                    for ( var i = 0; i < end; i++ ) {
                        var r = lsInner( arguments[i], callback );

                        if ( r !== undefined ) {
                            callback( r );
                        }
                    }
                }

                return undefined;
            }

            var lsInner = function( item, callback ) {
                if (
                        typeof item === 'string' ||
                        ( item instanceof String )
                ) {
                    // list directories
                    new slate.obj.FileSystem().list( item, callback );
                } else if ( item ) {
                    for ( var k in item ) {
                        callback( new slate.obj.Property(item, k) );
                    }
                }
            }

            /*
             * TODO layout the structure of the item in a table or something.
             */
            commands.describe = function( item ) {
                if ( item ) {
                    for ( var k in obj ) {
                        var isProto = item.hasOwnProperty( k );
                        var isFun   = slate.util.isFunction( item[k] );

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
                    return undefined;
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

                commands.log = function() {
                    for ( var i = 0; i < arguments.length; i++ ) {
                        console.log( arguments[i] );
                    }
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

