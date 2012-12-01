"use strict";

(function(window) {
    var slate = window.slate = window.slate || {};

    slate.commands = {
        commands: {},

        /**
         * Acts the same as commands.add,
         * however this ensures that only one value
         * is ever processed at a time.
         *
         * So if this is given an array of values,
         * then this will run them one by one.
         * If the function is given one value,
         * then it is processed as normal.
         */
        addEach: function( command, fun ) {
            if ( arguments.length === 2 ) {
                slate.add( command, function( arr, display ) {
                    if ( slate.util.isArray(arr) ) {
                        var r;

                        for ( var i = 0; i < arr.length; i++ ) {
                            r = fun( arr[i], display );
                        }

                        return r;
                    } else {
                        return fun( arr, display );
                    }
                } )
            } else if ( arguments.length === 1 ) {
                for ( var k in command ) {
                    if ( command.hasOwnProperty(k) ) {
                        slate.commands.addEach( k, command[k] );
                    }
                }
            } else {
                throw new Error( "Too many parameters given" );
            }
        },

        /**
         * Adds a new command to be executed.
         *
         * Example Usage:
         *
         *      commands.add({
         *          help: function( r, onDisplay ) {
         *              // todo
         *          },
         *          sleep: function( r, onDisplay ) {
         *              // todo
         *          },
         *          load: function( r, onDisplay ) {
         *              // todo
         *          }
         *      });
         *
         *      commands.add( 'help', function(r, onDisplay) {
         *          // todo
         *      });
         *
         *      commands.add( ['man', 'help'], function(r, onDisplay) {
         *          // todo
         *      });
         */
        add: function( command, fun ) {
            if ( arguments.length === 1 ) {
                for ( var k in command ) {
                    if ( command.hasOwnProperty(k) ) {
                        slate.commands.commands[k] = command[k];
                    }
                }
            } else if ( arguments.length === 2 ) {
                if ( slate.util.isArray(command) ) {
                    assert( arguments.length === 2, "Incorrect number of arguments given for commands.add" )

                    for ( var i = 0; i < command.length; i++ ) {
                        slate.commands.add( command[i], fun );
                    }
                } else {
                    assertString( command, "Name must be a string" );
                    assertFun( fun, "Command function is not a function" );

                    slate.commands.commands[command] = fun;
                }
            } else {
                throw new Error( "Too many parameters given" );
            }
        },

        bindCommands : function( clear, onDisplayFun, loaders, isDev ) {
            var commands = slate.commands.commands || {};
            console.log( commands );

            var onDisplay = function( v ) {
                setTimeout( function() {
                    onDisplayFun( undefined, v );
                }, 1 );
            }

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

            commands.cls = function() {
                clear()
            }
            commands.clear = commands.cls;

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

            commands.cwd = function() {
                return slate.util.absoluteUrl( '.' );
            }

            commands.cd = function( path ) {
                if ( path === undefined ) {
                    onDisplay( commands.cwd() );
                } else {
                    // change working directory
                    try {
                        window.process.chdir( path );

                        onDisplay( commands.cwd() );
                    } catch ( ex ) {
                        onDisplay( ex );
                    }
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
                    new slate.fs.FileSystem().list( item, callback );
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

