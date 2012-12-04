"use strict";

/**
 * Sets the HTML formatters for files and directories.
 */
(function( slate ) {
    var toPath = function( obj ) {
        if ( ! obj ) {
            return '.';
        } else if ( slate.util.isString(obj) ) {
            return obj;
        } else {
            return obj.toString();
        }
    }

    /**
     * Lists the path for the current working directory.
     */
    function cwd( path, onDisplay ) {
        path = toPath( path );

        var path = slate.util.absoluteUrl( '.' );
        onDisplay( path );

        return path;
    }

    /**
     * Changes the directory to the one given.
     *
     * If path is empty, then cwd does nothing.
     */
    function cd( path, onDisplay, state ) {
        path = toPath( path );

        if ( path === undefined ) {
            return cwd( undefined, onDisplay );
        } else {
            state.fs.chdir( path, onDisplay );
        }
    }

    function ls( path, onDisplay, state ) {
        if ( path === undefined ) {
            path = '.';
        } else if ( path instanceof slate.fs.File || path instanceof slate.fs.Dir ) {
            path = path.path;
        }

        if ( slate.util.isString(path) ) {
            // list directories
            state.fs.list( path, onDisplay );
        } else if ( path ) {
            for ( var k in path ) {
                onDisplay( new slate.obj.Property(path, k) );
            }
        }
    }

    slate.command({
            cd : cd,
            cwd: cwd
    })

    slate.commandEach({
            ls: ls
    })
    
    slate.html({
            type: slate.fs.File,

            fun: function( f ) {
                return '<span class="slate-file">' + 
                            slate.util.htmlSafe( f.name ) +
                        '</span>';
            }
    });

    slate.html({
            type: slate.fs.Dir,

            fun: function( f ) {
                return '<span class="slate-directory">' +
                            slate.util.htmlSafe( f.name ) +
                        '</span>';
            }
    });
})(window.slate);

