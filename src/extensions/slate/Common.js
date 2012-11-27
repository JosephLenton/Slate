"use strict";

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

    slate.addFormatHandler([
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
