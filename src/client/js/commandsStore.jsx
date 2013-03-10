
===============================================================================

# Commands Store

Deals with storing the commands, and how they are bound to the JS runtime.

===============================================================================

    var slate = window.slate = window.slate || {};

===============================================================================

## Command Method Generators

These deal with generating methods, which are pretty similar.

===============================================================================

-------------------------------------------------------------------------------

### generateMultipleCommandsFun( methodName )

-------------------------------------------------------------------------------

    var generateMultipleCommandsFun = function( methodName ) {
        return new Function( 'command', 'fun', [
            'if ( arguments.length === 1 ) {',
            '    if ( isObject(command) ) {',
            '        for ( var k in command ) {',
            '            if ( command.has(k) ) {',
            '                this.' + methodName + '( k, command[k] );',
            '            }',
            '        }',
            '    } else if ( isArray(command) ) {',
            '        for ( var i = 0; i < command.length; i++ ) {',
            '            this.' + methodName + '( command[i] );',
            '        }',
            '    } else {',
            '        logError( "unknown parameters" );',
            '    }',
            '} else {',
            '    if ( isArray(command) ) {',
            '        for ( var i = 0; i < command.length; i++ ) {',
            '            this.' + methodName + '( command[i], fun );',
            '        }',
            '    } else {',
            '        logError( "unknown parameters" );',
            '    }',
            '}'
        ].join("\n"))
    }

-------------------------------------------------------------------------------

### generateSingleCommandFun( funName )

-------------------------------------------------------------------------------

    var generateSingleCommandFun = function( funName ) {
        return new Function( 'command', 'fun', [
                'if ( arguments.length === 2 ) {',
                '    this.add( command, ' + funName + '(fun) )',
                '} else if ( arguments.length === 1 ) {',
                '    command.fun = newValuesFun( command.fun );',
                '    this.add( command );',
                '} else {',
                '    throw new Error( "Too many parameters given" );',
                '}'
        ].join( "\n" ));
    }

    var newValuesFun = function( fun ) {
        return function( arr, display, state ) {
            if ( isArray(arr) ) {
                var r;
                var iterated = false;

                for ( var i = 0; i < arr.length; i++ ) {
                    iterated = true;
                    var val = arr[i];

                    if ( val !== undefined ) {
                        r = fun( arr[i], display, state );
                    }
                }

                if ( ! iterated ) {
                    r = fun( undefined, display, state );
                }

                return r;
            } else {
                return fun( arr, display, state );
            }
        }
    };

    var newEachFun = function( fun ) {
        return function( arr, display, state ) {
            if ( isArray(arr) ) {
                var r;

                for ( var i = 0; i < arr.length; i++ ) {
                    r = fun( arr[i], display, state );
                }

                return r;
            } else {
                return fun( arr, display, state );
            }
        }
    }

    slate.commandsStore = {
        commands: [],
        seenCmds: {},

-------------------------------------------------------------------------------

## addValues

The same as 'addEach', however it differs in that
'undefined' values are filtered out of the array given.

You are also guaranteed that the method will be called
at least once.

This is either:

 - for each non-undefined value,
 - once with undefined passed in.

-------------------------------------------------------------------------------

        addValues: generateSingleCommandFun( newValuesFun ),

-------------------------------------------------------------------------------

## addMultipleValues

-------------------------------------------------------------------------------

        addMultipleValues: generateMultipleCommandsFun( 'addValues' ),

-------------------------------------------------------------------------------

## addEach

Acts the same as commands.add,
however this ensures that only one value
is ever processed at a time.

So if this is given an array of values,
then this will run them one by one.
If the function is given one value,
then it is processed as normal.

-------------------------------------------------------------------------------

        addEach: generateSingleCommandFun( newEachFun ),
        
-------------------------------------------------------------------------------

## addMultipleEach

-------------------------------------------------------------------------------

        addMultipleEach: generateMultipleCommandsFun( 'addEach' ),

-------------------------------------------------------------------------------

## add

Adds a new command to be executed.

Example Usage:

```
     commands.add({
         help: function( r, onDisplay ) {
             // todo
         },
         sleep: function( r, onDisplay ) {
             // todo
         },
         load: function( r, onDisplay ) {
             // todo
         }
     });

```
     commands.add( 'help', function(r, onDisplay) {
         // todo
     });

```
     commands.add( ['man', 'help'], function(r, onDisplay) {
         // todo
     });

-------------------------------------------------------------------------------

        add: function( command, fun ) {
            if ( arguments.length === 1 ) {
                this.addCmdObject( command );
            } else if ( arguments.length === 2 ) {
                if ( isString(command) && isObject(fun) ) {
                    this.addCmdObject(fun);
                } else {
                    assertString( command, "Name must be a string" );
                    assertFunction( fun, "Command function is not a function" );

                    this.addCmdObject({ name: command, fun: fun });
                }
            } else {
                throw new Error( "Too many parameters given" );
            }
        },

        addCommands: generateMultipleCommandsFun( 'add' ),

        addCmdObject: function( cmd ) {
            assertObject( cmd );
            assertString( cmd.name, "command is missing 'name' property, for " + cmd.name, cmd );
            assertFunction( cmd.fun, "command is missing 'fun' property, it's function, for " + cmd.name, cmd );

            assertNot( this.seenCmds.has(cmd.name), "command name has been seen already, " + cmd.name, cmd );
            this.seenCmds[cmd.name] = true;
            
            this.commands.push( cmd );
        },

        listCommands : function() {
            var commandsArr = [];
            var cs = this.commands;

            for ( var i = 0; i < cs.length; i++ ) {
                commandsArr[i] = cs[i];
            }

            return commandsArr;
        },

        remove: function() {
            this.removeAll( arguments );
        },

        removeAll: function( args ) {
            for ( var i = 0; i < args.length; i++ ) {
                var arg = args[i];

                if ( arg instanceof Array ) {
                    this.remove.apply( this, arg );
                } else {
                    for ( var j = 0; j < this.commands.length; j++ ) {
                        if ( this.commands[j].name === arg ) {
                            this.commands.splice( j, 1 );

                            break;
                        }
                    }
                }
            }
        },

        bindCommands : function( clear, display, loaders, fileSystem, isDev ) {
            var commands = this.commands;
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
                        if ( isFunction(arguments[i]) ) {
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

                    onDisplay: onDisplayFun,
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
                    },

                    commands: commands
            }

            var onDisplay = (function(onDisplay) {
                return function() {
                    var args = arguments;

                    setTimeout( function() {
                        onDisplay.apply( null, args );
                    }, 1 );
                }
            })(onDisplay)

            for ( var i = 0; i < commands.length; i++ ) {
                var cmd = commands[i];

                window[ cmd.name ] = wrapCommand( cmd.fun, onDisplayFun )
            }
        }
    }

