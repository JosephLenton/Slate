
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
            path = path.replace( /^file:\/\//, '' );

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
    function File( path, size ) {
        FileDir.call( this, path );

        this.isFile = true;
        this.size   = size || 0;
    }

    File.contents = function( callback ) {
        new FileSystem().text( callback );
    }

    File.prototype.extension = function( type ) {
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

    FileSystem.prototype.raw = function( path, callback ) {
        this.request( path, callback, function(htmlNode) {
            callback( htmlNode.innerHTML );
        } );
    }

    FileSystem.prototype.file = function( dir, callback ) {
        this.request( dir, callback, function(html) {
            // todo
        });
    }

    FileSystem.prototype.dir = function( dir, callback ) {
        this.fileDir( dir, callback, false, true );
    }

    FileSystem.prototype.filesRecursive = function( dir, callback ) {
        var self = this;

        this.list( dir, function(f) {
            if ( f.isDirectory ) {
                self.filesRecursive( f.path, callback );
            } else {
                callback( f );
            }
        } );
    }

    FileSystem.prototype.files = function( dir, callback ) {
        this.fileDir( dir, callback, true, false );
    }

    FileSystem.prototype.list = function( dir, callback ) {
        this.fileDir( dir, callback, true, true );
    }

    FileSystem.prototype.fileDir = function( dir, callback, includeFiles, includeDirs ) {
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
            });
        }
    }

    slate.obj.FileSystem = FileSystem;
    slate.obj.File       = File;
    slate.obj.Dir        = Dir;
})( slate );

