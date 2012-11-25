"use strict";

(function(window) {
    var slate = window.slate = window.slate || {};

    slate.commands = {
        bindCommands : function( onSuccess, onError ) {
            window.exit = function() {
                window.close();
            }

            window.dev = function() {
                window.frame.openDevTools();
            }

            window.cwd = function() {
                return window.process.cwd();
            }

            window.cd = function( path ) {
                if ( path !== undefined ) {
                    // change working directory
                    try {
                        window.process.chdir( path );

                        return window.cwd();
                    } catch ( ex ) {
                        onError( undefined, es );
                        return window.slate.IGNORE_RESULT;
                    }
                // if user did nothing, we do nothing
                } else {
                    return window.slate.IGNORE_RESULT;
                }
            }

            window.ls = function( path ) {
                if (
                        typeof path === 'string' ||
                        ( path instanceof String )
                ) {
                    // list directories
                    return slate.core.IGNORE_RESULT;
                } else {
                    // list objects properties
                }
            }
        }
    }
})(window)

