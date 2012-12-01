"use strict";

(function() {
    function Image( src ) {
        this.src = src;

        this.width  = 0;
        this.height = 0;

        this.dom = document.createElement('img');
        this.dom.src = src;

        var self = this;
        this.dom.onload = function() {
            self.width  = self.dom.width;
            self.height = self.dom.height;

            delete self.dom.onload;
        }
    }

    slate.addLoader([ 'png', 'jpg', 'jpeg' ], function(path, read) {
        return new Image( path );
    } );

    slate.addFormatHandler({
        type: Image,
        fun: function(obj) {
            var div = document.createElement( 'div' );
            div.className = 'slate-embed-img';

            div.appendChild( obj.dom );

            return div;
        }
    });
})( window.slate )
