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

    var KEYWORDS = {
            'instanceof'    : true,
            'typeof'        : true,
            'break'         : true,
            'do'            : true,
            'new'           : true,
            'var'           : true,
            'case'          : true,
            'else'          : true,
            'return'        : true,
            'void'          : true,
            'catch'         : true,
            'finally'       : true,

            'continue'      : true,
            'for'           : true,
            'switch'        : true,
            'while'         : true,
            'this'          : true,
            'with'          : true,
            'debugger'      : true,
            'function'      : true,
            'throw'         : true,
            'default'       : true,
            'if'            : true,

            'try'           : true,
            'delete'        : true,
            'in'            : true
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
     * However I have to pass the onSuccess and onError into
     * a text string, which is then executed. You cannot do
     * that without global state (as far as I know).
     * 
     * So instead I generate unique variables,
     * use the callbacks, and then clear them later.
     */
    var buildCommand = function( js, cmd, scriptId, onSuccess, onError ) {
        var varSuccess = uniqueVar(),
            varError   = uniqueVar();

        window[varSuccess] = onSuccess;
        window[varError  ] = onError  ;

        cmd = window.escape( cmd );

        return [
                "try {",
                '    var __slate_result = ' + js  + "",
                '    window["' + varSuccess + '"]( window.unescape("' + cmd + '"), __slate_result )',
                '} catch ( ex ) {',
                '    window["' + varError   + '"]( window.unescape("' + cmd + '"), ex )',
                '}',
                '',
                'delete window["' + varSuccess + '"];',
                'delete window["' + varError   + '"];',
                '',
                'var script = document.getElementById("' + scriptId + '");',
                'if ( script ) { script.parentNode.removeChild( script ); }'
        ].join("\n")
    }

    var injectCommand = function( head, js, cmd, onSuccess, onError ) {
        var scriptId = uniqueScriptId();
        var script = document.createElement('script');
        var html = buildCommand( js, cmd, scriptId, onSuccess, onError );
        console.log( html );

        script.id = scriptId;
        script.innerHTML = html;

        try {
            head.appendChild( script );
        } catch ( ex ) {
            onError( cmd, ex );

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
        // if the cmd is a global function, just call it
        // i.e. 'cwd' or 'ls'
        var trimCmd = cmd.trim();
        if (
              ! KEYWORDS.hasOwnProperty(trimCmd) &&
                trimCmd.replace( /[a-zA-Z_$][a-zA-Z_$0-9]*/, '' ).length === 0
        ) {
            var f = window[cmd.trim()];

            if (
                    typeof f === 'function' ||
                    (f instanceof Function)
            ) {
                cmd += '()'
            }
        }

        var js = CoffeeScript.compile( cmd );

        js = js.replace( /^\(function\(\)\ {([ \t\n]*)/, '' ).
                replace( /((;)?[ \t\n]*)\}\)\.call\(this\);[ \n\t]*$/g, '' );

        errorIfUnsafeJS( js );

        return js;
    }

    var executeInner = function( head, cmd, post, onSuccess, onError ) {
        try {
            var js = coffeeToJs( cmd );

            injectCommand( head, js, cmd, onSuccess, onError );
        } catch ( ex ) {
            onError( cmd, ex );
        }

        if ( post ) {
            setTimeout( post, 1 );
        }
    }

    window.slate.lib.executor = {
        newExecutor: function( head, onSuccess, onError ) {
            if ( ! onSuccess ) throw new Error( 'falsy onSuccess function given' );
            if ( ! onError   ) throw new Error( 'falsy onError function given' );

            return function( cmd, post ) {
                executeInner( head, cmd, post, onSuccess, onError );
            }
        }
    }
})(window);
