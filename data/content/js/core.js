"use strict";

// namespace used by libraries
(function() {
    var slate = window.slate = window.slate || {};

    /*
     * Represents 'do not display this value'.
     * It's needed because objects, null, and undefined
     * are all displayed.
     * 
     * So we just make a new object instead, and use ===
     * to differenciate it from others.
     */
    slate.IGNORE_RESULT = { ignore: true };

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

    var isDevFlag = false;
    slate.setDevelopment = function( isDev ) {
        isDevFlag = !! isDev;
    }
    slate.isDevelopment = function() {
        return isDevFlag;
    }

    var language = 'coffee';
    slate.setLanguage = function( lang ) {
        if ( lang !== 'js' && lang !== 'coffee' ) throw new Error( "unsupported language given, must be 'js' or 'coffee'" );

        language = lang;
    }
    slate.getLanguage = function() {
        return language;
    }

    slate.data = {
        loaders: (function() {
            var newTextLoader = function( callback ) {
                return function( path, read ) {
                    read( path, callback );
                }
            }

            var new64Loader = function( callback ) {
                return function( path, read ) {
                    read( path, function(data) {
                        return callback( new window.exports.Buffer(data).toString('base64') )
                    } )
                }
            }

            var newImageLoader = function( type ) {
                return new64Loader( function(data) {
                    return '<div class="slate-embed-img">' +
                                '<img src="data:image/' + type + ';base64,' +
                                    data +
                                '">' +
                            '</div>'
                } );
            }

            var loaders = {
                    'png'  : newImageLoader( 'png' ),
                    'jpg'  : newImageLoader( 'jpg' ),
                    'jpeg' : newImageLoader( 'jpg' ),
                    'gif'  : newImageLoader( 'gif' ),
                    'bmp'  : newImageLoader( 'bmp' ),

                    'html' : new64Loader( function(html) {
                        return '<iframe frameborder="no" class="slate-embed-html" src="data:text/html;base64,' +
                                        html +
                                '">';
                    } )
            }

            return loaders;
        })(),

        formatHandlers: [
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
                                    strFun.indexOf( ')' )+1
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

                                return slate.util.htmlSafe(
                                        stack.slice( 0, endIndex+1 ).join( "\n" )
                                )
                            } else {
                                return slate.util.htmlSafe( ex.stack );
                            }
                        } else {
                            return slate.util.htmlSafe( ex.message || ex.description );
                        }
                    }
                },
                newTabbingHandler( Array , "[", "]", function(r, str) { return r.length + ':' + str; } ),
                newTabbingHandler( Object, "{", "}" )
        ]
    };

    slate.lib = {
    };

    slate.util = {
    };
})();

