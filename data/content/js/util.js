"use strict";

(function(window) {
    var changer = document.createElement('div');

    window.slate.util = {
        isFunction: function( r ) {
            return typeof r === 'function' || ( r instanceof Function );
        },

        isString: function( str ) {
            return typeof str === 'string' || ( str instanceof String );
        },

        isArray: function( arr ) {
            return typeof arr === 'array' || ( arr instanceof Array );
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
