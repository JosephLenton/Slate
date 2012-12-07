"use strict";

(function() {
    var rockwall = require( './rockwall/rockwall.js' );

    var rockServer = new rockwall.Server();

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
        res.writeHead( 200, {'Content-Type': 'text/html'} );
    } );

    rockServer.route( '', function(url, req, res) {
        rockServer.serveFile('index.html', req, res);
    } );

    rockServer.start( __dirname + '/../client', 80 );
})();
