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
                        ( ev.ctrlKey &&  ev.shiftKey && ev.keyCode === 73 ) ||
                        ( ev.ctrlKey &&  ev.shiftKey && ev.keyCode === 74 ) ||
                        ( ev.ctrlKey && !ev.shiftKey && ev.keyCode === 65 ) ||
                        ( ev.ctrlKey && !ev.shiftKey && ev.keyCode === 82 && isDev )
                )) {
                    return;
                } else if ( ev.altKey || ev.ctrlKey || ev.metaKey ) {
                    ev.stopPropagation();
                    ev.preventDefault();
                }
            }

            dom.addEventListener( 'keydown'   , disableMetaKeys );
        }

        if (document.readyState === "complete") {
            var isDev     = window.slate.isDevelopment();

            var handlers = slate.data.formatHandlers;

            var displayDom = document.getElementsByClassName( 'slate-content' )[0];

            var clear     = window.slate.lib.content.newClear( displayDom ),
                display   = window.slate.lib.content.newDisplay( displayDom );

            var onDisplay = window.slate.lib.formatter.newDisplayFormat( handlers, display, isDev );

            var executor = window.slate.lib.executor.newExecutor(
                    document.getElementsByTagName('head')[0],
                    onDisplay
            );
            
            var barDom  = document.getElementsByClassName( 'slate-bar-input' )[0],
                typeDom = document.getElementsByClassName( 'slate-bar-type'  )[0];

            var bar = new window.slate.lib.TerminalBar(
                    barDom,
                    typeDom,
                    executor,
                    window.slate.getLanguage()
            );
            bar.focus();

            window.slate.commands.bindCommands(
                    clear,
                    onDisplay,
                    window.slate.data.loaders,
                    isDev
            );

            initializeGlobalCommands( document.getElementsByTagName('body')[0], isDev )
        }
    }
})();
