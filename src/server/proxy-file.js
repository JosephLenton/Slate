"use static";

/**
 * The file system has a single method, 'handle',
 * which is given the type of operation, and the
 * name of the file to perform it.
 *
 * It also takes a callback which is uses to supply
 * data to.
 *
 * Each request then has a partly-unique reply,
 * which is a JSON object. This always has the
 * properties:
 *
 *      {
 *              success: true or false,
 *              content: custom information
 *      }
 *
 * Queries may append on extra properties, if it
 * makes sense.
 */
exports.ProxyFile = (function() {
    var Handler = require( './handler.js' ).Handler;
    var fs = require( 'fs' );

    var fail = function( callback, err ) {
        if ( err ) {
            callback({ success: false, content: err.message });
            return true;
        } else {
            return false;
        }
    }

    var success = function( callback, data ) {
        callback({ success: true, content: data })
    }

    var result = function( callback, err, res ) {
        if ( ! fail(callback, err) ) {
            success( callback, res );
        }
    }

    var ProxyFile = Handler.newHandlerPrototype({
            /**
             * This will return a list of all items in
             * the given directory, or return error information.
             * 
             * This does not include '.' or '..', as they are
             * always present.
             */
            list: function( req, callback ) {
                var file = req.file;

                fs.readdir( file, function(err, res) {
                    if ( ! fail(callback, err) ) {
                        var count = res.length;

                        /*
                         * Walk through the list of file names,
                         * and work in their file stats.
                         */
                        for ( var i = 0; i < res.length; i++ ) {
                            (function(i) {
                                var name = res[i];

                                fs.stat( file + '/' + name, function(err, stat) {
                                    var obj = { name: name };

                                    if ( ! err ) {
                                        obj.success     = true;
                                        obj.isDirectory = stat.isDirectory();
                                        obj.isFile      = stat.isFile();
                                        obj.size        = stat.size || 0;
                                    } else {
                                        obj.success     = false
                                    }

                                    res[i] = obj;

                                    count--;
                                    if ( count === 0 ) {
                                        success( callback, res );
                                    }
                                })
                            })(i)
                        }
                    }
                } )
            },

            /**
             * This queries what type of file is present.
             * It will return one of:
             *
             *      - it is a file
             *      - it is a directory
             *      - file/directory was not found
             */
            query: function( req, callback ) {
                var file = req.file;

                fs.stat( file, function(err, stat) {
                    if ( ! fail(callback, err) ) {
                        success( callback, {
                                isDirectory: stat && stat.isDirectory(),
                                isFile     : stat && stat.isFile()
                        } )
                    }
                } )
            },

            content: function( req, callback ) {
                var file = req.file;

                fs.readFile( file, function(err, res) {
                    result( callback, err, res.toString('base64') );
                } )
            }
    });

    ProxyFile.prototype.handleNotFound = function( file, callback ) {
        console.log('not found : (');
        callback({ success: false, content: '' });
    }

    return ProxyFile;
})();
