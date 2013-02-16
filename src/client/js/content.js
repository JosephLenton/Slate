"use strict";

/**
 * This is the main Content window pane, where items get attached to.
 */
(function(window) {
    var newDisplay = function( dom, keyDown ) {
        assert( dom, "undefined dom object given" );
        assertFunction( keyDown, "'keyDown' must be a function" );

        /* a unicode refresh symbol */
        var DEFAULT_REFRESH_BUTTON_TEXT = "\u2022";

        /*
         * The maximum is 10, because it is mapped to 0 through 9.
         */
        var MAX_REFRESH_SIZE = 10;
        var refreshStack = [];

        var addRefresh = function( button, refresh ) {
            refreshStack.unshift({
                button  : button,
                refresh : refresh
            })

            while ( refreshStack.length > MAX_REFRESH_SIZE ) {
                refreshStack.pop().button.innerText = DEFAULT_REFRESH_BUTTON_TEXT;
            }

            /*
             * Update the ctrl+num buttons.
             */
            for ( var i = 0; i < refreshStack.length; i++ ) {
                // 0 to 9 becomes 1 to 0 (keyboard num row)
                var num = (i+1) % MAX_REFRESH_SIZE;

                refreshStack[i].button.innerText = num + ',';
            }
        }

        // hook into the keyDown event
        keyDown( function(ev) {
            if ( ev.ctrlKey && !ev.altKey && !ev.shiftKey ) {
                var code = ev.keyCode;

                // if code is between 0 and 9 keys
                if ( 48 <= code && code <= 57 ) {
                    var num = code - 48;
                    num--;
                    if ( num < 0 ) {
                        num += MAX_REFRESH_SIZE;
                    }

                    var r = refreshStack[num];
                    if ( r ) {
                        r.refresh();
                    }

                    ev.stopPropagation();
                    ev.preventDefault();
                }
            }
        } );

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
                if ( isArray(html) ) {
                    var count = 0;

                    for ( var i = 0; i < html.length; i++ ) {
                        count += append( html[i] );
                    }

                    return count;
                } else {
                    if ( isString(html) ) {
                        if ( html.trim() !== '' ) {
                            div.innerHTML = html;

                            return 1;
                        }
                    } else if ( html instanceof HTMLElement ) {
                        if ( html.parentNode ) {
                            html.parentNode.removeChild( html );
                        }

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
                var refreshFun = function() {
                    refresh( clearAndAppend );
                }

                var button = bb( 'a', 'slate-content-item-refresh-button', {
                        text: DEFAULT_REFRESH_BUTTON_TEXT,
                        click: function(ev) {
                            refreshFun();

                            ev.stopPropagation();
                            ev.preventDefault();
                        } })

                var buttonOuter = bb( 'slate-content-item-refresh', button );

                wrap.appendChild( buttonOuter );

                addRefresh( button, refreshFun );
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
