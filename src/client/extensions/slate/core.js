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
                    if ( isNumeric(timeout) ) {
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

        return slate.formatter.rawHtml( str );
    }

    /*
     * TODO layout the structure of the item in a table or something.
     */
    slate.command( 'describe', function( item ) {
        if ( item ) {
            var results = [];

            for ( var k in item ) {
                var isProto = item.hasOwnProperty( k );
                var isFun   = isFunction( item[k] );

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
    } );

    slate.command( 'cls', function( p, display, state ) {
        state.clearDisplay();

        return display();
    } );

    slate.commandValues( 'help', function( params, display, state ) {
        var str = '';
        var commands = state.commands;

        for ( var k in commands ) {
            if ( params !== undefined ) {
                if ( isString(params) ) {
                    if ( k.indexOf(params) !== 0 ) {
                        continue;
                    }
                } else if ( params instanceof RegExp ) {
                    if ( k.match(params) === null ) {
                        continue;
                    }
                } else if ( params ) {
                    throw new Error("invalid parameter " + params);
                }
            }

            if ( commands.hasOwnProperty(k) ) {
                str += k + "\n";
            }
        }

        return slate.formatter.rawHtml( str );
    } );

    slate.command( 'first', function(arr, display) {
        if ( isArray(arr) ) {
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
        if ( isArray(arr) ) {
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

    slate.commandEach( 'filter', function(val, display, meta) {
        if ( display !== meta.onDisplay ) {
            if ( display(val) ) {
                meta.onDisplay( val );
            }
        } else {
            display( val );
        }
    } );
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
                                    slate.util.htmlSafe(k) + ' : ' +
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
            newTabbingHandler( Array , "[", "]", function(r, str) { return r.length + ', ' + str; } ),
    ]);
})();
