"use static";

exports.RockwallRequest = (function() {
    Request = function( req ) {
        this.hasData = false;
        this.strData = undefined;

        this.req            = req;

        this.url            = req.url;
        this.headers        = req.headers;
        this.trailers       = req.trailers;
        this.httpVersion    = req.httpVersion;
        this.connection     = req.connection;
    }

    Request.prototype = {
        close: function( callback ) {
            this.req.close( callback );
        },

        data: function( callback ) {
            if ( this.hasData ) {
                callback( this.strData );
            } else {
                var data = '';

                this.req.on( 'data', function(str) {
                    data += str;
                } )

                var self = this;
                this.req.on( 'end', function() {
                    self.strData = data;
                    callback( data );
                } )
            }
        },

        json: function( callback ) {
            this.data( function(str) {
                try {
                    var obj = JSON.parse( str );
                    callback( null, obj );
                } catch ( err ) {
                    callback( err );
                }
            } )
        }
    }

    return Request;
})();
