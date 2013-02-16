"use strict";

(function() {
    slate.command(
            /**
             * Sqrt
             *
             * unicode 8730
             */
            'sqrt',
            function( val, onDisplay ) {
                var n;
                if ( isArray(n) ) {
                    n = val[0];
                } else {
                    n = val;
                }

                if ( n === undefined ) {
                    throw new Error("no value given for square root");
                }

                if ( isArray(n) ) {
                    var rs = new Array( n.length );

                    for ( var i = 0; i < rs.length; i++ ) {
                        rs[i] = Math.sqrt( n[i] );
                    }

                    onDisplay( rs );

                    return rs;
                } else {
                    var r = Math.sqrt( n );

                    onDisplay( r );
                    
                    return r;
                }
            }
    )

    slate.command(
            /**
             * Sum, the 'E' epsilon symbol 
             *
             * unicode 8721
             */
            'sum',
            function( val, onDisplay ) {
                var n = val[0];
                if ( n === undefined ) {
                    throw new Error("no value given for summing");
                }

                var power = val[1];
                if ( power === undefined ) {
                    power = 2;
                }

                if ( isArray(n) ) {
                    var rs = new Array( n.length );

                    for ( var i = 0; i < rs.length; i++ ) {
                        rs[i] = Math.sqrt( n[i], power );
                    }

                    onDisplay( rs );

                    return rs;
                } else {
                    var r = Math.sqrt( n, power );

                    onDisplay( r );
                    
                    return r;
                }
            }
    )
})()
