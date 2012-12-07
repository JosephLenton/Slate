"use strict";

/**
 * Slate Script
 *
 * This is a simple shell language, designed for slate.
 *
 * Examples
 *
 *  grep blah index.html | format
 *
 *  grep { ls *.txt | map { @ ~= /^\d+/ } | find { @ > 10 } } #{ @fileName }.txt
 */
(function() {
    var statements = null;

    /**
     * Returns the parser to use for parsing slate script.
     *
     * This is wrapped in a function, so it can be generated
     * in a lazy way.
     *
     * @return A Parse.js ParserRule, for use to parse Slate Script.
     */
    var getParser = function() {
        if ( statements === null ) {
            var TAB = 9, // \t
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

                UPPER_A = 65,
                UPPER_Z = 90,

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

            var terminals = {
                command: parse.terminal.IDENTIFIER,

                op: {
                        dot         : '.',
                        comma       : ',',
                        pipe        : '|',

                        leftParen   : '(',
                        rightParen  : ')',

                        leftSquare  : '[',
                        rightSquare : ']'
                },

                variable: function( src, i, code, len ) {
                    if ( code === AT ) {
                        do {
                            code = src.charCodeAt( ++i );
                        } while (
                                code >= LOWER_A && code <= LOWER_Z  ||
                                code >= UPPER_A && code <= UPPER_Z  ||
                                code >= ZERO    && code <= NINE     ||
                                code === UNDERSCORE                 ||
                                code === DOLLAR
                        )

                        return i;
                    }
                },

                literals: {
                        'true'      : "true",
                        'false'     : "false",
                        'null'      : "null",
                        'undefined' : "undefined",

                        number      : parse.terminal.NUMBER,
                        string      : parse.terminal.STRING,

                        /**
                         * Matches identifiers, until a comma or pipe is reached.
                         * That is unless they are escaped.
                         */
                        altString: function( src, i, code, len ) {
                            var start = i,
                                isEscaping = false;

                            while (
                                    i < len && ( (
                                            code !== BAR        &&
                                            code !== COMMA      &&
                                            code !== SPACE      &&
                                            code !== SLASH_N
                                    ) || isEscaping )
                            ) {
                                if ( isEscaping ) {
                                    isEscaping = false;
                                } else if ( code === BACKSLASH ) {
                                    isEscaping = true;
                                }

                                code = src.charCodeAt( ++i );
                            }

                            return i;
                        }
                }
            }

            statements = parse.rule();
        }

        return statements;
    }

    /**
     * Turns all unquoted strings into regular strings.
     *
     * @param src The source code to process.
     * @return A safer version of the source code.
     */
    var preProcess = function( src, callback ) {
        var newSrc = src;

        for (
                var i = 0,
                    len = src.length;
                i < len;
                i++
        ) {
            // todo
        }

        return newSrc;
    }

    var parseCode = function( src, callback ) {
        // todo
    }

    /**
     * Performs verification on the AST generated,
     * and maybe changes stuff.
     */
    var verifyAST = function( ast, callback ) {
        // todo
    }

    /**
     * Turns the AST into JavaScript.
     */
    var compileAST = function( ast, callback ) {
        // todo
    }

    window.slateScript = {
            compile: function( src, callback, onError ) {
                preProcess( src, function(output) {
                    parseCode( src, function( result, errors ) {
                        if ( errors ) {
                            onError( errors );
                        } else {
                            verifyAST( result, function( ast, errors ) {
                                if ( errors ) {
                                    onError( errors );
                                } else {
                                    compileAST( ast, callback );
                                }
                            } );
                        }
                    } );
                } )
            }
    }
})();
