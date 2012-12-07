"use strict";

(function() {
    slate.command({
            exit: function(a, display) {
                window.close();
            },

            /**
             * Calls the display given,
             * if in dev mode.
             * Otherwise this does nothing.
             */
            ifDev: function(param, onDisplay, state) {
                if ( state.isDev ) {
                    return onDisplay( param );
                }
            },

            dev: function() {
                window.frame.openDevTools();
            },

            echo: function(a, display) {
                display( a );
            },

            ignore: function(a, display) {
                display();
            },

            sleep: function( timeout, display ) {
                if ( timeout ) {
                    if ( slate.util.isNumeric(timeout) ) {
                        timeout = parseInt( timeout );
                    } else {
                        throw new Error( "numeric timeout expected for sleep" );
                    }
                } else {
                    timeout = 1000;
                }

                setTimeout( display, timeout );
            }
    });

    slate.command( ['clear', 'cls'], function( p, display, state ) {
        state.clearDisplay();

        return display();
    } );

    slate.command( ['help', 'man'], function() {
        var str = '';

        for ( var k in commands ) {
            if ( commands.hasOwnProperty(k) ) {
                str += k + "\n";
            }
        }

        return slate.formatter.rawHtml( str );
    } );

    slate.command( 'first', function(arr, display) {
        if ( slate.util.isArray(arr) ) {
            if ( arr.length > 0 ) {
                var first = arr[0];

                display( first );
                return first;
            }
        } else {
            display( arr );
            return arr;
        }
    } );

    slate.command( 'last', function(arr, display) {
        if ( slate.util.isArray(arr) ) {
            if ( arr.length > 0 ) {
                var last = arr[arr.length-1];

                display( last );
                return last;
            }
        } else {
            display( arr );
            return arr;
        }
    });
})();

/**
 * HTML Output handlers.
 */
(function() {
    var TAB = "    ";

    var generateTab = function( indents ) {
        var str = '';
        for ( var i = 0; i < indents; i++ ) {
            str += TAB;
        }

        return str;
    }

    var indent = 0,
        dontIndent = false;
 
    var newTabbingHandler = function( type, pre, post, postFun ) {
        return {
            type    : type,

            pre: function() {
                indent = 0;
                dontIndent = false;
            },

            // { blah: {foo: 4, foobar: 93} } 
            fun: function(obj, format) {
                var str;
                
                if ( dontIndent || indent > 2 ) {
                    str = ' ...';
                } else {
                    var str = pre;
                    var localDontIndent = dontIndent;

                    if ( obj === window || obj === document ) {
                        localDontIndent = dontIndent = true;
                    }

                    indent++;
                    var indentStr = "\n" + generateTab( indent );
                    var addComma = false;

                    for ( var k in obj ) {
                        if ( obj.hasOwnProperty(k) ) {
                            if ( addComma ) {
                                str += ',';
                            } else {
                                addComma = true;
                            }

                            str += indentStr +
                                    slate.util.htmlSafe(k) + ': ' +
                                    format( obj[k] );
                        }
                    }

                    indent--;
                    dontIndent = localDontIndent;

                    if ( addComma ) {
                        str += "\n" + generateTab( indent ) + post;
                    } else {
                        str += ' ' + post;
                    }

                    if ( postFun ) {
                        str = postFun( obj, str );
                    }
                }
                
                return str;
            }
        }
    }

    slate.html([
            {
                type: Function,

                fun: function(f, format) {
                    var obj = null;
                    for ( var k in f ) {
                        if ( f.hasOwnProperty(k) ) {
                            if ( obj === null ) {
                                obj = {};
                            }

                            obj[k] = f[k];
                        }
                    }

                    var name = window.slate.util.identifyFunction( f );
                    var strFun = f.toString();
                    var args = '';

                    if ( strFun.indexOf('function') !== -1 ) {
                        var firstParen = strFun.indexOf( '(' );

                        args = strFun.substring(
                                firstParen,
                                strFun.indexOf( ')' ) + 1
                        );
                    }

                    var propStr;
                    if ( obj !== null ) {
                        indent++;
                        propStr = "\n" + format( obj );
                        indent--;
                    } else {
                        propStr = '';
                    }

                    return name + args + propStr;
                }
            },

            {
                type: Error,

                fun: function(ex, format, isDev) {
                    var str = '';

                    if ( ex.stack ) {
                        if ( ! isDev ) {
                            var stack = ex.stack.split( "\n" );
                            var endIndex = stack.length;

                            for ( var i = stack.length-1; i >= 0; i-- ) {
                                endIndex = i;

                                if ( stack[i].search( /http:\/\/appjs\// ) === -1 ) {
                                    break;
                                }
                            }

                            str = slate.util.htmlSafe(
                                    stack.slice( 0, endIndex+1 ).join( "\n" )
                            )
                        } else {
                            str = slate.util.htmlSafe( ex.stack );
                        }
                    } else {
                        str = slate.util.htmlSafe( ex.message || ex.description );
                    }

                    return '<span class="slate-error">' + str + '</span>';
                }
            },

            newTabbingHandler( Array , "[", "]", function(r, str) { return r.length + ':' + str; } ),
    ]);
})();
