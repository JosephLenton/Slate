"use strict";

(function(window) {
    var changer = document.createElement('div');

    var argsConstructor = (function() {
        return arguments.constructor;
    })();

    var anchor = document.createElement( 'a' );

    window.slate.util = {
        isFunction: function( r ) {
            return typeof r === 'function' || ( r instanceof Function );
        },

        /**
         * Returns true if the value is like a number.
         * This is either an actual number, or a string which represents one.
         */
        isNumeric: function( str ) {
            return ( typeof str === 'number' ) ||
                   ( str instanceof Number   ) ||
                   ( String(str).search( /^\s*(\+|-)?((\d+(\.\d+)?)|(\.\d+))\s*$/ ) !== -1 )
        },

        isString: function( str ) {
            return typeof str === 'string' || ( str instanceof String );
        },

        isArrayArguments: function( arr ) {
            return  ( typeof arr === 'array' ) ||
                    ( arr instanceof Array   ) ||
                    (
                            arr !== undefined &&
                            arr !== null &&
                            arr.constructor === argsConstructor
                    )
        },

        isArray: function( arr ) {
            return typeof arr === 'array' || ( arr instanceof Array );
        },

        absoluteUrl: function( url ) {
            anchor.href = url;

            // remove double slashes, and the file:// uri
            var href = anchor.href.
                    replace( /^file:\/\//, '' ).
                    replace( /\/(\/)+/, '/' );

            // for windows
            if ( href.search(/^\/+[A-Z]:\//) !== -1 ) {
                href = href.replace( /^\/+/, '' );
            }

            // remove a trailing slash
            if ( href.length > 1 ) {
                href = href.replace( /\/$/, '' );
            }

            return href;
        },

        htmlSafe : function(str) {
            changer.innerHTML = '';
            changer.appendChild(document.createTextNode(str));

            return changer.innerHTML;
        },

        identify : function(obj) {
            if (obj === null) {
                return "null";
            } else {
                var name = window.slate.util.identifyFunction( obj.constructor );

                if ( name !== '' ) {
                    // capitalize the first letter
                    if (typeof (name) === 'string' && name.length > 0) {
                        name = name.charAt(0).toUpperCase() + name.slice(1);
                    }
                    
                    return name;
                } else {
                    return "[unknown Object]";
                }
            }
        },

        identifyFunction: function(obj) {
            if ( obj.name !== undefined ) {
                return obj.name;
            } else {
                var funcNameRegex = /function ([a-zA-Z0-9_]{1,})\(/;
                var results = funcNameRegex.exec( strConstructor );
                    
                if ( results && results.length > 1 ) {
                    var name = results[1];
                     
                    // capitalize the first letter
                    if (typeof (name) === 'string' && name.length > 0) {
                        name = name.charAt(0).toUpperCase() + name.slice(1);
                    }
                    
                    return name;
                } else {
                    return '';
                }
            }
        }
    }
})( window );
