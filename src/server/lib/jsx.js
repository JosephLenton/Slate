"use strict";

/**
 * jsx.js (javascriptX)
 *
 *  * markdown mixed with JavaScript, like literte coffeescript.
 */
exports.jsx = (function() {
    var jsx = function( code ) {
        return jsx.parse( code );
    }

    jsx.parseScripts = function() {
        setTimeout( function() {
            var scripts = document.getElementsByTagName( 'script' );
            for ( var i = 0; i < scripts.length; i++ ) {
                var src = scripts[i].getAttribute( 'src' );

                if ( src && src.matches(/.*\.jsx(\?.*)?/) ) {
                    jsx.parseUrl( scripts.src, function(err, code) {
                        if ( err ) {
                            throw err;
                        } else {
                            var script = document.createElement('script');
                            script.innerHTML = code;
                            document.head.appendChild( script );
                        }
                    } );
                }
            }
        }, 0 );
    }

    jsx.parseUrl = function( url, callback ) {
        try {
            var ajaxObj = new window.XMLHttpRequest();

            ajaxObj.onreadystatechange = function() {
                if ( ajaxObj.readyState === 4 ) {
                    var err    = undefined,
                        status = ajaxObj.status;

                    if ( ! (status >= 200 && status < 300 || status === 304) ) {                    
                        err = new Error(
                                "error connecting to url " +
                                slate.util.htmlSafe(url) + ', ' + status
                        );
                        callback( err, null, url, ajaxObj );
                    } else {
                        var code = jsx.parse( ajaxObj.responseText );
                        callback( null, url, ajaxObj );
                    }
                }
            }

            ajaxObj.open( type, url, true );
            ajaxObj.send( '' );
        } catch ( ex ) {
            callback(ex, undefined);
        }
    };

    jsx.parse = function( code ) {
        var lines = code.split(/\n\r|\r\n|\n|\r/);

        var isMarkdown      = true,
            commentStarted  = false,
            isExample       = false;

        var code = [ '"use strict";(function() {' ];

        for ( var i = 0; i < lines.length; i++ ) {
            var line = lines[i];

            /*
             * Work out what to build.
             */

            if ( isMarkdown ) {
                if (
                        isExample &&
                        line.length < 4
                ) {
                    isExample = false;
                } else if (
                    line.length === 3 &&
                    line.charAt(0) === '`' &&
                    line.charAt(1) === '`' &&
                    line.charAt(2) === '`'
                ) {
                    isExample = true;
                } else if (
                    line.length >= 8 &&
                    line.charAt(0) === '@' &&
                    line.charAt(1) === 'e' &&
                    line.charAt(2) === 'x' &&
                    line.charAt(3) === 'a' &&
                    line.charAt(4) === 'm' &&
                    line.charAt(5) === 'p' &&
                    line.charAt(6) === 'l' &&
                    line.charAt(7) === 'e'
                ) {
                    isExample = true;
                } else if (
                        line.length > 4 &&
                        line.charAt(0) === ' ' &&
                        line.charAt(1) === ' ' &&
                        line.charAt(2) === ' ' &&
                        line.charAt(3) === ' '
                ) {
                    if ( ! isExample ) {
                        isMarkdown = false;
                    }
                }
            } else {
                if (
                            line.trim().length > 0 &&
                            (
                                line.charAt(0) !== ' ' ||
                                line.charAt(1) !== ' ' ||
                                line.charAt(2) !== ' ' ||
                                line.charAt(3) !== ' '
                            )
                ) {
                    isMarkdown = true;
                }
            }

            /*
             * Now actually build the new line.
             */
            
            var codeLine = '';

            if ( isMarkdown ) {
                if ( ! commentStarted ) {
                    codeLine += " /* ";
                    commentStarted = true;
                }

                line = line.replace( /\*\//g, "* /" ) 
            } else {
                // end the 'previous' line
                if ( commentStarted ) {
                    code[i-1] += " */";
                    commentStarted = false;
                }
            }

            codeLine += line;
            code.push( codeLine );
        }

        code.push( '})()' );
        code.push( '' );

        return code.join( "\n" );
    }

    return jsx;
})();
