"use strict";

/**
 * Development related functions.
 */
(function() {
    function reload() {
        reloadCSS();
        reloadScripts();
    }

    function reloadScripts( params, onDisplay ) {
        slate.main.reloadExtensions( onDisplay );
    }

    function reloadCSS( params, onDisplay ) {
        slate.main.reloadCSS( onDisplay );
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
