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

        UPPER_A = 65,
        UPPER_Z = 90,

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

    /*
     * Yes I know, this is not a full identifier check,
     * but it's good enough bearing in mind the alternative
     * is to spend hours working this out, and I just don't
     * have time.
     *
     * If the character is outside of ASCII, then it's
     * probably a valid identifier, or invalid syntax,
     * and so would be caught already.
     */
    var isIdentifierLetter = function(c) {
        return ( LOWER_A <= c && c <= LOWER_Z ) ||
               ( UPPER_A <= c && c <= UPPER_Z ) ||
               ( ZERO    <= c && c <= NINE    ) ||
               ( c === UNDERSCORE             ) ||
               ( c > 126 )
    }

    /**
     * This adds on to the standard 'compileJS', with some alterations
     * specific for when JS is run on the command line.
     *
     * @param src The source code to compile.
     * @param callback A callback which will take the result, when it has been compiled, or failed to compile.
     */
    var compileInlineJS = function(src, callback) {
        src = src.replace( /^\(function\(\)\ {([ \t\n]*)/, '' ).
                replace( /((;)?[ \t\n]*)\}\)\.call\(this\);[ \n\t]*$/g, '' );

        compileJS( src, callback );
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
    var compileJS = function(src, callback) {
        var err = validateJS( src );

        if ( err ) {
            callback( err );
        } else {
            compileJSInner( src, callback );
        }
    }

    /**
     * Validates the JS given, and returns an Error object if
     * it is invalid.
     *
     * @param js The JavaScript to validate.
     * @param fileName Optional, the name of the file that this came from.
     */
    var validateJS = function( js, fileName ) {
        /*
         * Throws an exception if the source code is incorrect,
         * so translate it into a regular SyntaxError.
         */
        try {
            esprima.parse( js );
        } catch ( err ) {
            var message = fileName ?
                    fileName + ' ' + err.message :
                    err.message ;

            return new SyntaxError( message, fileName || '', err.lineNumber );
        }
    }

    var compileJSInner = function( src, callback ) {
        var trimSrc = src.trim();

        // if the cmd is a global function, just call it
        // i.e. 'cwd' or 'ls'
        if (
              ! KEYWORDS.hasOwnProperty(trimSrc) &&
                trimSrc.search( /^[a-zA-Z_$][a-zA-Z_$0-9]*$/, '' ) !== -1
        ) {
            var f = window[ trimSrc ];

            if (
                    typeof f === 'function' ||
                    (f instanceof Function)
            ) {
                src += '()'
            }
        } else {
            var inSingleComment = false;
            var inMultiComment  = false;
            var inDoubleString  = false;
            var inSingleString  = false;

            var funInfo = [];
            var funInfoI = 0;
            var funBraceCount = 0;

            var appends = [];

            var PRE_FUN_WRAP   = 1,
                POST_FUN_WRAP  = 2,
                PRE_FUN_NAMED  = 3,
                POST_FUN_NAMED = 4;

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
                        
                    /*
                     * Track when we enter a brace,
                     * so we can account for them when looking
                     * for a functions closing brace.
                     *
                     * For example to deal with ...
                     *
                     *     function() {
                     *         while ( true ) {
                     *             // stuff here
                     *         }
                     *     }
                     *
                     */
                    } else if (c === LEFT_BRACE) {
                        if ( funBraceCount !== 0 ) {
                            funBraceCount++;
                        }
                    // look for the end of a defined function
                    } else if (c === RIGHT_BRACE) {
                        if ( funBraceCount !== 0 ) {
                            funBraceCount--;

                            // end of function
                            if ( funBraceCount === 0 ) {
                                appends.push({
                                        index: i,
                                        type : POST_FUN_WRAP
                                })

                                /*
                                 * Check if we are still inside a different function.
                                 */
                                if ( funInfoI !== 0 ) {
                                    funBraceCount   = funInfo[ --funInfoI ];
                                }
                            }
                        }

                    // look for '\bfunction\b'
                    } else if (
                            c === LOWER_F &&
                            src.charCodeAt(i+1) === LOWER_U &&
                            src.charCodeAt(i+2) === LOWER_N &&
                            src.charCodeAt(i+3) === LOWER_C &&
                            src.charCodeAt(i+4) === LOWER_T &&
                            src.charCodeAt(i+5) === LOWER_I &&
                            src.charCodeAt(i+6) === LOWER_O &&
                            src.charCodeAt(i+7) === LOWER_N &&

                            // ensure it is not a part of a larger identifier,
                            // i.e. _function or function9
                            ! isIdentifierLetter(src.charCodeAt(i-1)) &&
                            ! isIdentifierLetter(src.charCodeAt(i+8))
                    ) {
                        var position = i;
                        var isNamedFunction   = false,
                            hasHitParenthesis = false;

                        /*
                         * Skip past 'function', 
                         * and 1 more character to get to the character after.
                         *
                         * Then look for an identifier, such as ...
                         *
                         *     function foo
                         *
                         * and the opening brace.
                         */
                        i += 7+1;
                        while ( i < len && src.charCodeAt(i) !== LEFT_BRACE ) {
                            if ( !hasHitParenthesis && src.charCodeAt(i) === LEFT_PAREN ) {
                                hasHitParenthesis = true;
                            } else if (
                                    ! hasHitParenthesis &&
                                    ! isNamedFunction &&
                                      isIdentifierLetter(src.charCodeAt(i))
                            ) {
                                isNamedFunction = true;
                            }

                            i++;
                        }

                        if ( isNamedFunction ) {
                            appends.push({
                                    index: position,
                                    type : PRE_FUN_NAMED
                            })
                            appends.push({
                                    index: i,
                                    type : POST_FUN_NAMED
                            })

                            if ( funBraceCount !== 0 ) {
                                funBraceCount++;
                            }
                        } else {
                            if ( funBraceCount !== 0 ) {
                                funInfo[ funInfoI++ ] = funBraceCount;
                            }

                            appends.push({
                                    index: position,
                                    type : PRE_FUN_WRAP
                            })

                            funBraceCount = 1;
                        }
                    }
                }
            }

            if ( inMultiComment ) {
                throw new SyntaxError("comment is never closed");
            } else if ( inSingleString || inDoubleString ) {
                throw new SyntaxError("string is never closed");
            }

            if ( appends.length > 0 ) {
                var offset = 0;

                for ( var i = 0; i < appends.length; i++ ) {
                    var append = appends[i];

                    var type  = append.type;
                    var index = append.index + offset;

                    var str = '';

                    if ( type === PRE_FUN_WRAP ) {
                        str = '__wrap(';
                        src = src.substring( 0, index ) + str + src.substring( index );
                    } else if ( type === POST_FUN_WRAP ) {
                        str = ')';
                        src = src.substring( 0, index+1 ) + str + src.substring( index+1 );
                    } else if ( type === PRE_FUN_NAMED ) {
                        str = "var __envNum = slate.executor.envNum;";
                        src = src.substring( 0, index ) + str + src.substring( index );
                    } else if ( type === POST_FUN_NAMED ) {
                        str = "if ( __envNum !== 0 ) { slate.executor.setEnvironmentNum(__envNum); };";
                        src = src.substring( 0, index+1 ) + str + src.substring( index+1 );
                    }

                    offset += str.length;
                }
            }
        }

        callback( null, src );
    }

    var compileCode = function( languages, type, cmd, callback ) {
        var lang = languages.hasOwnProperty(type) ?
                languages[type] :
                null ;

        if ( lang ) {
            try {
                assertFun( lang, "language callback for '" + type + "' is not a function" );

                lang( cmd, function(js) {
                    if ( js instanceof Error ) {
                        callback( js );
                    } else if ( js ) {
                        compileInlineJS( js, callback );
                    } else {
                        callback( new Error("Failed to compile in " + type) );
                    }
                } );
            } catch ( ex ) {
                console.log( ex.message );
                callback( ex );
            }
        } else {
            callback( new Error("language not found '" + type + "'") );
        }
    }

    var executeInner = function( head, languages, type, cmd, post, onDisplay ) {
        if ( cmd && cmd.trim() !== '' ) {
            compileCode( languages, type, cmd, function(ex, js) {
                if ( ex ) {
                    onDisplay( cmd, ex );
                } else {
                    injectCommand( head, js, cmd, onDisplay );
                }

                if ( post ) {
                    setTimeout( post, 1 );
                }
            });
        }
    }

    var maxEnvironNum = 0;
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
        var envNum = slate.executor.envNum;

        return function() {
            slate.executor.setEnvironmentNum( envNum );

            f.apply( this, arguments );
        }
    }

    var executor = {
        envNum: 0,

        compileJS   : compileJS,
        validateJS  : validateJS,

        setEnvironmentNum: function(env) {
            if ( env !== 0 && environments[env] !== undefined ) {
                executor.envNum = env;
            }
        },

        getEnvironment: function() {
            var environment = environments[ executor.envNum ];

            if ( environment === undefined ) {
                return defaultEnrivonment;
            } else {
                return environment;
            }
        },

        newEnvironmentNum: function( onDisplay ) {
            var env = executor.envNum = maxEnvironNum++;

            environments[ env ] = onDisplay;

            return env;
        },

        deleteEnvironmentNum: function( num ) {
            delete environments[ num ];
        },

        newExecutor: function( head, languages, onDisplay, formatters ) {
            if ( ! onDisplay ) throw new Error( 'falsy onDisplay function given' );

            return function( type, cmd, post ) {
                executeInner( head, languages, type, cmd, post, function(cmd, r) {
                    if ( r ) {
                        var handler = slate.formatter.getHandler( formatters, r );

                        if ( handler && handler.format_returns === false ) {
                            r = new slate.formatter.ignoreHandler( r );
                        }
                    }

                    onDisplay( cmd, r, function(cmd, onDisplay) {
                        executeInner( head, languages, type, cmd, undefined, onDisplay );
                    })
                } )
            }
        }
    }

    window.slate.executor = executor;
})(window);
