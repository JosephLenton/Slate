"use strict";

// namespace used by libraries
(function() {
    var slate = window.slate = window.slate || {};

    /*
     * Slate API
     * 
     * The public API used to customize slate.
     */

    var isDevFlag = false;
    slate.setDevelopment = function( isDev ) {
        isDevFlag = !! isDev;
    }
    slate.isDevelopment = function() {
        return isDevFlag;
    }

    var language = 'coffee';
    slate.setLanguage = function( lang ) {
        if ( lang !== 'js' && lang !== 'coffee' ) throw new Error( "unsupported language given, must be 'js' or 'coffee'" );

        language = lang;
    }
    slate.getLanguage = function() {
        return language;
    }

    slate.addFormatHandler = function( handler ) {
        if ( slate.util.isArray(handler) ) {
            for ( var i = 0; i < handler.length; i++ ) {
                slate.addFormatHandler( handler[i] );
            }
        } else {
            if ( handler.type === undefined ) throw new Error( "missing 'type' on format handler" );
            if ( handler.fun  === undefined ) throw new Error( "missing 'fun' on format handler"  );

            slate.data.formatHandlers.push( handler );
        }
    }

    /**
     * Represents 'do not display this value'.
     * It's needed because objects, null, and undefined
     * are all displayed.
     * 
     * So we just make a new object instead, and use ===
     * to differenciate it from others.
     */
    slate.IGNORE_RESULT = { ignore: true };

    slate.data = {
        loaders: (function() {
            var newTextLoader = function( callback ) {
                return function( path, read ) {
                    read( path, callback );
                }
            }

            var imageLoader = function( path ) {
                return '<div class="slate-embed-img">' +
                            '<img src="' + path + '">' +
                        '</div>'
            }

            var loaders = {
                    'png'  : imageLoader,
                    'jpg'  : imageLoader,
                    'jpeg' : imageLoader,
                    'gif'  : imageLoader,
                    'bmp'  : imageLoader,

                    'html' : function( path, read ) {
                        var frame = document.createElement( 'iframe' );
                        frame.className = 'slate-embed-html' ;
                        frame.setAttribute( 'src', path );
                        frame.setAttribute( 'frameborder', 'no' );
                        
                        var wrap = document.createElement( 'div' );
                        wrap.className = 'slate-embed-html-wrap';
                        wrap.appendChild( frame );

                        return wrap;
                    }
            }

            return loaders;
        })(),

        formatHandlers: [ ]
    };

    slate.obj = {
    } ;

    slate.lib = {
    };

    slate.util = {
    };
})();

