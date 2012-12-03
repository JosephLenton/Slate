"use strict";

/**
 * Development related functions.
 */
(function() {
    function reloadCss() {
        var styles = document.getElementsByTagName( 'link' );
        var timestamp = '?v=' + Date.now();

        for ( var i = 0; i < styles.length; i++ ) {
            var style = styles[i];

            if ( style.href ) {
                style.href = style.href.replace(/\?.*$/, '') + timestamp;
            }
        }
    }

    function log() {
        for ( var i = 0; i < arguments.length; i++ ) {
            console.log( arguments[i] );
        }
    }

    slate.command({
            log: log,
            reloadCss: reloadCss
    })
})();
