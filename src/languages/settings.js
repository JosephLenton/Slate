"use strict";

/**
 * This desribes how to run each of the compilers in the terminal.
 */
(function() {
    /**
     * Here as a stop gap, so it works seamlessly
     * within the system, with no holes drilled
     * through or special cases.
     */
    slate.language( 'js', function(src, next) {
        next( src );
    } );

    slate.language( 'coffee', function(src, next) {
        next( CoffeeScript.compile(src) );
    } );

    slate.language( 'livescript', function(src, next) {
        next( LiveScript.compile(src) );
    } );

    slate.language( 'slate', function(src, next) {
        slateScript.compile( src, next );
    } );
})();
