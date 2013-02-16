"use strict";

(function() {
    var i = 0;
    var slate = window.slate = window.slate || {}
    slate.runtime = {
        call: function( fun, params, args ) {
            for ( var i = 0; i < args.length; i++ ) {
                params.push( args[i] );
            }

            if ( isFunction(fun) ) {
                return fun.apply( null, params );
            } else {
                throw new Error( "Function not found " + name );
            }
        },

        callObj: function( obj, name, params, args ) {
            for ( var i = 0; i < args.length; i++ ) {
                params.push( args[i] );
            }

            var fun = obj[name];
            if ( isFunction(fun) ) {
                return fun.apply( obj, params );
            } else {
                throw new Error( "Function not found " + name );
            }
        },
    }
})();
