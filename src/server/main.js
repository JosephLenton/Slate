"use strict";

(function() {
    /*
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     *
     *      Constant Setup
     *
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     */

    var SERVER_ROOT = __dirname.replace( /\\/g, '/'),
        CLIENT_ROOT = __dirname.replace( /\\/g, '/') + '/../client';

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
    var COMMAND_LINE_OPTIONS = {
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
                    }
            },
            password: {
                    'default': '',
                    'short'  : 'x',
                    'value'  : true
            }
    }

    var optionsModule = new require( './options.js' );
    var options = optionsModule.parse( COMMAND_LINE_OPTIONS );

    /*
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     *
     *      Server Setup
     *
     * ### ### ### ### ### ### ### ### ### ### ### ### ###
     */

    var rockwall    = require( './rockwall/rockwall.js' )
    var proxyFile   = new (require( './proxy-file.js' ).ProxyFile)

    var rockServer  = new rockwall.Server()

    var jsx = require( './lib/jsx.js' ).jsx;

    rockServer.mime({
            html    : 'text/html',
            gif     : 'image/gif',
            jpg     : 'image/jpg',
            jpeg    : 'image/jpg',
            qb      : 'text/qb',
            js      : 'application/javascript',
            css     : 'text/css',
            jsx     : function(req, res, data) {
                res.
                        status( 200, 'application/javascript' ).
                        write( jsx(data.toString()) ).
                        end();
            }
    })

    rockServer.pageNotFound( function(url, req, res) {
        res.end( '<h1>page not found</h1>' )
    } )

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
    } )

    /*
     * Password protect.
     */

    if ( options.password ) {
        var user = new rockwall.Sessions();

        rockServer.preRoute( [ '', 'proxy/file'], function(url, req, res) {
            var session = user.session( req, res )

            if ( ! session.isLoggedIn ) {
                req.post( function(err, obj) {
                    if ( obj.password ) {
                        if ( !err && obj.password === options.password ) {
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

    rockServer.start( CLIENT_ROOT, options.port )
})();
