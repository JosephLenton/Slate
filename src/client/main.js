"use strict";

(function() {
    var slate = window.slate = window.slate || {};
    slate.constants = slate.constants || {};

    var EXTENSION_CLASS_NAME        = 'slate-js';

    slate.main = {
        /**
         * Searches for all JavaScript files in the root given,
         * and then attempts to load them.
         *
         * Errors are cached, and passed into the 'whenDone'
         * callback as an array of errors.
         *
         * An empty array is given if there are no errors.
         *
         * Note that this will load them *recursively* within the folder
         * given.
         *
         * @param root the location of where to search for extensions. Null or undefined defaults to the default location.
         * @param each Optional, a callback for each script.
         * @param whenDone Optional, a callback to call when all scripts have been loaded.
         */
        loadExtensions: function( root, each, whenDone ) {
            if ( ! root ) {
                root = (slate.constants.clientRoot || '.') + '/extensions';
            }

            var fs = new slate.fs.FileSystem(),
                timestamp = '?v=' + Date.now();

            var errors = [];
            var count = 0;
            var decrementCount = function( err ) {
                if ( err ) {
                    errors.push( err );
                }

                count--;

                if ( count === 0 && whenDone ) {
                    whenDone( errors );
                }
            }

            /*
             * Get the file contents, check it, and then validate.
             */
            var loadScript = function(file) {
                file.contents( function(js) {
                    if ( js instanceof Error ) {
                        if ( each ) {
                            each( js );
                        }

                        decrementCount( js );
                    } else {
                        var err = slate.executor.validateJS( js, file.name );

                        if ( err ) {
                            if ( each ) {
                                each( err );
                            }

                            decrementCount( err );
                        } else {
                            var script = document.createElement('script');

                            script.className = EXTENSION_CLASS_NAME;
                            script.innerHTML = js;

                            document.head.appendChild( script );

                            /*
                             * onload is not firing, so we just have to
                             * hope it's run straight away, and use a
                             * setTimeout.
                             */
                            setTimeout(function() {
                                if ( each ) {
                                    each(file);
                                }

                                decrementCount();
                            }, 1 );
                        }
                    }
                } )
            }
            var errorLoaded = function( url, file ) {
                var err = new Error( "failed to load extension " + url );

                if ( each ) {
                    each( err );
                }

                decrementCount( err );
            }

            // load in the extension files
            fs.filesRecursive( root,
                    function(file) {
                        count++;

                        file.isFile && file.extension( 'js', loadScript );
                    },
                    function() {
                        if ( whenDone && count === 0 ) {
                            whenDone( errors );
                        }
                    }
            )
        },

        /**
         * Scripts loaded with 'loadExtensions' are removed from the head.
         *
         * Note that the runtime will still have the execution of those
         * scripts present, this is simply done as cleanup to remove
         * the script tags themselves.
         */
        unloadExtensions: function( whenDone ) {
            var scripts = document.getElementsByClassName( EXTENSION_CLASS_NAME );

            for ( var i = 0; i < scripts.length; i++ ) {
                var script = scripts[i];
                script.parentNode.removeChild( script );
            }

            if ( whenDone ) {
                whenDone();
            }
        },

        /**
         * Unloads all extensions,
         * and then reloads them.
         */
        reloadExtensions: function( each, whenDone ) {
            slate.main.unloadExtensions( function() {
                slate.main.loadExtensions( null, each, whenDone );
            } );
        },

        reloadCSS: function( each ) {
            var styles = document.getElementsByTagName( 'link' );
            var timestamp = '?v=' + Date.now();

            for ( var i = 0; i < styles.length; i++ ) {
                var style = styles[i];

                if ( style.href ) {
                    style.href = style.href.replace(/\?.*$/, '') + timestamp;
                }
            }
        }
    }

    var getOptions = function() {
        var parts = window.location.href.split( '#' )[0].split( '?' );
        var options = {};

        if ( parts.length > 1 ) {
            parts = parts[ parts.length-1 ].split( '&' );

            for ( var i = 0; i < parts.length; i++ ) {
                var keyVal = parts[i].split( '=' );
                var key = keyVal[0];
                var val = keyVal.length > 1 ?
                        keyVal[1] :
                        true ;

                options[ key ] = val;
            }
        }

        return options;
    }

    var initialize = function( errors ) {
        slate.commands.remove( 'get', 'head', 'ignore', 'sleep' );
        //slate.commands.remove( 'describe' );
        slate.commands.remove( 'help', 'first', 'last', 'log', 'filter' );
        slate.commands.remove( 'reload', 'reloadCSS', 'reloadExtensions' );
        slate.commands.remove( 'ifDev', 'dev' );
        slate.commands.remove( 'sum' );

        slate.commands.remove( 'load' );
        slate.commands.remove( 'cls' );
        slate.commands.remove( 'exit' );

        if ( slate.constants.cwd ) {
            slate.fs.FileSystem.setCWD( slate.constants.cwd );
        }

        var options = getOptions();
        if ( options.debug ) {
            document.body.parentNode.classList.add( 'debug' );
        }

        /**
         * Work out if we should use touch or not.
         * It is used if ...
         *
         *  = has touch support, use touch by default,
         *  = ?touch is in the query url
         *  = ?touch=true is in the query url
         *  = ?touch=1 is in the query url
         *  = slate.constants.useTouch was set to true.
         *
         * Note that the constants allow you to force the use of touch,
         * or force it to be disabled. The intial touch detection is then
         * only used to see if it's initially there, for the default.
         */
        var useTouch = !! ('ontouchstart' in window)  // works on most browsers 
                || !!('onmsgesturechange' in window); // works on IE 10

        if ( options.touch !== undefined ) {
            useTouch = ( options.touch !== 'false' );
        }
       
        if ( slate.constants.useTouch !== undefined ) {
            useTouch = slate.constants.useTouch;
        }

        var isDev = window.slate.isDevelopment();

        var onKeyDowns = [];
        var addKeyDown = function(f) {
            assertFunction( f, "Function expected for onKeyDown" );
            onKeyDowns.push( f );
        }

        var handlers   = slate.data.formatHandlers;

        var displayDom = document.getElementsByClassName( 'slate-content' )[0];

        var clear      = slate.content.newClear( displayDom ),
            display    = slate.content.newDisplay( displayDom, addKeyDown );

        var onDisplay  = window.slate.formatter.newDisplayFormat(
                handlers,
                display,
                isDev
        );

        var executor   = window.slate.executor.newExecutor(
                document.getElementsByTagName('head')[0],
                slate.data.languages,
                onDisplay,
                handlers
        );
 
        /*
         * Create and setup the command for use.
         */

        window.slate.commands.bindCommands(
                clear,
                function( r ) {
                    window.slate.executor.setLastDisplay( r );
                    onDisplay( undefined, r );
                },
                window.slate.data.loaders,
                new slate.fs.FileSystem(),
                isDev
        );
       
        var inputDom = document.getElementsByClassName( 'slate-input' )[0];

        if ( useTouch ) {
            document.getElementsByTagName( 'body' )[0].className += ' slate-touch';

            new window.slate.TouchBar(
                    inputDom,
                    executor,
                    window.slate.commands.listCommands()
            );
        } else {
            new window.slate.TerminalBar(
                    inputDom,
                    executor,
                    slate.data.languages,
                    window.slate.getLanguage()
            ).focus();
        }

        for ( var i = 0; i < errors.length; i++ ) {
            onDisplay( undefined, errors[i] );
        }

        initializeGlobalCommands( document.getElementsByTagName('body')[0], onKeyDowns, isDev )
    }

    var initializeGlobalCommands = function( dom, onKeyDowns, isDev ) {
        var disableMetaKeys = function(ev) {
            /*
             * allow
             *      ctrl+shift+j    - console
             *      ctrl+shift+i    - web inspector
             *      ctrl+a          - select all
             *      ctrl+r (in dev) - refresh
             * 
             * These are for the web inspector.
             */
            if ( ! ev.altKey && (
                    ( ev.ctrlKey &&   ev.shiftKey && ev.keyCode === 73 ) ||       // ctrl + shift + i
                    ( ev.ctrlKey &&   ev.shiftKey && ev.keyCode === 74 ) ||       // ctrl + shift + j

                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 76 ) ||       // ctrl + l

                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 65 ) ||       // ctrl + a
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 90 ) ||       // ctrl + z
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 88 ) ||       // ctrl + x
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 67 ) ||       // ctrl + c
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 86 ) ||       // ctrl + v
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 84 ) ||       // ctrl + t

                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 80 ) ||       // ctrl + p

                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 37 ) ||       // ctrl + left
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 38 ) ||       // ctrl + up
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 39 ) ||       // ctrl + right
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 40 ) ||       // ctrl + down

                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 82 && isDev ) // ctrl + r
            )) {
                return;
            } else {
                for ( var i = 0; i < onKeyDowns.length; i++ ) {
                    onKeyDowns[i]( ev );
                }

                if ( ev.altKey || ev.ctrlKey || ev.metaKey ) {
                    ev.stopPropagation();
                    ev.preventDefault();
                }
            }
        }

        dom.addEventListener( 'keydown', disableMetaKeys );
    }

    document.onreadystatechange = function () {
        if (document.readyState === "complete") {
            slate.main.loadExtensions( null, null, initialize );
        }
    }
})();
