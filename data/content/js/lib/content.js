"use strict";

/**
 * This is the main Content window pane, where items get attached to.
 */
(function(window) {
    var newDisplay = function( dom ) {
        if ( ! dom ) throw new Error( "undefined dom object given" );

        return function( html ) {
            dom.insertAdjacentHTML( 'beforeend', html );
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
