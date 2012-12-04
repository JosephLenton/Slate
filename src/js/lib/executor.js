"use strict";

/**
 * This runs the JS code, and then calls a corresponding success or error function,
 * depending on what the result is.
 */
(function(window) {
    var SLATE_SCRIPT_ID = 'slate-script-js';

    /**
     * ASCII codes for characters.
     *
     * @type {number}
     * @const
     */
    var TAB     =  9, // \t
        SLASH_N = 10, // \n
        SLASH_R = 13, // \r

        SPACE = 32,
        EXCLAMATION = 33,
        DOUBLE_QUOTE = 34,
        HASH = 35,
        DOLLAR = 36,
        PERCENT = 37,
        AMPERSAND = 38,
        SINGLE_QUOTE = 39,
        LEFT_PAREN = 40,
        RIGHT_PAREN = 41,
        STAR = 42, // *
        PLUS = 43,
        COMMA = 44,
        MINUS = 45,
        FULL_STOP = 46,
        SLASH = 47,

        ZERO = 48,
        ONE = 49,
        TWO = 50,
        THREE = 51,
        FOUR = 52,
        FIVE = 53,
        SIX = 54,
        SEVEN = 55,
        EIGHT = 56,
        NINE = 57,

        COLON = 58,
        SEMI_COLON = 59,

        LESS_THAN = 60,
        EQUAL = 61,
        GREATER_THAN = 62,
        QUESTION_MARK = 63,
        AT = 64,

        LEFT_SQUARE = 91,
        BACKSLASH = 92,
        RIGHT_SQUARE = 93,
        CARET = 94,
        UNDERSCORE = 95,

        LOWER_A = 97,
        LOWER_B = 98,
        LOWER_C = 99,
        LOWER_D = 100,
        LOWER_E = 101,
        LOWER_F = 102,
        LOWER_G = 103,
        LOWER_H = 104,
        LOWER_I = 105,
        LOWER_J = 106,
        LOWER_K = 107,
        LOWER_L = 108,
        LOWER_M = 109,
        LOWER_N = 110,
        LOWER_O = 111,
        LOWER_P = 112,
        LOWER_Q = 113,
        LOWER_R = 114,
        LOWER_S = 115,
        LOWER_T = 116,
        LOWER_U = 117,
        LOWER_V = 118,
        LOWER_W = 119,
        LOWER_X = 120,
        LOWER_Y = 121,
        LOWER_Z = 122,

        LEFT_BRACE = 123,
        BAR = 124,
        RIGHT_BRACE = 125,
        TILDA = 126;

    /**
     * A mapping of keywords.
     * 
     * The presence of a keyword in this object,
     * makes it a keyword.
     * 
     * If it maps to 'true', then the keyword can return
     * a value. 'false' does not, such as 'if' or 'throw'.
     */
    var KEYWORDS = {
            'typeof'        : true,
            'new'           : true,
            'this'          : true,
            'function'      : true,
            'delete'        : true,

            'instanceof'    : false,
            'break'         : false,
            'do'            : false,
            'var'           : false,
            'case'          : false,
            'else'          : false,
            'return'        : false,
            'void'          : false,
            'catch'         : false,
            'finally'       : false,

            'continue'      : false,
            'for'           : false,
            'switch'        : false,
            'while'         : false,
            'with'          : false,
            'debugger'      : false,
            'throw'         : false,
            'default'       : false,
            'if'            : false,

            'try'           : false,
            'in'            : false
    }

    var increment = 1;

    var uniqueScriptId = function() {
        return SLATE_SCRIPT_ID + uniqueVar();
    }

    var uniqueVar = function() {
        return '__slate__' + (new Date().getTime()) + '__' + (increment++);
    }

    /*
     * I want the system to be fully asynchronous,
     * which means I cannot use global state.
     * 
     * However I have to pass the onDisplay into the script
     * (a text string), which is then executed. You cannot do
     * that without global state (as far as I know).
     * 
     * So instead I generate unique variables,
     * use the callbacks, and then clear them later.
     */
    var buildCommand = function( js, cmd, scriptId, onDisplay ) {
        var varDisplay = uniqueVar();

        window[varDisplay] = onDisplay;

        cmd = window.escape( cmd );

        var dumpResult = true,
            grabVar = '__slate_result';

        if ( js.search( /^[ \n\t]*;/ ) === -1 ) {
            var matches = js.match( /^[ \n\t]*[a-zA-Z_$][a-zA-Z0-9_$]*/ );

            if ( matches !== null ) {
                var match = matches[0].trim();

                if ( match === 'var' ) {
                    var parts = js.match( /^[ \n\t]*var[ \n\t]+[a-zA-Z_$][a-zA-Z_0-9$]*/ );

                    if ( parts && parts.length > 0 ) {
                        var varName = parts[0].
                                replace(/^[ \n\t]*/, '').
                                replace(/[ \n\t]+/, ' ').
                                split( ' ' )[1];

                        grabVar = varName;
                    } else {
                        dumpResult = false;
                    }
                } else if ( KEYWORDS.hasOwnProperty( match ) ) {
                    dumpResult = KEYWORDS[ match ];

                    if ( dumpResult ) {
                        js = '    var __slate_result = ' + js + "\n"
                    }
                } else {
                    js = '    var __slate_result = ' + js + "\n"
                }
            } else {
                js = '    var __slate_result = ' + js + "\n"
            }
        } else {
            dumpResult = false;
        }

        if ( dumpResult ) {
            js +=   "\n" +
                    '    window["' + varDisplay + '"]( window.unescape("' + cmd + '"), ' + grabVar + ' )';
        } else {
            js +=   "\n" +
                    '    window["' + varDisplay + '"]( window.unescape("' + cmd + '"), window.slate.IGNORE_RESULT )';
        }

        return [
                "var __slate_result = undefined",
                "try {",
                    js,
                '} catch ( ex ) {',
                '    window["' + varDisplay + '"]( window.unescape("' + cmd + '"), ex )',
                '}',
                '',
                'delete window["' + varDisplay + '"];',
                '',
                'var script = document.getElementById("' + scriptId + '");',
                'if ( script ) { script.parentNode.removeChild( script ); }',
                '__slate_result = undefined;'
        ].join("\n")
    }

    var injectCommand = function( head, js, cmd, onDisplay ) {
        var scriptId = uniqueScriptId();
        var script = document.createElement('script');
        var html = buildCommand( js, cmd, scriptId, onDisplay );

        script.id = scriptId;
        script.innerHTML = html;

        try {
            head.appendChild( script );
        } catch ( ex ) {
            onDisplay( cmd, ex );

            script = document.getElementById( scriptId );
            if ( script ) {
                script.parentNode.removeChild( script );
            }
        }
    }

    /**
     * Searches through the given JS to ensure that comments
     * and strings are valid. If they are not, errors are thrown.
     */
    /*
     * This is essentially a non-determanistic state machine,
     * rolled out as a for-loop.
     * 
     * It iterates over all characters, and when a double quote
     * is hit, it enters the 'string' state. It will stay in the
     * string state, until a closing quote is found.
     * 
     * The other states, single-quote, multi-line comment,
     * and single-line comments, work in a similar fashion.
     */
    var errorIfUnsafeJS = function (src) {
        var inSingleComment = false;
        var inMultiComment  = false;
        var inDoubleString  = false;
        var inSingleString  = false;

        // note that i is incremented within the code as well as within the for.
        for (
                var i = 0, len = src.length;
                i < len;
                i++
        ) {
            var c = src.charCodeAt(i);

            // these are in order of precedence
            if ( inDoubleString ) {
                if (
                                      c === DOUBLE_QUOTE &&
                        src.charCodeAt(i-1) !== BACKSLASH
                ) {
                    inDoubleString = false;
                }
            } else if ( inSingleString ) {
                if (
                                      c === SINGLE_QUOTE &&
                        src.charCodeAt(i-1) !== BACKSLASH
                ) {
                    inSingleString = false;
                }
            } else if ( inSingleComment ) {
                if ( c === SLASH_N ) {
                    inSingleComment = false;
                }
            } else if ( inMultiComment ) {
                if (
                                       c === STAR &&
                        src.charCodeAt(i+1) === SLASH
                ) {
                    inMultiComment = false;

                    i++;
                }
            // enter state
            } else {
                /*
                 * Look to enter a new type of block,
                 * such as comments, strings, inlined-JS code.
                 */

                // multi-line comment
                if (
                        c === SLASH &&
                        src.charCodeAt(i+1) === STAR
                ) {
                    inMultiComment = true;

                    i++;
                } else if (
                        c === SLASH &&
                        src.charCodeAt(i+1) === SLASH
                ) {
                    inSingleComment = true;

                    i++;
                // look for strings
                } else if (c === DOUBLE_QUOTE) {
                    inDoubleString = true;
                } else if (c === SINGLE_QUOTE) {
                    inSingleString = true;
                }
            }
        }

        if ( inMultiComment ) {
            throw new Error("comment is never closed");
        }
    };

    /**
     * Compiles the given coffeescript code, to javascript.
     * The code is also transformed so it is run in the global scope.
     * 
     * @param cmd CoffeeScript code to compile.
     * @return js The JavaScript version of the code given.
     * @throws Error A parse error if the code does not compile into CoffeeScript.
     */
    var coffeeToJs = function( cmd ) {
        var js = CoffeeScript.compile( cmd );

        js = js.replace( /^\(function\(\)\ {([ \t\n]*)/, '' ).
                replace( /((;)?[ \t\n]*)\}\)\.call\(this\);[ \n\t]*$/g, '' );

        return js;
    }

    var compileCode = function( type, cmd ) {
        var js = cmd;

        // if the cmd is a global function, just call it
        // i.e. 'cwd' or 'ls'
        var trimJs = js.trim();

        if (
              ! KEYWORDS.hasOwnProperty(trimJs) &&
                trimJs.search( /^[a-zA-Z_$][a-zA-Z_$0-9]*$/, '' ) !== -1
        ) {
            var f = window[ trimJs ];

            if (
                    typeof f === 'function' ||
                    (f instanceof Function)
            ) {
                js += '()'
            }
        }

        if ( type === 'coffee' ) {
            js = coffeeToJs( js );
        }

        errorIfUnsafeJS( js );

        return js;
    }

    var executeInner = function( head, type, cmd, post, onDisplay ) {
        if ( cmd && cmd.trim() !== '' ) {
            try {
                var js = compileCode( type, cmd );

                injectCommand( head, js, cmd, onDisplay );
            } catch ( ex ) {
                onDisplay( cmd, ex );
            }

            if ( post ) {
                setTimeout( post, 1 );
            }
        }
    }

    var environNum = 0;
    var environments = [];
    var defaultEnvironment = function() { /* do nothing */ };

    /**
     * Wraps the given function,
     * so that the environment number is passed across into
     * the function returned.
     *
     * This is so if the function is used across an asynchronous call,
     * it will be copied across.
     */
    window.__wrap = function( f ) {
        var envNum = environNum;

        return function() {
            if ( envNum !== 0 ) {
                environNum = envNum;
            }

            f.apply( this, arguments );
        }
    }

    window.slate.lib.executor = {
        getEnvironment: function() {
            var environment = environments[ environNum ];

            if ( environment === undefined ) {
                return defaultEnrivonment;
            } else {
                return environment;
            }
        },

        newEnvironment: function( onDisplay ) {
            var env = environNum++;

            environments[ env ] = onDisplay;

            return env;
        },

        deleteEnvironment: function( num ) {
            delete environments[ num ];
        },

        newExecutor: function( head, onDisplay, formatters ) {
            if ( ! onDisplay ) throw new Error( 'falsy onDisplay function given' );

            return function( type, cmd, post ) {
                executeInner( head, type, cmd, post, function(cmd, r) {
                    if ( r ) {
                        var handler = slate.lib.formatter.getHandler( formatters, r );

                        if ( handler && handler.format_returns === false ) {
                            r = new slate.lib.formatter.ignoreHandler( r );
                        }
                    }

                    onDisplay( cmd, r, function(cmd, onDisplay) {
                        executeInner( head, type, cmd, undefined, onDisplay );
                    })
                } )
            }
        }
    }
})(window);
