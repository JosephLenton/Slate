"use strict";

/**
 * This is the main Content window pane, where items get attached to.
 */
(function(window) {
    var newDisplay = function( dom ) {
        if ( ! dom ) throw new Error( "undefined dom object given" );

        return function( html ) {
            var div = document.createElement( 'div' );
            div.innerHTML = html;

            div.className = 'slate-content-item';

            setTimeout( function() {
                div.className += ' slate-show';
            } );

            dom.appendChild( div );
            dom.scrollTop = dom.scrollHeight;
        }
    }

    window.slate.lib.content = {
        newDisplay : newDisplay,
        newClear   : function( dom ) {
            dom.innerHTML = '';
        }
    }
})(window);
