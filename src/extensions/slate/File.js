"use strict";

/**
 * Sets the HTML formatters for files and directories.
 */
(function( slate ) {
    slate.addFormatHandler({
            type: slate.fs.File,

            fun: function( f ) {
                return '<span class="slate-file">' +
                            slate.util.htmlSafe( f.name ) +
                        '</span>';
            }
    });

    slate.addFormatHandler({
            type: slate.fs.Dir,

            fun: function( f ) {
                return '<span class="slate-directory">' +
                            slate.util.htmlSafe( f.name ) +
                        '</span>';
            }
    });
})(window.slate);

