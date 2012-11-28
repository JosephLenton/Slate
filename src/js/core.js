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

    /**
     * Sets slate into development mode, must be done at startup.
     * 
     * @param isDev True to go into dev mode, false to not. Defaults to true.
     * @return This slate namespace, for method chaining.
     */
    slate.setDevelopment = function( isDev ) {
        if ( arguments.length === 0 ) {
            isDevFlag = true;
        } else {
            isDevFlag = !! isDev;
        }

        return slate;
    }
    slate.isDevelopment = function() {
        return isDevFlag;
    }

    var language = 'coffee';
    slate.setLanguage = function( lang ) {
        if ( lang !== 'js' && lang !== 'coffee' ) throw new Error( "unsupported language given, must be 'js' or 'coffee'" );

        language = lang;

        return slate;
    }
    slate.getLanguage = function() {
        return language;
    }

    /**
     * Allows you to set how a type is formatted.
     * 
     * You pass in a JS object, with properties attached to
     * describe how your object is formatted. This includes
     * the type of the object, and a function to call to perform
     * the formatting.
     * 
     * In regards to 'format_returns', it's so you can do things like ...
     * 
     *     load 'http://www.google.com'
     * 
     * Here a Page object is created, and sent to the display, but also
     * returned. That means it will get rendered *twice*. To avoid that,
     * you can set 'format_returns' to false, and values that get
     * returned from any scripts, are not formatted.
     * 
     * Properties:
     *  - type A function constructor, for the type to handle. i.e. Error.
     *  - fun The function to perform to convert the type to HTML. This may be called multiple times when displaying.
     * 
     *  - pre A function to call before 'fun', it is called once for every bout of displaying.
     *  - post A function to call after 'fun', it is called once for every bout of displaying.
     *  - format_returns Optional, and defaults to true. When set to false, items returned to the terminal are not formatted. Only those sent to the display are formatted.
     */
    slate.addFormatHandler = function( handler ) {
        if ( ! handler ) {
            throw new Error( "null or no handler provided" );
        } else if ( arguments.length > 1 ) {
            slate.addFormatHandler( arguments );
        } else if ( slate.util.isArrayArguments(handler) ) {
            for ( var i = 0; i < handler.length; i++ ) {
                slate.addFormatHandler( handler[i] );
            }
        } else {
            if ( ! handler.type ) throw new Error( "missing 'type' on format handler" );
            if ( ! handler.fun  ) throw new Error( "missing 'fun' on format handler"  );

            if ( ! slate.util.isFunction(handler.type) ) throw new Error( "'type' property given, is not a constructor" );
            if ( ! slate.util.isFunction(handler.fun ) ) throw new Error( "'fun' property given, is not a function"  );

            slate.data.formatHandlers.push( handler );
        }

        return slate;
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

    slate.addLoader = function( type, action ) {
        if ( ! slate.util.isString(type)     ) throw new Error( "invalid type given, must be a string" );
        if ( ! slate.util.isFunction(action) ) throw new Error( "invalid action given, must be a function" );

        slate.data.loaders[ type ] = action;

        return slate;
    }

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
                    'bmp'  : imageLoader
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

