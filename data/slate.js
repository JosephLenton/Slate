(function() {
    var DEFAULT_WIDTH  = 900,
        DEFAULT_HEIGHT = 800;

    var app = module.exports = require('appjs');

    app.serveFilesFrom( __dirname + '/content' );

    var window = app.createWindow({
      width  : DEFAULT_WIDTH,
      height : DEFAULT_HEIGHT,
      icons  : __dirname + '/content/icons'
    });

    window.on('create', function(){
        window.frame.show();
    });

    window.on('ready', function(){
        window.exports = {
                child_process: require('child_process'),
                fs           : require('fs'),
                Buffer       : require('buffer').Buffer
        }

        window.exec = window.exports.child_process.exec;

        window.process  = process;
        window.module   = module ;

        /**
         * Open dev tools when pressing
         * F12 or ctrl+alt+J
         */
        window.addEventListener( 'keydown', function(e) {
            if (
                    ( e.keyIdentifier === 'F12' ) ||
                    ( e.keyCode === 74 && e.metaKey && e.altKey )
            ) {
                window.frame.openDevTools();
            }
        } );
    });
})();
