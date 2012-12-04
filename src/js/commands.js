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
                slate.command( command, function( arr, display, state ) {
                    if ( slate.util.isArray(arr) ) {
                        var r;

                        for ( var i = 0; i < arr.length; i++ ) {
                            r = fun( arr[i], display, state );
                        }

                        return r;
                    } else {
                        return fun( arr, display, state );
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

        bindCommands : function( clear, display, loaders, fileSystem, isDev ) {
            var commands = slate.commands.commands || {};
            var onDisplayFun = function(r) {
                setTimeout( function() { display(r); }, 1 );
            }

            var wrapCommand = function(commandFun, onDisplay) {
                return function( args, callback ) {
                    var callback = null,
                        paramsLen = arguments.length;

                    /*
                     * Iterate from last argument,
                     * to all *but* the first parameter
                     * First parameter is never a callback!
                     */
                    for ( var i = arguments.length-1; i >= 0; i-- ) {
                        if ( slate.util.isFunction(arguments[i]) ) {
                            callback = arguments[i];
                            paramsLen = i;

                            break;
                        }
                    }

                    if ( callback === null ) {
                        callback = onDisplay;
                    }

                    var params = undefined;

                    if ( paramsLen === 1 ) {
                        params = arguments[0];
                    } else if ( paramsLen > 1 ) {
                        params = new Array( paramsLen );

                        for ( var i = 0; i < paramsLen; i++ ) {
                            params[i] = arguments[i];
                        }
                    }

                    if ( params instanceof Error ) {
                        onDisplayFun( params );
                    } else {
                        return commandFun( params, callback, state );
                    }
                }
            }

            var state = {
                    isDev: isDev,

                    fs   : fileSystem,

                    onDisplay: onDisplay,
                    clearDisplay: function() {
                        throw new Error("state.clear not yet implemented");
                        // todo, get the terminal context passed in,
                        // and clear it with this.
                    },

                    wrap: function( cmd, onDisplay ) {
                        if ( ! onDisplay ) {
                            onDisplay = state.onDisplay;
                        }

                        return wrapCommand( cmd, onDisplayFun );
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
                                                    ''                         ;

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

            var onDisplay = (function(onDisplay) {
                return function() {
                    var args = arguments;

                    setTimeout( function() {
                        onDisplay.apply( null, args );
                    }, 1 );
                }
            })(onDisplay)

            for ( var k in commands ) {
                if ( commands.hasOwnProperty(k) ) {
                    window[k] = wrapCommand( commands[k], onDisplayFun )
                }
            }
        }
    }
})(window)

