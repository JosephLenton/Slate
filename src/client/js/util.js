"use strict";

(function(window) {
    var changer = document.createElement('div');

    var argsConstructor = (function() {
        return arguments.constructor;
    })();

    var anchor = document.createElement( 'a' );

    window.slate.util = {
        click: function( el, callback ) {
            assert( el instanceof HTMLElement, "non-html element given" );

            el.addEventListener( 'click', function(ev) {
                ev.preventDefault();
                
                callback( ev );
            } );

            return el;
        },

        onLoadError: function( obj, onload, onerror ) {
            // ensure we delete the handlers *before* calling them.
            if ( onload ) {
                obj.onload = function() {
                    delete obj.onload;
                    delete obj.onerror;

                    onload.call( this );
                }
            }

            if ( onerror ) {
                obj.onerror = function() {
                    delete obj.onload;
                    delete obj.onerror;

                    onerror.call( this );
                }
            }
        },

        newElement: function( type, info ) {
            var dom     = document.createElement( type ),
                argsLen = arguments.length;

            if ( type === 'a' ) {
                dom.setAttribute( 'href', '#' );
            }

            if ( argsLen > 1 ) {
                if ( slate.util.isString(info) ) {
                    dom.className = info;
                } else {
                    assert( info, "no info given" );

                    for ( var k in info ) {
                        dom.setAttribute( k, info[k] );
                    }
                }

                if ( argsLen > 2 ) {
                    for ( var i = 2; i < argsLen; i++ ) {
                        slate.util.addToDom( dom, arguments[i] );
                    }
                }
            }

            return dom;
        },

        addToDom: function( dom, el ) {
            if ( slate.util.isArray(el) ) {
                for ( var i = 0; i < el.length; i++ ) {
                    slate.util.addToDom( dom, el[i] );
                }
            } else if ( slate.util.isString(el) ) {
                dom.insertAdjacentHTML( 'beforeend', el );
            } else {
                dom.appendChild( el );
            }

            return dom;
        },

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

        ajaxGet: function( url, data, callback ) {
            if ( arguments.length === 2 ) {
                callback = data;
                data = undefined;
            }

            return slate.util.ajax( 'GET', url, data, callback );
        },

        ajaxPost: function( url, data, callback ) {
            return slate.util.ajax( 'POST', url, data, callback );
        },

        ajaxHead: function( url, data, callback ) {
            return slate.util.ajax( 'HEAD', url, data, callback );
        },

        ajax: function( type, url, data, callback ) {
            try {
                var ajaxObj = new window.XMLHttpRequest();

                ajaxObj.onreadystatechange = function() {
                    if ( ajaxObj.readyState === 4 ) {
                        var err    = undefined,
                            status = ajaxObj.status;

                        if ( ! (status >= 200 && status < 300 || status === 304) ) {                    
                            err = new Error( "error connecting to url " + slate.util.htmlSafe(url) + ', ' + status );
                        }

                        callback( err, ajaxObj, url );
                    }
                }

                ajaxObj.open( type, url, true );

                if ( type === 'POST' ) {
                    if ( data ) {
                        if ( ! slate.util.isString(data) ) {
                            data = JSON.stringify(data);
                        }
                    } else {
                        data = '';
                    }

                    ajaxObj.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
                    //ajaxObj.setRequestHeader( "Content-Length", data.length );
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
