"use strict";

// namespace used by libraries
(function() {
    var slate = window.slate = window.slate || {};

    /**
     * Where data is internall stored.
     * 
     * Essentially slate.core's variables.
     */
    slate.data = {
            loaders: {},
            languages: {},
            formatHandlers: []
    };

    /*
     * Slate API
     * 
     * The public API used to customize slate.
     */

    var isDevFlag = false;

    /**
     * Sets slate into development mode, must be done at startup.
     * 
     * @param isDev True to go into dev mode, false to not. Defaults to true.
     * @return This slate namespace, for method chaining.
     */
    slate.setDevelopment = function( isDev ) {
        if ( arguments.length === 0 ) {
            isDevFlag = true;
        } else {
            isDevFlag = !! isDev;
        }

        return slate;
    }

    slate.isDevelopment = function() {
        return isDevFlag;
    }

    slate.removeCSS = function() {
        var styles = document.getElementsByClassName( 'custom-slate-css' );

        for ( var i = 0; i < styles.length; i++ ) {
            var style = styles[i];

            style.parentNode.removeChild( style );
        }
    }

    /**
     * Registers a language with the system. This takes the
     * name of the language, and a callback used for compiling
     * code.
     *
     * The callback must take the form:
     *
     *      function( src, next )
     *
     * Where src is the source code given, and 'next' is a
     * callback to call into. For example:
     *
     *      function( src, next ) {
     *          var js = CoffeeScript.compile( src );
     *          next( js );
     *      }
     *
     * You may pass Error objects into 'next' if an error
     * occurres, or just throw them.
     *
     * @param The name of the language to register.
     * @param callback A compiler function for the language.
     */
    slate.language = function( name, callback ) {
        assertString( name, "name must be a string" );
        assertFunction( callback, "callbac must be a function" );

        slate.data.languages[ name ] = callback;

        return slate;
    }

    var generateStyles = function( name, props ) {
        assert( name, "No name provided" );

        var str = '';

        if ( arguments.length === 1 ) {
            if ( isString(name) ) {
                str = name;
            } else {
                for ( var k in props ) {
                    if ( props.hasOwnProperty(k) ) {
                        var rule = props[k];

                        str += k + " {\n";

                        for ( var k2 in rule ) {
                            if ( rule.hasOwnProperty(k) ) {
                                var val = rule[k2];
                                str += k2 + ': ' + val;

                                if ( isNumber(val) ) {
                                    str += 'px';
                                }

                                str += ";\n";
                            }
                        }

                        str += "}\n";
                    }
                }
            }
        } else if ( arguments.length === 2 ) {
            assert( props, "No properties provided" );

            if ( isString(name) ) {
                str = name + " {\n";

                for ( var k in props ) {
                    if ( props.hasOwnProperty(k) ) {
                        var val = props[k];

                        str += k + ': ' + val;

                        if ( isNumber(val) ) {
                            str += 'px';
                        }

                        str += ";\n";
                    }
                }

                str += "}\n";
            } else {
                throw new Error("I don't understand the CSS parameters given");
            }
        }

        return str;
    }

    /**
     * Example Usage
     *
     *  slate.css( '.embed-color', {
     *      width: 80,
     *      height: 80,
     *      float: 'left'
     *  } );
     *
     *  slate.css({
     *          embed_color: {
     *              width: 80,
     *              height: 80,
     *              float: 'left'
     *          }
     *  })
     *
     */
    slate.css = function( name, props ) {
        assert( arguments.length > 0, "No arguments provided" );

        var str = generateStyles( name, props );
        assert( str !== '', "Empty CSS rule given" );

        var style = document.createElement('style');
        style.className = 'custom-slate-css';
        style.innerHTML = str;

        document.head.appendChild( style );

        return slate;
    }

    var language = 'js';
    slate.setLanguage = function( lang ) {
        assert( slate.data.languages.hasOwnProperty(lang), "Language not found 'lang'" );

        language = lang;

        return slate;
    }
    slate.getLanguage = function() {
        return language;
    }

    /**
     * Allows you to set how a type is formatted.
     * 
     * You pass in a JS object, with properties attached to
     * describe how your object is formatted. This includes
     * the type of the object, and a function to call to perform
     * the formatting.
     * 
     * In regards to 'format_returns', it's so you can do things like ...
     * 
     *     load 'http://www.google.com'
     * 
     * Here a Page object is created, and sent to the display, but also
     * returned. That means it will get rendered *twice*. To avoid that,
     * you can set 'format_returns' to false, and values that get
     * returned from any scripts, are not formatted.
     * 
     * Properties:
     *  - type A function constructor, for the type to handle. i.e. Error.
     *  - fun The function to perform to convert the type to HTML. This may be called multiple times when displaying.
     * 
     *  - pre A function to call before 'fun', it is called once for every bout of displaying.
     *  - post A function to call after 'fun', it is called once for every bout of displaying.
     *  - format_returns Optional, and defaults to true. When set to false, items returned to the terminal are not formatted. Only those sent to the display are formatted.
     *
     * There is also a shorthand version, which is designed for the common case.
     * For this you pass in a type, and a function, and that's it.
     *
     *  slate.html( Error, function(err) {
     *      // return err html here
     *  } );
     */
    slate.html = function( handler ) {
        assert( handler, "null or no handler provided" );

        if ( arguments.length > 1 ) {
            if (
                    arguments.length === 2 &&
                    isFunction(arguments[1])
            ) {
                slate.html({
                    type: arguments[0],
                    fun : arguments[1]
                })
            } else {
                slate.html( arguments );
            }
        } else if ( isArrayArguments(handler) ) {
            for ( var i = 0; i < handler.length; i++ ) {
                slate.html( handler[i] );
            }
        } else {
            assert( handler.type, "missing 'type' on format handler" );
            assert( handler.fun , "missing 'fun' on format handler"  );

            if ( isArray(handler.type) ) {
                var arr = handler.type;

                assert( arr.length > 0, "No types supplied for format handler (it's an empty array)" );

                for ( var i = 0; i < arr.length; i++ ) {
                    assertFunction( arr[i], "type property given in 'type' array, is not a constructor" );
                }
            } else {
                assertFunction( handler.type, "'type' property given, is not a constructor" );
            }

            assertFunction( handler.fun, "'fun' property given, is not a function"  );

            slate.data.formatHandlers.push( handler );
        }

        return slate;
    }

    /**
     * Represents 'do not display this value'.
     * It's needed because objects, null, and undefined
     * are all displayed.
     * 
     * So we just make a new object instead, and use ===
     * to differenciate it from others.
     */
    slate.IGNORE_RESULT = { ignore: true };

    var commandsBuilder = function( methodName ) {
        return new Function( "a", "b", [
                "if ( arguments.length === 1 ) {",
                "    slate.commandsStore." + methodName + "( a );",
                "} else {",
                "    slate.commandsStore." + methodName + "( a, b );",
                "}",
                "",
                "return slate;"
        ].join("\n"));
    }

    slate.commandsEach  = commandsBuilder( 'addMultipleEach' );
    slate.commandEach   = commandsBuilder( 'addEach'         );
    slate.commandValues = commandsBuilder( 'addValues'       );
    slate.command       = commandsBuilder( 'add'             );
    slate.commands      = commandsBuilder( 'addCommands'     );

    /**
     * Example usage:
     *  slate.loader( 'png', function(path, read) { } );
     *  slate.loader( ['jpg', 'jpeg'], function(path, read) { } );
     */
    slate.loader = function( type, action ) {
        if ( isArray(type) && isFunction(action) ) {
            for ( var i = 0; i < type.length; i++ ) {
                slate.loader( type[i], action );
            } 
        } else {
            assertString( type, "invalid type given, must be a string" );
            assertFunction( action , "invalid action given, must be a function" );

            slate.data.loaders[ type ] = action;
        }

        return slate;
    }

    slate.obj = {
    };

    slate.util = {
    };
})();

