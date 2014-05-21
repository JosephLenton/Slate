"use strict";

/**
 * Application
 *
 * A boiler plate for most Rockwall applications.
 * You can use the Rockwall server directly,
 * but for most users, this is the best way to get started.
 *
 * It allows you to setup common bits,
 * like the port number, and the root folder.
 *
 * You can also set command line options, which are
 * parsed and executed, if present.
 */
exports.Application = (function() {
    var rockwall = require( './rockwall.js' )

    var onStdIn = function( fun ) {
        var stdin = process.stdin;

        // without this, we would only get streams once enter is pressed
        stdin.setRawMode( true );

        // resume stdin in the parent process (node app won't quit all by itself
        // unless an error or process.exit() happens)
        stdin.resume();

        // i don't want binary, do you?
        stdin.setEncoding( 'utf8' );

        // on any data into stdin
        stdin.on( 'data', fun );
    }

    var Application = function() {
        this.optionsDesc = null;
        this.portNum = 80;
        this.rootDir = '.';
        this.isInteractive = false;

        this.rockwall = new rockwall.Server();
        this.rockwall.mime({
                wav     : function(req, res, data) {
                        res.status( 200, 'audio/wav' ).
                            header( 'Transfer-Encoding: chunked' ).
                            header( 'icy-br: ##' ).
                            header( 'ice-audio-info:bitrate=##;samplerate=#####' ).
                            header( 'icy-description:Some Name' ).
                            header( 'icy-genre:Alternative' ).
                            header( 'icy-name:Name' ).
                            header( 'icy-pub:0' ).
                            header( 'Server:Whatever you want' ).
                            header( 'Cache-Control: no-cache' ).
                            header( 'Connection: Keep-Alive' ).
                            write( data.toString('base64') ).
                            end();
                },
                html    : 'text/html',
                gif     : 'image/gif',
                jpg     : 'image/jpg',
                jpeg    : 'image/jpg',
                qb      : 'text/qb',
                js      : 'application/javascript',
                css     : 'text/css'
        });

        this.rockwall.pageNotFound( function(url, req, res) {
            res.end( '<h1>page not found</h1>' )
        } )
    }

    Application.prototype = {
        /*
         * The various command line options.
         *
         * Default options are in the form:
         *
         *      node.js server/main.js --port=8080
         *
         * Short version of options:
         *
         *      node.js server/main.js -p=8080
         *
         */
        options: function(desc) {
            this.optionsDesc = desc;

            return this;
        },

        interactive: function() {
            this.isInteractive = true;

            return this;
        },

        port: function( portNum ) {
            this.portNum = portNum;

            return this;
        },

        /**
         * Sets the root folder for any public assets.
         * By default, this is set to the '.' folder, whatever that may be.
         *
         * @param dir The directory to use as the root public folder.
         */
        root: function( dir ) {
            this.rootDir = dir;

            return this;
        },

        server: function() {
            return this.rockwall;

            return this;
        },

        start: function() {
            setTimeout( (function() {
                var options = ( this.optionsDesc ) ?
                        new require( './command-line-options.js' ).parse( this.optionsDesc ) :
                        {} ;

                if ( options.interactive ) {
                    onStdIn( function(key) {
                        var data = '';

                        // ctrl-c ( end of text )
                        if ( key === '\u0003' ) {
                            process.exit();
                        // enter
                        } else {
                            // write the key to stdout all normal like
                            process.stdout.write( key );
                            
                            if ( key.charCodeAt(0) === 8 ) {
                                if ( data.length > 0 ) {
                                    data = data.substring( 0, data.length-1 );
                                }
                            } else if ( key === "\n" || key === "\r" ) {
                                data = data.trim();

                                if ( data !== '' ) {
                                    (function(dataCopy) {
                                        setTimeout( function() {
                                            try {
                                                console.log( '>', eval(dataCopy) );
                                            } catch ( err ) {
                                                console.error( ' ---', err );
                                                console.log( err.stack );
                                                console.log();
                                            }
                                        }, 0 );
                                    })(data);
                                }

                                data = '';
                            } else {
                                data += key;
                            }
                        }
                    } );
                }

                for ( var k in options ) {
                    if ( this.optionsDesc.hasOwnProperty(k) ) {
                        var optionDesc = this.optionsDesc[k];

                        if ( optionDesc.hasOwnProperty('action') ) {
                            optionDesc.action.call( this, this, options[k] );
                        }
                    }
                }

                console.log();

                this.rockwall.start( this.rootDir, this.portNum, this.isInteractive )
            }).bind(this), 0 );

            return this;
        }
    }

    return Application;
})();
