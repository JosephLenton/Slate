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
        if ( col !== undefined ) {
            if ( slate.util.isArray(col) ) {
                if (
                        col.length === 4 &&
                        slate.util.isNumeric(col[0]) &&
                        slate.util.isNumeric(col[1]) &&
                        slate.util.isNumeric(col[2]) &&
                        slate.util.isNumeric(col[3])
                ) {
                    var c = new Color( col[0], col[1], col[2], col[3] );

                    onDisplay( c );
                    return c;
                } else if (
                        col.length === 3 &&
                        slate.util.isNumeric(col[0]) &&
                        slate.util.isNumeric(col[1]) &&
                        slate.util.isNumeric(col[2])
                ) {
                    var c = new Color( col[0], col[1], col[2] );

                    onDisplay( c );
                    return c;
                } else if ( col.length > 1 ) {
                    var colors = [];

                    for ( var i = 0; i < col.length; i++ ) {
                        var c = colorInternal( col[i], onDisplay );

                        colors.push( c );
                        onDisplay( c );
                    }

                    return colors;
                } else if ( slate.util.isArrayArguments(col) ) {
                    return colorInternal( col, onDisplay );
                }
            } else if ( slate.util.isString(col) ) {
                return colorInternal( colorHexToArray(col), onDisplay );
            }

            throw new Error("unknown color item given");
        }
    }

    slate.command( 'color', function( col, onDisplay ) {
        if ( col !== undefined && col.length > 0 ) {
            return colorInternal( col, onDisplay );
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
