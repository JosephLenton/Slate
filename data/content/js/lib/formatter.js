"use strict";

(function(window) {
    var getHandler = function( handlers, r ) {
        for ( var i = 0; i < handlers.length; i++ ) {
            if ( r instanceof handlers[i].type ) {
                return handlers[i];
            }
        }
    }

    /**
     * A marker type, which allows you to wrap a string,
     * and this is then dumped directly to the display.
     * 
     * So no alterations are made to this content.
     */
    var RawHtml = function( html ) {
        this.html = html;
    }
    RawHtml.prototype.getHtml = function() {
        return this.html;
    }
    RawHtml.prototype.toString = function() {
        return Object.prototype.toString( this.html );
    }

    var span = function( klass, r ) {
        return '<span class="' + klass + '">' + r + '</span>';
    }

    var newFormatResult = function( handlers, isDev ) {
        var formatResult = function( r ) {
            // test for internal types
            if ( r instanceof RawHtml ) {
                return r.getHtml();
            } else if ( r === window.slate.IGNORE_RESULT ) {
                return '';

            // test for in-built display types
            } else if ( r === undefined ) {
                return span( 'slate-undefined', "undefined" );
            } else if ( r === null  ) {
                return span( 'slate-null', "null" );
            } else if ( r === true || r === false || (r instanceof Boolean) ) {
                return span( 'slate-boolean', r );
            } else if ( typeof r === 'string'  || (r instanceof String ) ) {
                return span( 'slate-string', '"' + window.slate.util.htmlSafe(r) + '"' )
            } else if ( typeof r === 'number'  || (r instanceof Number ) ) {
                return span( 'slate-number', r )
            } else if ( typeof r === 'object' ) {
                var handler = getHandler( handlers, r );

                if ( handler ) {
                    return handler.fun( r, formatResult, isDev );
                }
            }

            /* Default Case */

            var name = null;

            for ( var k in window ) {
                if ( window.hasOwnProperty(k) && window[k] === r ) {
                    name = k;

                    break;
                }
            }

            var str = Object.prototype.toString.call( r );
            if ( name !== null ) {
                return name + ', ' + str;
            } else {
                return str;
            }
        }

        var formatResultOuter = function( r ) {
            if ( r instanceof RawHtml ) {
                return r.getHtml();
            } else if ( r === window.slate.IGNORE_RESULT ) {
                return '';
            } else {
                var handler = getHandler( handlers, r );
                if ( handler ) {
                    if ( handler.pre ) {
                        handler.pre( r, isDev );
                    }

                    return handler.fun( r, formatResult, isDev );
                } else {
                    /*
                     * Whlst the formatResult will try teh handler again,
                     * it will try everything else first.
                     * 
                     * So if the handler is hit a second time,
                     * it's an unknown object.
                     */
                    return formatResult( r );
                }
            }
        }

        return formatResultOuter;
    }

    var onSuccessError = function( cmd, r, onDisplay, formatResult, successError ) {
        if ( ! onDisplay ) throw new Error("falsy onDisplay function given");

        if ( cmd !== undefined ) {
            cmd = window.slate.util.htmlSafe( cmd );
        }

        successError(
                cmd,
                formatResult( r ),
                onDisplay
        );
    }

    var onSuccess = function( cmd, r, display ) {
        var html = '';

        if ( cmd !== undefined && cmd !== window.slate.IGNORE_RESULT ) {
                html +=
                        '<div class="slate-cmd">' +
                            cmd +
                        '</div>'
        }

        if ( r !== window.slate.IGNORE_RESULT ) {
                html +=
                        '<div class="slate-result">' +
                            r +
                        '</div>'
        }

        display( html );
    }

    var onError = function( cmd, ex, display ) {
        var html = '';

        if ( cmd !== undefined && cmd !== window.slate.IGNORE_RESULT ) {
                html +=
                        '<div class="slate-cmd slate-error">' +
                            cmd +
                        '</div>'
        }

        if ( ex ) {
                html +=
                        '<div class="slate-result slate-error">' +
                            ex +
                        '</div>'
        }

        display( html );
    }

    window.slate.lib.formatter = {
        newOnSuccess: function(handlers, display, isDev) {
            return function(cmd, html) {
                onSuccessError( cmd, html, display, newFormatResult(handlers, isDev), onSuccess );
            }
        },

        newOnError: function(handlers, display, isDev) {
            return function(cmd, html) {
                onSuccessError( cmd, html, display, newFormatResult(handlers, isDev), onError );
            }
        },

        rawHtml: function( html ) {
            return new RawHtml( html );
        }
    };
})(window);
