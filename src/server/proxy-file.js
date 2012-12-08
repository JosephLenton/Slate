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

    var ProxyFile = Handler.newHandlerPrototype({
            /**
             * This will return a list of all items in
             * the given directory, or return error information.
             * 
             * This does not include '.' or '..', as they are
             * always present.
             */
            list: function( file, callback ) {
                // todo
            },

            /**
             * This queries what type of file is present.
             * It will return one of:
             *
             *      - it is a file
             *      - it is a directory
             *      - file/directory was not found
             */
            query: function( file, callback ) {
                // todo
            },

            content: function( file, callback ) {
                fs.readFile( file, function(err, data) {
                    if ( err ) {
                        callback({
                                success: false,
                                content: err.message
                        });
                    } else {
                        callback({
                                success: true,
                                content: data
                        });

                    }
                } )
            }
    });

    ProxyFile.prototype.handleNotFound = function( file, callback ) {
        callback({ success: false, content: '' });
    }

    return ProxyFile;
})();
