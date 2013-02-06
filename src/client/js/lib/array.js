"use strict";

(function() {
    var oldMap = Array.prototype.map;

    Array.prototype.map = function( fun ) {
        if ( typeof fun === 'string' || (fun instanceof String) ) {
            var args = new Array( arguments.length-1 );
            for ( var i = 0; i < args.length; i++ ) {
                args[i] = arguments[i-1];
            }

            return oldMap.call( this, function(obj) {
                return obj[fun].apply( obj, args );
            } );
        } else {
            return oldMap.apply( this, arguments );
        }
    }

    Array.prototype.inject = function( sum, fun ) {
        if ( arguments.length === 1 ) {
            assertFun( sum, "no inject function provided" );
            return this.reduce( sum );
        } else {
            assertFun( fun, "no inject function provided" );
            return this.reduce( fun, sum );
        }
    }
})();


