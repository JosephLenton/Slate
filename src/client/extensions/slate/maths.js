"use strict";

/*
===============================================================================
# Maths

Common maths functions, for both JS, and the visual language.

===============================================================================
*/

(function() {

/*
-------------------------------------------------------------------------------

## Sqrt


-------------------------------------------------------------------------------
*/

    slate.command({
            name: 'sqrt',

            symbol: '&#x0221a',

            type: 'maths',

            visual: {
                className : 'maths',
                html: '&#x0221a',

                ast : {
                        style: { marginBottom: '-20px' }
                }
            },

            fun: function( val, onDisplay ) {
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
    });

/*
-------------------------------------------------------------------------------

## Sum, the 'E' epsilon symbol 

-------------------------------------------------------------------------------
*/

    slate.command({
            name: 'sum',
            symbol: '&#x02211;', // the epsilon sum symbol

            type: 'maths',

            fun: function( val, onDisplay ) {
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
    })
})();


