"use strict";

(function() {
    function Color( red, green, blue, alpha ) {
        if ( ! alpha && alpha !== 0 ) {
            alpha = 1;
        }

        if (
                red   < 0 || red   > 255 ||
                green < 0 || green > 255 ||
                blue  < 0 || blue  > 255 ||
                alpha < 0 || alpha > 1
        ) {
            throw new Error('invalid color given');
        }

        this.red      = red;
        this.green    = green;
        this.blue     = blue;
        this.alpha    = alpha;

        var cssColor;
        if ( alpha !== 1 ) {
            cssColor = 'rgba( ' + red + ', ' + green + ', ' + blue + ', ' + alpha + ' )';
        } else {
            cssColor =  'rgb( ' + red + ', ' + green + ', ' + blue + ' )';
        }

        this.cssColor = cssColor;
    }

    var colorHexToArray = function(hex) {
        if ( hex.replace( /(#?)[a-fA-F0-9]{3,}([a-fA-F0-9]{3,})?/, '') !== '' ) {
            throw new Error( "invalid hex value given: " + hex );
        }
        if ( hex.charAt(0) === '#' ) {
            hex = hex.substring( 1 );
        }

        var colors = [];
        if ( hex.length === 3 ) {
            for ( var i = 0; i < 3; i++ ) {
                var h = hex.charAt(i);
                colors[i] = parseInt( '0x' + h + h );
            }
        } else if ( hex.length === 6 ) {
            for ( var i = 0; i < 6; i += 2 ) {
                var h = hex.charAt(i) + hex.charAt(i+1);
                colors[i/2] = parseInt( '0x' + h );
            }
        } else {
            throw new Error( "invalid hex value given: " + hex );
        }

        colors[3] = 1;

        return colors;
    }

    var colorInternal = function( col, onDisplay ) {
        if ( col !== undefined && arguments.length > 0 ) {
            if (
                    arguments.length === 4 &&
                    slate.util.isNumeric(arguments[0]) &&
                    slate.util.isNumberStr(arguments[1]) &&
                    slate.util.isNumberStr(arguments[2]) &&
                    slate.util.isNumberStr(arguments[3])
            ) {
                var c = new Color( arguments[0], arguments[1], arguments[2], arguments[3] );

                onDisplay( c );
                return c;
            } else if (
                    arguments.length === 3 &&
                    slate.util.isNumberStr(arguments[0]) &&
                    slate.util.isNumberStr(arguments[1]) &&
                    slate.util.isNumberStr(arguments[2])
            ) {
                var c = new Color( arguments[0], arguments[1], arguments[2] );

                onDisplay( c );
                return c;
            } else if ( arguments.length > 1 ) {
                var colors = [];

                for ( var i = 0; i < arguments.length; i++ ) {
                    var c = colorInternal( arguments[i] );

                    colors.push( c );
                    onDisplay( c );
                }

                return colors;
            } else if ( slate.util.isArrayArguments(col) ) {
                return colorInternal.apply( null, col );
            } else if ( slate.util.isString(col) ) {
                return newColorHtml( colorHexToArray(col) );
            } else {
                throw new Error("unknown color item given");
            }
        }
    }

    slate.command( 'color', function( col, onDisplay ) {
        var r;

        if ( col !== undefined && arguments.length > 0 ) {
            r = colorInternal.apply( null, arguments );
        }

        if ( r ) {
            onDisplay( r );
        }
    } );

    slate.css( 'slate-embed-color', {
            width  : 80,
            height : 80,
            float  : 'left'
    } );

    slate.html({
        type: Color,

        fun: function(obj) {
            return '<div class="slate-embed-color" style="background: ' +
                    obj.cssColor +
                    ';"></div>' ;
        },

        format_return: false
    });
})();
