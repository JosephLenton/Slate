"use strict";

/**
 * This is the main Content window pane, where items get attached to.
 */
(function(window) {
    var newDisplay = function( dom ) {
        if ( ! dom ) throw new Error( "undefined dom object given" );

        /**
         * @param The html string, element, or array of strings and elements, to append.
         * @param refresh An optional function to attach to a refresh button.
         */
        return function( html, refresh ) {
            var div = document.createElement( 'div' );
            div.className = 'slate-content-item-contents';

            /**
             * Appends the HTML given.
             * This can be a HTMLElement, a string, or
             * an array of elements or strings.
             * 
             * Note that empty strings are skipped.
             * 
             * This will return how many elements are appended,
             * following a call to this function.
             * 
             * @param html The html to append to the display.
             * @return A function which allows you to clear, and append, new data.
             */
            var append = function(html) {
                if ( slate.util.isArray(html) ) {
                    var count = 0;

                    for ( var i = 0; i < html.length; i++ ) {
                        count += append( html[i] );
                    }

                    return count;
                } else {
                    if ( slate.util.isString(html) ) {
                        if ( html.trim() !== '' ) {
                            div.innerHTML = html;

                            return 1;
                        }
                    } else if ( html instanceof HTMLElement ) {
                        div.appendChild( html );

                        return 1;
                    }
                }

                return 0;
            }

            var count = append( html );
            if ( count === 0 ) {
                return;
            }

            var wrap = document.createElement( 'div' );
            wrap.className = 'slate-content-item';
            wrap.appendChild( div );

            var clearAndAppend = function( html ) {
                div.innerHTML = '';
                append( html );

                wrap.className = wrap.className.replace(/ ?slate-show/, '');
                setTimeout( function() {
                    if ( wrap.className.indexOf('slate-show') === -1 ) {
                        wrap.className += ' slate-show';
                    }
                }, 100 );
            }

            if ( refresh ) {
                var button = document.createElement('a');

                button.setAttribute( 'href', '#' );
                button.className = 'slate-content-item-refresh';
                button.addEventListener( 'click', function(ev) {
                    refresh( ev, clearAndAppend );

                    ev.stopPropagation();
                    ev.preventDefault();
                })

                wrap.appendChild( button );
            }
            
            setTimeout( function() {
                wrap.className += ' slate-show';
            } );

            dom.appendChild( wrap );
            dom.scrollTop = dom.scrollHeight;

            return clearAndAppend;
        }
    }

    window.slate.content = {
        newDisplay : newDisplay,
        newClear   : function( dom ) {
            dom.innerHTML = '';
        }
    }
})(window);
