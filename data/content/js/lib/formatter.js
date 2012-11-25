"use strict";

(function(window) {
    var getHandler = function( handlers, r ) {
        for ( var i = 0; i < handlers.length; i++ ) {
            if ( r instanceof handlers[i].type ) {
                return handlers[i];
            }
        }
    }

    var newFormatResult = function( handlers ) {
        var formatResult = function( r ) {
            if ( r === window.slate.IGNORE_RESULT ) {
                return '';
            } else if ( r === undefined ) {
                return "undefined"
            } else if ( r === null  ) {
                return "null"
            } else if ( r === true  ) {
                return "true"
            } else if ( r === false ) {
                return "false"
            } else if (                           (r instanceof Boolean) ) {
                return '"' + r + '"'
            } else if ( typeof r === 'string'  || (r instanceof String ) ) {
                return '"' + r + '"'
            } else if ( typeof r === 'number'  || (r instanceof Number ) ) {
                return ''  + r
            } else if ( typeof r === 'object' ) {
                var handler = getHandler( handlers, r );

                if ( handler ) {
                    return handler.fun( r, formatResult );
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
            if ( r === window.slate.IGNORE_RESULT ) {
                return '';
            } else {
                var handler = getHandler(handlers, r);
                if ( handler ) {
                    if ( handler.pre ) {
                        handler.pre( r );
                    }

                    return handler.fun( r, formatResult );
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

        successError(
                window.slate.util.htmlSafe( cmd ),
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
        newOnSuccess: function(handlers, display) {
            return function(cmd, html) {
                onSuccessError( cmd, html, display, newFormatResult(handlers), onSuccess );
            }
        },

        newOnError: function(handlers, display) {
            return function(cmd, html) {
                onSuccessError( cmd, html, display, newFormatResult(handlers), onError );
            }
        }
    };
})(window);
