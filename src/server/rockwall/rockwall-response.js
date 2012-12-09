"use strict";

exports.RockwallResponse = (function() {
    var Response = function( res ) {
        this.res = res;
        this.endCount = 0;
        this.hasCode = false;

        this.__defineSetter__( 'statusCode', function( code ) {
            res.statusCode = code;
            return code;
        })

        this.__defineGetter__( 'statusCode', function( code ) {
            return res.statusCode;
        })
    }

    Response.prototype = {
            wait: function( f ) {
                this.endCount++;
            },

            writeHead: function( code, reason, headers ) {
                this.res.writeHead( code, reason, headers );

                this.hasCode = true;
            },

            write: function( chunk, encoding ) {
                if ( ! this.hasCode ) {
                    this.writeHead( 200, {'Content-Type': 'text/html'} );
                }

                this.res.write( chunk, encoding );
            },

            json: function( obj ) {
                this.write( JSON.stringify(obj) );
            },

            setHeader: function( head, value ) {
                this.res.setHeader( head, value );
            },

            endWait: function( data, encoding ) {
                this.endCount--;

                if ( this.endCount < 0 ) {
                    this.endCount = 0;
                }

                this.end( data, encoding );
            },

            end: function( data, encoding ) {
                if ( this.endCount === 0 ) {
                    this.res.end( data, encoding );
                }
            }
    }

    return Response;
})()

