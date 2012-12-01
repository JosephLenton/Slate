"use strict";

(function() {
    slate.command({
            exit: function(a, display) {
                window.close();
            },

            dev: function() {
                window.frame.openDevTools();
            },

            echo: function(a, display) {
                display( a );
            },

            ignore: function(a, display) {
                // do nothing
            }
    });

    slate.command( ['help', 'man'], function() {
        var str = '';

        for ( var k in commands ) {
            if ( commands.hasOwnProperty(k) ) {
                str += k + "\n";
            }
        }

        return slate.lib.formatter.rawHtml( str );
    } );}

    slate.command( [ 'head', 'first' ], function(arr, display) {
        if ( slate.util.isArray(arr) ) {
            if ( arr.length > 0 ) {
                var first = arr[0];

                display( first );
                return first;
            }
        } else {
            display( arr );
            return arr;
        }
    } );

    slate.command( [ 'tail', 'last' ], function(arr, display) {
        if ( slate.util.isArray(arr) ) {
            if ( arr.length > 0 ) {
                var last = arr[arr.length-1];

                display( last );
                return last;
            }
        } else {
            display( arr );
            return arr;
        }
    });
})();
