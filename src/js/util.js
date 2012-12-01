"use strict";

(function(window) {
    var changer = document.createElement('div');

    var argsConstructor = (function() {
        return arguments.constructor;
    })();

    var anchor = document.createElement( 'a' );

    window.slate.util = {
        isNumber: function( n ) {
            return typeof n === 'number' || ( n instanceof Number );
        },

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
                            arr.constructor === argsConstructor &&
                            arr.length !== undefined
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

        ajaxGet: function( url, callback, data ) {
            return slate.util.ajax( 'GET', url, callback, data );
        },

        ajaxPost: function( url, callback ) {
            return slate.util.ajax( 'POST', url, callback, data );
        },

        ajax: function( type, url, callback, data ) {
            try {
                var ajaxObj = new window.XMLHttpRequest();

                ajaxObj.onreadystatechange = function() {
                    if ( ajaxObj.readyState === 4 ) {
                        console.log( this.getAllResponseHeaders() );

                        var err    = undefined,
                            result = undefined,
                            mime   = this.getResponseHeader( 'content-type' ),
                            status = ajaxObj.status;

                        if ( ! (status >= 200 && status < 300 || status === 304) ) {                    
                            err    = new Error( "error connecting to url " + slate.util.htmlSafe(url) + ', ' + status );
                        } else {
                            result = ajaxObj.responseText;
                        }

                        callback( err, result, mime );
                    }
                }

                ajaxObj.open( type, url, true );

                if ( type === 'POST' ) {
                    if ( ! data ) {
                        data = '';
                    }

                    ajaxObj.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
                    ajaxObj.setRequestHeader( "Content-Length", data.length );
                    ajaxObj.send( data );
                } else {
                    ajaxObj.send( '' );
                }
            } catch ( ex ) {
                callback(ex, undefined);
            }
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
            if ( obj.name !== undefined && obj.name !== '' ) {
                return obj.name;
            } else {
                var funcNameRegex = /function ([a-zA-Z0-9_]{1,})\(/;
                var results = funcNameRegex.exec( obj.toString() );
                    
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
