"use strict";

(function() {
    var rockwall    = require( './rockwall/rockwall.js' )

    /*
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     *
     *      Constants
     *
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     */

    var SERVER_ROOT = __dirname.replace( /\\/g, '/'),
        CLIENT_ROOT = SERVER_ROOT + '/../client';

    /*
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     *
     *      Application and Command Line Options
     *
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     */

    var app = new rockwall.Application().
            start().
            port( 80 ).
            root( CLIENT_ROOT ).
            options({
                    /**
                     * The port number to listen on for incomming requests.
                     * By default this will use port 80.
                     */
                    port: {
                            'default': 80,
                            'short'  : 'p',
                            'value'  : true,
                            'check'  : function( val ) {
                                if ( val.length > 0 && val.match(/^[0-9]+$/) !== null ) {
                                    return parseInt( val );
                                }
                            },
                            'action' : function( app, val ) {
                                app.port( val );
                            }
                    },

                    password: {
                            'short'  : 'x',
                            'value'  : true,
                            'action' : function( app, password ) {
                                console.log( '###', password, '###' );
                                var user = new rockwall.Sessions();

                                app.server().preRoute( [ '', 'proxy/file'], function(url, req, res) {
                                    var session = user.session( req, res )

                                    if ( ! session.isLoggedIn ) {
                                        req.post( function(err, obj) {
                                            if ( obj.password ) {
                                                if ( !err && obj.password === password ) {
                                                    session.isLoggedIn = true

                                                    rockServer.handleRequest( url, req, res )
                                                } else {
                                                    /**
                                                     * If login fails,
                                                     * show an error.
                                                     */
                                                    rockServer.serveFile( 'login.html', req, res, function(req, res) {
                                                        res.write('<script>').
                                                            write('window.onload = function() { document.getElementsByClassName("login-box")[0].className += " error" }').
                                                            write('</script>')
                                                    })
                                                }
                                            } else {
                                                rockServer.serveFile( 'login.html', req, res )
                                            }
                                        } )

                                        return false
                                    }
                                } )
                            }
                    },

                    interactive: {
                            'default': false,
                            'short'  : 'i',
                            'value'  : false,
                            'action' : function(app) {
                                app.interactive();
                            }
                    }
            });

    /*
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     *
     *      Routes and Serving
     *
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     */

    var rockServer  = app.server();

    var proxyFile   = new (require( './proxy-file.js' ).ProxyFile)
    var jsx = require( './lib/jsx.js' ).jsx;

    rockServer.mime({
            jsx: function(req, res, data) {
                res.
                        status( 200, 'application/javascript' ).
                        write( jsx(data.toString()) ).
                        end();
            }
    })

    rockServer.route( 'proxy/file', function(url, req, res) {
        req.json( function(err, obj) {
            if ( err ) {
                res.
                        status( 200, 'text/html' ).
                        write( JSON.stringify({ success: false, content: "json object is corrupt" }) )
            } else {
                proxyFile.handle( obj.type, obj, function(output) {
                    res.
                            status( 200, 'text/json' ).
                            json( output ).
                            end()
                } )
            }
        } )
    } )

    rockServer.route( '', function(url, req, res) {
        rockServer.serveFile('index.html', req, res, function() {
            res.
                    write('<script>').
                    write("window.slate = window.slate || {};\n").
                    write('slate.constants = ').
                    json({
                            isNode     : true,
                            cwd        : process.cwd().replace(/\\/g, '/'),
                            clientRoot : CLIENT_ROOT
                    }).
                    write('</script>')
        })
    } );
})();
