"use strict";

/**
 * Development related functions.
 */
(function() {
    function reload() {
        reloadCSS();
        reloadScripts();
    }

    function reloadScripts() {
        slate.main.reloadExtensions();
    }

    function reloadCSS() {
        var styles = document.getElementsByTagName( 'link' );
        var timestamp = '?v=' + Date.now();

        for ( var i = 0; i < styles.length; i++ ) {
            var style = styles[i];

            if ( style.href ) {
                style.href = style.href.replace(/\?.*$/, '') + timestamp;
            }
        }
    }

    function log( params, onDisplay ) {
        console.log( params );

        onDisplay( params );
        return params;
    }

    slate.command({
            reloadCSS: reloadCSS,
            reloadScripts: reloadScripts,
            reload: reload,

            log: log
    })
})();
