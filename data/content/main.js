"use strict";

(function() {
    document.onreadystatechange = function () {
        if (document.readyState === "complete") {
            var handlers = slate.data.formatHandlers;

            var displayDom = document.getElementsByClassName( 'slate-content' )[0];

            var clear     = window.slate.lib.content.newClear( displayDom ),
                display   = window.slate.lib.content.newDisplay( displayDom );

            var onSuccess = window.slate.lib.formatter.newOnSuccess( handlers, display ),
                onError   = window.slate.lib.formatter.newOnError( handlers, display );

            var executor = window.slate.lib.executor.newExecutor(
                    document.getElementsByTagName('head')[0],
                    onSuccess,
                    onError
            );
            
            var barDom = document.getElementsByClassName( 'slate-bar-input' )[0];

            var bar = new window.slate.lib.TerminalBar( barDom, executor );
            bar.focus();

            window.slate.commands.bindCommands(
                    clear,
                    onSuccess,
                    onError,
                    window.slate.data.loaders
            );
        }
    }
})();
