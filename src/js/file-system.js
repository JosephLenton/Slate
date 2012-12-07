
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
        this.name = unescape(
                path.
                        replace( /\/+$/, '' ).              // remove any ending slashes
                        replace( /^([^\/]|\/)*[\/]+/, '' )  // remove anything before the name
        )

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

        this.type   = type || this.extension()
    }

    File.prototype.contents = function( callback ) {
        new FileSystem().text( this.path, callback );
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

    Dir.prototype.list = function( callback ) {
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
     * A file system core is created by providing an object
     * with methods. The idea of the core is to provide the
     * absolute bare minimum, which the FileSystem then wraps,
     * and adds all of the higher level details.
     *
     * You can think of it like a very high level device driver.
     *
     * Public methods however must return 'string', 'File',
     * 'Dir', or 'boolean' values as appropriate. It must
     * *not* expose internal details, as the FileSystem does
     * not understand how the core works.
     *
     * Those methods are checked for existance, and must exist.
     * An exception will be thrown if they do not exist.
     *
     * Required methods are:
     *
     *  - getObj( path, err, success ) -
     *          returns the type of item at the path given.
     *          Types include:
     *                error( new Error('path not found') )
     *                success( new File ) // if it's a file
     *                success( new Dir  ) // if it's a directory
     *
     *  - text( path, err, success )
     *          returns the textual representation,
     *          of the path given.
     *
     *  - list( path, err, success )
     *          lists all items found in the directory stated.
     *
     * All methods should work in the following format:
     *
     *  function( params ..., errorCallback, successCallback )
     *
     * Where 'params' is 0 or more parameters, based on the
     * method being implemented.
     *
     * Other methods can be supplied, and will be added to the
     * FileSystemCore generated.
     *
     * @param methods An object of methods to implement.
     * @return A FileSystemCore object.
     */
    var newFileSystemCore = function(methods) {
        var requiredMethods = [ 'getObj', 'text', 'list' ];
        var proto = {};

        for ( var i = 0; i < methods.length; i++ ) {
            var requiredMethod = requiredMethods[i];
            var method = methods[requiredMethod];

            assert( method, "required method '" + requiredMethod + "' is not supplied" );
        }

        for ( var k in methods ) {
            if ( methods.hasOwnProperty(k) ) {
                proto[k] = methods[k];
            }
        }

        var Core = function() { };
        Core.prototype = proto;

        return Core;
    }

    var iFrameFileSystemCore = new (newFileSystemCore({
            getObj: function( path, error, success ) {
                // todo
            },

            text: function( path, error, success ) {
                this.request( path,
                        function( err ) {
                            if ( error ) {
                                error( err );
                            }
                        },
                        function( node ) {
                            if ( success ) {
                                var pre = node.getElementsByTagName('pre')[0];

                                var html = pre ?
                                        pre.innerText       :
                                        node.body.innerHTML ;

                                success( html );
                            }
                        }
                ) 

            },

            list: function( path, error, success ) {
                this.request( path, error, function(html) {
                    var files = [];
                    var lines = html.getElementsByTagName( 'tr' );

                    for ( var i = 0; i < lines.length; i++ ) {
                        var tds = lines[i].getElementsByTagName('td');

                        if ( tds.length > 0 ) {
                            var info = tds[0].getElementsByTagName('a')[0];

                            if ( info ) {
                                if ( info.className.indexOf('file') !== -1 ) {
                                    var size;

                                    if ( tds[1] > 0 ) {
                                        size = parseSize( tds[1].innerText );
                                    }

                                    files.push( new File(info.href, size) );
                                } else if ( info.className.indexOf('dir') !== -1 ) {
                                    files.push( new Dir(info.href) );
                                }
                            }
                        }
                    }

                    if ( files ) {
                        success( files );
                    }
                });
            },

            /* extra methods */

            request: function( path, error, success ) {
                var iframe = document.createElement( 'iframe' );
                iframe.style.display = 'none';
                iframe.setAttribute( 'src', path );

                slate.util.onLoadError( iframe, 
                        function() {
                            try {
                                var htmlNode = ( iframe.contentDocument || iframe.contentWindow.document ).
                                        body.parentNode;

                                iframe.parentNode.removeChild( iframe );

                                success( htmlNode );
                            } catch ( err ) {
                                error( err );
                            }
                        },

                        function() {
                            error( new Error('path not found ' + path) );

                            iframe.parentNode.removeChild( iframe );
                        }
                )

                document.body.appendChild( iframe );
            }
    }))

    /**
     * Represents an entire file system.
     */
    /*
     * The FileSystem works in two parts, a wrapper file for common
     * file system handling, and a core section that does the actual
     * access.
     */
    function FileSystem( path ) {
        this.root = combinePath( root, path );
        this.core = iFrameFileSystemCore;
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
     * This returns the file contents, presuming it was
     * pure text, with any extra HTML stripped out.
     */
    FileSystem.prototype.text = function( path, callback ) {
        var src = combinePath( this.root, path );
        this.core.text( src, callback, callback );
    }

    /**
     * Lists all folders in a directory.
     */
    FileSystem.prototype.dirs = function( dir, callback ) {
        this.fileDirs( dir, callback, false, true );
    }

    var filesRecursiveInner = function( fs, dir, callback ) {
        fs.list( dir, function(f) {
            if ( f.isDirectory ) {
                filesRecursiveInner( fs, f.path, callback );
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

    FileSystem.prototype.exists = function( path, callback ) {
        this.core.getObj( path,
                function() { callback( false ) },
                function() { callback( true  ) }
        )
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
            this.core.list( dir,
                    function(err) {
                        if ( callback ) {
                            callback( err );
                        }

                        if ( whenDone ) {
                            whenDone( err );
                        }
                    },

                    function(files) {
                        if ( callback ) {
                            for ( var i = 0; i < files.length; i++ ) {
                                var file = files[i];

                                if ( (file instanceof File) && includeFiles ) { 
                                    callback( file );
                                } else if ( (file instanceof Dir) && includeDirs ) {
                                    callback( file );
                                }
                            }
                        }

                        if ( whenDone ) {
                            whenDone( files );
                        }
                    }
            )
        }
    }

    slate.fs = {
            FileSystem : FileSystem,
            File       : File,
            Dir        : Dir
    }
})( slate );

