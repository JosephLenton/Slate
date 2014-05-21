"use static";

/**
 * A Command Line Options parser.
 */
(function() {
    var defaultOption = function( options, field, value ) {
        if ( options[field] === undefined ) {
            options[field] = value;
        }
    }

    var parseCommand = function( value, shorts, callback ) {
        if ( value.charAt(0) === '-' ) {
            // --option
            if ( value.charAt(1) === '-' ) {
                var equal = value.indexOf('=');

                if ( equal === -1 ) {
                    var key = value.substring( 2 );

                    callback( key, true, false );
                } else {
                    var key = value.substring( 2, equal );
                    var val = value.substring( equal+1 );

                    callback( key, val, true );
                }
            // -o
            } else {
                var lastKey = null;

                for ( var i = 1; i < value.length; i++ ) {
                    var k = value.charAt( i );
                    var key = shorts[ k ];

                    if ( key === undefined ) {
                        key = k;
                    }

                    if ( value.charAt(i) === '=' && i > 1 ) {
                        var val = value.substring( i+1 );
                        callback( lastKey, val, true );

                        break;
                    } else {
                        callback( key, true, false );
                    }

                    lastKey = key;
                }
            }
        }
    }

    var splitOptions = function( setup, field, reverse ) {
        var result = {};

        for ( var k in setup ) {
            if ( setup.hasOwnProperty(k) ) {
                var set = setup[k];

                if ( set ) {
                    var v = set[field];

                    if ( v !== undefined ) {
                        if ( reverse ) {
                            result[ v ] = k;
                        } else {
                            result[ k ] = v;
                        }
                    }
                }
            }
        }

        return result;
    }

    var parseOptions = function( setup, arr ) {
        var options  = {};

        var shorts   = splitOptions( setup, 'short', true );
        var checks   = splitOptions( setup, 'check' );
        var defaults = splitOptions( setup, 'default' );
        var takesVal = splitOptions( setup, 'value' );

        if ( arr === undefined ) {
            arr = process.argv;
        }

        arr.forEach( function(val, index, arr) {
            var ops = {};

            parseCommand( val, shorts, function(k, v, valueGiven) {
                if ( takesVal.hasOwnProperty(k) ) {
                    if ( takesVal[k] ) {
                        if ( ! valueGiven ) {
                            throw new Error("No value provided for option '" + k + "'.");
                        }
                    } else if ( valueGiven ) { 
                        throw new Error("Option '" + k + "' does not take a value.");
                    }
                }

                var check = checks[k];
                if ( check ) {
                    var newV = check(v);

                    if ( newV !== undefined ) {
                        options[k] = newV;
                    }
                } else {
                    options[k] = v;
                }
            } );
        } );

        for ( var k in defaults ) {
            if ( defaults.hasOwnProperty(k) ) {
                defaultOption( options, k, defaults[k] );
            }
        }

        return options;
    }

    exports.parse = parseOptions;
})();
