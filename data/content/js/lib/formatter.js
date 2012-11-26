"use strict";

(function(window) {
    var ENTER_KEY = 13;

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
            var html = '';

            if ( r instanceof RawHtml ) {
                html = r.getHtml();
            } else if ( r === window.slate.IGNORE_RESULT ) {
                return r;
            } else {
                var handler = getHandler( handlers, r );

                if ( handler ) {
                    if ( handler.pre ) {
                        handler.pre( r, isDev );
                    }

                    html = handler.fun( r, formatResult, isDev );
                } else {
                    /*
                     * Whlst the formatResult will try teh handler again,
                     * it will try everything else first.
                     * 
                     * So if the handler is hit a second time,
                     * it's an unknown object.
                     */
                    html = formatResult( r );
                }
            }

            return '<div class="slate-result">' + html + '</div>';
        }

        return formatResultOuter;
    }

    var generateCommandHtml = function( cmd, isError, reRun ) {
        var input = document.createElement( 'div' );

        input.className = 'slate-cmd' +
                ( isError ? ' slate-error' : '' );
        input.innerHTML = window.slate.util.htmlSafe( cmd );
        input.setAttribute( 'contenteditable', true );
        input.setAttribute( 'wrap', 'off' );

        input.addEventListener( 'keypress', function(ev) {
            if ( ev.keyCode === ENTER_KEY ) {
                reRun();

                ev.stopPropagation();
                ev.preventDefault();
            }
        } );

        return input;
    }

    var onDisplay = function( cmd, r, reRun, formatResult, displayFun ) {
        var isError = ( r instanceof Error ),
            rHtml = formatResult( r );

        var replaceResult = null;

        if ( cmd !== undefined && cmd !== window.slate.IGNORE_RESULT ) {
            var reRunCommand = function() {
                reRun( cmdHtml.innerHTML, function(cmd, r) {
                    onDisplay( undefined, r, undefined,

                        formatResult,

                        function( html ) {
                            if ( replaceResult ) {
                                replaceResult( html );
                            }
                        }
                    )
                } )
            }

            var cmdHtml = generateCommandHtml( cmd, isError, reRunCommand );

            displayFun( cmdHtml, reRunCommand )
        }

        if ( rHtml !== window.slate.IGNORE_RESULT ) {
            replaceResult = displayFun( rHtml )
        }
    }

    window.slate.lib.formatter = {
        newDisplayFormat: function(handlers, displayFun, isDev) {
            handlers = newFormatResult( handlers, isDev );

            return function(cmd, r, reRun) {
                onDisplay( cmd, r, reRun, handlers, displayFun );
            }
        },

        rawHtml: function( html ) {
            return new RawHtml( html );
        }
    };
})(window);
