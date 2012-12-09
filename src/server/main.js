"use strict";

(function() {
    var SERVER_ROOT = __dirname.replace( /\\/g, '/'),
        CLIENT_ROOT = __dirname.replace( /\\/g, '/') + '/../client';

    var rockwall    = require( './rockwall/rockwall.js' );
    var proxyFile   = new (require( './proxy-file.js' ).ProxyFile);

    var rockServer  = new rockwall.Server();

    rockServer.mime({
            html    : 'text/html',
            gif     : 'image/gif',
            jpg     : 'image/jpg',
            jpeg    : 'image/jpg',
            qb      : 'text/qb',
            js      : 'application/javascript',
            css     : 'text/css'
    });

    rockServer.pageNotFound( function(url, req, res) {
        res.end( '<h1>page not found</h1>' );
    } );

    rockServer.route( 'proxy/file', function(url, req, res) {
        req.json( function(err, obj) {
            if ( err ) {
                res.writeHead( 200, {'Content-Type': 'text/html'} );
                res.write( JSON.stringify({ success: false, content: "json object is corrupt" }) );
            } else {
                proxyFile.handle( obj.type, obj, function(output) {
                    res.writeHead( 200, {'Content-Type': 'text/json'} );
                    res.json( output );
                    res.end();
                } );
            }
        } )
    } );

    rockServer.route( '', function(url, req, res) {
        rockServer.serveFile('index.html', req, res, null, function() {
            res.write('<script>')
            res.write("window.slate = window.slate || {};\n");
            res.write('slate.constants = ');
            res.json({
                    isNode     : true,
                    cwd        : process.cwd().replace(/\\/g, '/'),
                    clientRoot : CLIENT_ROOT
            });
            res.write('</script>')
        });
    } );

    rockServer.start( CLIENT_ROOT, 80 );
})();
