"use strict";

(function() {
    var DEFAULT_EXTENSION_LOCATION  = 'extensions',
        EXTENSION_CLASS_NAME        = 'slate-js';

    var slate = window.slate = window.slate || {};
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
         * @param root Optional, the location of where to search for extensions.
         * @param whenDone Optional, a callback to call when all scripts have been loaded.
         */
        loadExtensions: function( root, whenDone ) {
            if ( arguments.length < 2 ) {
                if ( typeof root !== 'string' && (!(root instanceof String)) ) {
                    if ( root ) {
                        whenDone = root;
                    }

                    root = DEFAULT_EXTENSION_LOCATION;
                }
            }

            var fs = new slate.fs.FileSystem(),
                timestamp = '?v=' + Date.now();

            var errors = [];
            var count = 0;
            var whenLoaded = function() {
                count--;

                if ( count === 0 && whenDone ) {
                    whenDone( errors );
                }
            }
            var errorLoaded = function() {
                errors.push( new Error("failed to load extension " + this.src) );
                whenLoaded();
            }

            // load in the extension files
            fs.filesRecursive( root,
                    function(file) {
                        file.extension('js', function(file) {
                            count++;

                            var script = document.createElement( 'script' );

                            script.className = EXTENSION_CLASS_NAME;
                            script.src = file.path + timestamp;

                            script.onload  = whenLoaded;
                            script.onerror = errorLoaded;

                            document.head.appendChild( script );
                        } );
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
        reloadExtensions: function( whenDone ) {
            slate.main.unloadExtensions( function() {
                slate.main.loadExtensions( whenDone );
            } );
        }
    }

    var initialize = function( errors ) {
        var isDev      = window.slate.isDevelopment();

        var handlers   = slate.data.formatHandlers;

        var displayDom = document.getElementsByClassName( 'slate-content' )[0];

        var clear      = window.slate.content.newClear( displayDom ),
            display    = window.slate.content.newDisplay( displayDom );

        var onDisplay  = window.slate.formatter.newDisplayFormat(
                handlers,
                display,
                isDev
        );

        var executor   = window.slate.executor.newExecutor(
                document.getElementsByTagName('head')[0],
                onDisplay,
                handlers
        );
        
        var barDom  = document.getElementsByClassName( 'slate-bar-input' )[0],
            typeDom = document.getElementsByClassName( 'slate-bar-type'  )[0];

        var bar = new window.slate.TerminalBar(
                barDom,
                typeDom,
                executor,
                window.slate.getLanguage()
        );
        bar.focus();

        window.slate.commands.bindCommands(
                clear,
                function( r ) { onDisplay( undefined, r ); },
                window.slate.data.loaders,
                new slate.fs.FileSystem(),
                isDev
        );

        for ( var i = 0; i < errors.length; i++ ) {
            onDisplay( undefined, errors[i] );
        }

        initializeGlobalCommands( document.getElementsByTagName('body')[0], isDev )
    }

    var initializeGlobalCommands = function( dom, isDev ) {
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

                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 65 ) ||       // ctrl + a
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 90 ) ||       // ctrl + z
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 88 ) ||       // ctrl + x
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 67 ) ||       // ctrl + c
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 86 ) ||       // ctrl + v

                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 80 ) ||       // ctrl + p

                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 37 ) ||       // ctrl + left
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 38 ) ||       // ctrl + up
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 39 ) ||       // ctrl + right
                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 40 ) ||       // ctrl + down

                    ( ev.ctrlKey && ! ev.shiftKey && ev.keyCode === 82 && isDev ) // ctrl + r
            )) {
                return;
            } else if ( ev.altKey || ev.ctrlKey || ev.metaKey ) {
                ev.stopPropagation();
                ev.preventDefault();
            }
        }

        dom.addEventListener( 'keydown', disableMetaKeys );
    }

    document.onreadystatechange = function () {
        if (document.readyState === "complete") {
            slate.main.loadExtensions( initialize );
        }
    }
})();
