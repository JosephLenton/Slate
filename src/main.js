"use strict";

(function() {
    document.onreadystatechange = function () {
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

        function loadExtensions( root, whenDone ) {
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
                            script.src = file.path + timestamp;

                            script.onload  = whenLoaded;
                            script.onerror = errorLoaded;

                            document.head.appendChild( script );
                        } );
                    }
            )
        }

        if (document.readyState === "complete") {
            loadExtensions( 'extensions', function( errors ) {
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
            } )
        }
    }
})();
