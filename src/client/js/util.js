"use strict";

(function(window) {
    var changer = document.createElement('div');

    var anchor = document.createElement( 'a' );

    var IS_TOUCH = !! ('ontouchstart' in window)  // works on most browsers 
            || !!('onmsgesturechange' in window); // works on IE 10

    /**
     * How quickly someone must tap,
     * for it to be a 'fast click'.
     *
     * In milliseconds.
     */
    var FAST_CLICK_DURATION = 150,
        FAST_CLICK_DIST = 20,
        SLOW_CLICK_DIST = 15;

    var updateXY = function( xy, ev, updateMove ) {
        var x,
            y;

        if ( ev.offsetX !== undefined ) { // Opera
            x = ev.offsetX;
            y = ev.offsetY;
        } else if ( ev.layerX !== undefined ) { // Firefox
            x = ev.layerX;
            y = ev.layerY;
        } else if ( ev.clientX !== undefined ) {
            x = ev.clientX;
            y = ev.clientY;

            for (
                    var tag = ev.target;
                    tag.offsetParent;
                    tag = tag.offsetParent
            ) {
                x -= tag.offsetLeft;
                y -= tag.offsetTop;
            }
        // fail, so just put no movement in
        } else {
            x = 0;
            y = 0;
        }

        if ( updateMove ) {
            xy.moveX += (xy.x - x)
            xy.moveY += (xy.y - y)
        } else {
            xy.moveX = 0;
            xy.moveY = 0;
        }

        xy.x = x;
        xy.y = y;
    }

    window.slate.util = {
        click: function( el, callback ) {
            assert( el instanceof HTMLElement, "non-html element given" );

            var xy = { x: 0, y: 0, moveX: 0, moveY: 0 },
                timestart = 0,
                finger    = 0;

            if ( IS_TOUCH ) {
                el.addEventListener( 'touchstart', function(ev) {
                    var touch = ev.changedTouches[ 0 ];
                    
                    if ( touch ) {
                        finger = touch.identifier;
                        timestart = Date.now();

                        updateXY( xy, touch, false );
                    }
                }, false )

                el.addEventListener( 'touchmove', function(ev) {
                    for ( var i = 0; i < ev.changedTouches.length; i++ ) {
                        var touch = ev.changedTouches[ i ];
                    
                        if ( touch && touch.identifier === finger ) {
                            updateXY( xy, touch, true );
                            return;
                        }
                    }
                }, false )

                el.addEventListener( 'touchend', function(ev) {
                    for ( var i = 0; i < ev.changedTouches.length; i++ ) {
                        var touch = ev.changedTouches[ i ];
                        
                        if ( touch && touch.identifier === finger ) {
                            updateXY( xy, touch, true );

                            var duration = Date.now() - timestart;
                            var dist = Math.sqrt( xy.moveX*xy.moveX + xy.moveY*xy.moveY )

                            if (
                                    ( dist < FAST_CLICK_DIST && duration < FAST_CLICK_DURATION ) ||
                                      dist < SLOW_CLICK_DIST
                            ) {
                                callback.call( el, ev );
                                ev.preventDefault();
                            }

                            return;
                        }
                    }
                }, false )

                var killEvent = function(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                }

                el.addEventListener( 'click'    , killEvent );
                el.addEventListener( 'mouseup'  , killEvent );
                el.addEventListener( 'mousedown', killEvent );
            } else {
                el.addEventListener( 'click', function(ev) {
                    ev = ev || window.event;

                    if ( (ev.which || ev.button) === 1 ) {
                        ev.preventDefault();
                    
                        callback.call( el, ev );
                    }
                } )
            }

            return el;
        },

        getDomLocation: function( from, to, callback ) {
            if ( arguments.length === 2 ) {
                callback = to;
                to = null;
            }

            var left = 0;
            var top = 0;

            for (
                    var node = from;
                    node !== to && node !== null; 
                    node = node.parentNode
            ) {
                left += node.offsetLeft;
                top  += node.offsetTop;
            }

            callback( left, top );
        },

        transitionEnd: function( dom, tEnd ) {
            var fun = function() {
                tEnd.call( dom );

                dom.removeEventListener( 'transitionend', fun );
                dom.removeEventListener( 'webkitTransitionEnd', fun );
            }

            dom.addEventListener( 'transitionend', fun );
            dom.addEventListener( 'webkitTransitionEnd', fun );
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
                        if ( ! isString(data) ) {
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
