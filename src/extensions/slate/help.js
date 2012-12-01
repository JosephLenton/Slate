"use strict";

(function() {
    slate.command( ['help', 'man'], function() {
        var str = '';

        for ( var k in commands ) {
            if ( commands.hasOwnProperty(k) ) {
                str += k + "\n";
            }
        }

        return slate.lib.formatter.rawHtml( str );
    } );
})();
