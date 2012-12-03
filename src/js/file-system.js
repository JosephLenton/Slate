
"use strict";

(function(slate) {
    var div = null;

    var root = (function() {
        var a = document.createElement( 'a' );
        a.href = '.';
        var root = a.href;
        
        if (
                root.charAt(root.length-1) !== '/' &&
                root.charAt(root.length-1) !== '\\'
        ) {
            root += '/';
        }

        return root;
    })();

    var combinePath = function( root, path ) {
        if ( path ) {
            /*
             * Account for 'http://' type of paths.
             *
             * Strip out 'file://' though, as we then 
             * check if it's for the root (starting with
             * a /), or a local file.
             *
             * 'file://' is eventually re-added'.
             */
            if ( path.search(/^[a-zA-Z]+:\/\//) !== -1 ) {
                if ( path.search(/^file:\/\//) !== -1 ) {
                    path = path.replace( /^file:\/\//, '' );
                } else {
                    return path;
                }
            }

            if (
                    path.charAt(0) === '/'  ||
                    path.charAt(0) === '\\' ||
                    path.search( /^[a-zA-Z]:\// ) !== -1
            ) {
                return 'file://' + path;
            } else {
                return root + path;
            }
        } else {
            return root;
        }
    }

    /**
     * All sizes are expressed in bytes.
     */
    var parseSize = function( size ) {
        if ( size ) {
            size = size.toLowerCase();

            var mult = 1;

            if ( size.indexOf( 'kb' ) ) {
                mult = 1024;
            } else if ( size.indexOf( 'mb' ) ) {
                mult = 1024*1024;
            } else if ( size.indexOf( 'gb' ) ) {
                mult = 1024*1024*1024;
            } else if ( size.indexOf( 'tb' ) ) {
                mult = 1024*1024*1024*1024;
            } else if ( size.indexOf( 'pb' ) ) {
                mult = 1024*1024*1024*1024*1024;
            }

            return size * mult;
        } else {
            return 0;
        }
    }

    /**
     * A generic handler for both a File, and a Dir object.
     */
    function FileDir( path, name, isDir ) {
        this.path = path;
        this.name = path.
                replace( /\/+$/, '' ).               // remove any ending slashes
                replace( /^([^\/]|\/)*[\/]+/, '' );  // remove anything before the name

        this.isFile      = false;
        this.isDirectory = false;
    }

    /**
     * Returns the parent directory.
     * 
     * If there is no parent, then this directory is returned.
     */
    FileDir.parent = function() {
        var parentPath = this.path.replace( /[^\/]+[\/]*$/, '' );

        if ( parentPath === '' ) {
            parentPath = '.';

            return this;
        } else {
            return new Dir( parentPath );
        }
    }

    /**
     * A File object.
     * 
     * Note that sizes are expressed in bytes,
     * and large sizes will almost certainly be an approximation.
     */
    function File( path, size, type ) {
        FileDir.call( this, path );

        this.isFile = true;
        this.size   = size || 0;

        this.type = type ||
                this.extension()
    }

    File.contents = function( callback ) {
        new FileSystem().text( callback );
    }

    File.prototype.extension = function( type, callback ) {
        var extension = '';

        var lastDot = this.name.lastIndexOf( '.' );
        if ( lastDot !== -1 ) {
            extension = this.name.substring( lastDot + 1 );
        }

        if ( arguments.length === 0 ) {
            return extension;
        } else if ( arguments.length === 1 ) {
            if ( util.slate.isString(type) ) {
                return extension === type;
            }
        } else {
            var callback = arguments[1];

            if (
                    slate.util.isFunction(callback) &&
                    slate.util.isString(type) &&
                    extension === type
            ) {
                callback( this );
            }
        }
    }

    /**
     * A directory on the FileSystem.
     */
    function Dir( path ) {
        if ( path === undefined ) throw new Error( 'empty path given' );

        FileDir.call( this, path );

        this.isDirectory = true;
    }

    Dir.prototype.children = function( callback ) {
        new FileSystem( path ).
                list( callback );
    }

    Dir.prototype.extension = function( type ) {
        if ( arguments.length === 0 ) {
            return '';
        } else if ( arguments.length === 1 ) {
            if ( util.slate.isString(type) ) {
                return false;
            } 
        }
    }

    /**
     * Represents an entire file system.
     */
    function FileSystem( path ) {
        this.root = combinePath( root, path );
    }

    FileSystem.prototype.request = function( path, error, callback ) {
        var src = combinePath( this.root, path );

        var iframe = document.createElement( 'iframe' );
        iframe.style.display = 'none';
        iframe.setAttribute( 'src', src );

        iframe.onload = function() {
            var htmlNode = ( iframe.contentDocument || iframe.contentWindow.document ).
                    body.parentNode;

            iframe.parentNode.removeChild( iframe );

            callback( htmlNode );
        }

        iframe.onerror = function() {
            error( new Error('path not found ' + path) );
        }

        document.body.appendChild( iframe );
    }

    /**
     * Changes the current working directory for this FileSystem.
     */
    FileSystem.prototype.chdir = function( path, callback ) {
        throw new Error( 'chdir is not yet implemented' );

        // todo
        // request the path given, to check if it exists
        // if it does, then change the path
        // if it does not, then give an exception
    }

    /**
     * This returns the raw HTML from the iframe request.
     *
     * That request may include extra HTML,
     * inserted by the browser, and that is included.
     */
    FileSystem.prototype.raw = function( path, callback ) {
        this.request( path, callback, function(htmlNode) {
            callback( htmlNode.innerHTML );
        } );
    }

    /**
     * This retusn the actual file contents, with any extra
     * HTML stripped out.
     */
    FileSystem.prototype.file = function( dir, callback ) {
        this.request( dir, callback, function(html) {
            // todo
        });
    }

    /**
     * Lists all folders in a directory.
     */
    FileSystem.prototype.dirs = function( dir, callback ) {
        this.fileDirs( dir, callback, false, true );
    }

    var filesRecursiveInner = function( fs, dir, callback, whenDone ) {
        fs.list( dir, function(f) {
            if ( f.isDirectory ) {
                filesRecursiveInner( fs, f.path, callback, whenDone );
            } else {
                callback( f );
            }
        } );
    }

    /**
     * Lists all files in a directory,
     * but including those in subfolders.
     */
    FileSystem.prototype.filesRecursive = function( dir, callback, whenDone ) {
        var self = this;

        /*
         * We have to count how many files we are looking at,
         * so when we know when we have processed all of those
         * we have seen.
         */

        var count = 1;

        var eachFileFun = function(f) {
            if ( f.isDirectory ) {
                count++;
                filesRecursiveInner( self, f.path, eachFileFun, seenDirFun );
            } else {
                count--;
                callback( f );
            }

            if ( count === 0 && whenDone ) {
                whenDone();
            }
        }
        
        var seenDirFun = function() {
            count--;

            if ( count === 0 && whenDone ) {
                whenDone();
            }
        }

        this.list( dir, eachFileFun, seenDirFun );
    }

    /**
     * Returns a list of list in a directory.
     */
    FileSystem.prototype.files = function( dir, callback, whenDone ) {
        this.fileDirs( dir, callback, whenDone, true, false );
    }

    /**
     * Returns a list of list of files and folders, in a directory.
     */
    FileSystem.prototype.list = function( dir, callback, whenDone ) {
        this.fileDirs( dir, callback, whenDone, true, true );
    }

    FileSystem.prototype.fileDirs = function( dir, callback, whenDone, includeFiles, includeDirs ) {
        if ( includeFiles || includeDirs ) {
            this.request( dir, callback, function(html) {
                var lines = html.getElementsByTagName( 'tr' );

                for ( var i = 0; i < lines.length; i++ ) {
                    var tds = lines[i].getElementsByTagName('td');

                    if ( tds.length > 0 ) {
                        var info = tds[0].getElementsByTagName('a')[0];

                        if ( info ) {
                            if ( includeFiles && info.className.indexOf('file') !== -1 ) {
                                var size;

                                if ( tds[1] > 0 ) {
                                    size = parseSize( tds[1].innerText );
                                }

                                callback( new File(info.href, size) );
                            } else if ( includeDirs && info.className.indexOf('dir') !== -1 ) {
                                callback( new Dir(info.href) );
                            }
                        }
                    }
                }

                if ( whenDone ) {
                    whenDone();
                }
            });
        }
    }

    slate.fs = {
            FileSystem : FileSystem,
            File       : File,
            Dir        : Dir
    }
})( slate );

