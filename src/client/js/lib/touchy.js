"use strict";

(function() {
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

    var startTouch = function( ev, xy ) {
        var touch = ev.changedTouches[ 0 ];
        
        if ( touch ) {
            xy.finger = touch.identifier;
            xy.timestart = Date.now();

            updateXY( xy, touch, false );

            return true;
        } else {
            return false;
        }
    };

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

    var pressBuilder = function( el, onDown, onUp, onClick ) {
        if ( ! (el instanceof HTMLElement) ) {
            throw new Error( "non-html element given" );
        }

        var xy = {
                timestart : 0,
                finger    : 0,

                x: 0,
                y: 0,

                moveX: 0,
                moveY: 0
        };

        if ( IS_TOUCH ) {
            el.addEventListener( 'touchstart', function(ev) {
                if ( startTouch(ev, xy) ) {
                    onDown.call( el );
                }
            }, false )

            var touchEnd = function(ev) {
                for ( var i = 0; i < ev.changedTouches.length; i++ ) {
                    var touch = ev.changedTouches[ i ];
                
                    if ( touch && touch.identifier === xy.finger ) {
                        xy.finger = -1;

                        updateXY( xy, touch, true );

                        var duration = Date.now() - xy.timestart;
                        var dist = Math.sqrt( xy.moveX*xy.moveX + xy.moveY*xy.moveY )

                        if (
                                onClick && (
                                        ( dist < FAST_CLICK_DIST && duration < FAST_CLICK_DURATION ) ||
                                          dist < SLOW_CLICK_DIST
                                )
                        ) {
                            onClick.call( el, ev );
                        } else {
                            onUp.call( el, ev );
                        }

                        return;
                    }
                }
            }

            document.getElementsByTagName( 'body' )[0].
                    addEventListener( 'touchend', touchEnd );
            el.addEventListener( 'touchend', touchEnd, false )

            el.addEventListener( 'click', function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
            } );
        } else {
            var isDown = false;

            el.addEventListener( 'mousedown', function(ev) {
                ev = ev || window.event;

                if ( (ev.which || ev.button) === 1 ) {
                    ev.preventDefault();
                
                    isDown = true;
                    onDown.call( el, ev );
                }
            } );

            el.addEventListener( 'mouseup', function(ev) {
                ev = ev || window.event;

                if ( (ev.which || ev.button) === 1 && isDown ) {
                    ev.preventDefault();
                
                    isDown = false;
                    onUp.call( el, ev );
                }
            } );
        }

        return el;
    };

    var clickBuilder = function( el, callback ) {
        if ( ! (el instanceof HTMLElement) ) {
            throw new Error( "non-html element given" );
        }

        var xy = { finger: -1, timestart: 0, x: 0, y: 0, moveX: 0, moveY: 0 };

        if ( IS_TOUCH ) {
            el.addEventListener( 'touchstart', function(ev) {
                startTouch( ev, xy );
            }, false )

            el.addEventListener( 'touchmove', function(ev) {
                if ( xy.finger === -1 ) {
                    startTouch( ev, xy );
                } else {
                    for ( var i = 0; i < ev.changedTouches.length; i++ ) {
                        var touch = ev.changedTouches[ i ];
                    
                        if ( touch && touch.identifier === xy.finger ) {
                            updateXY( xy, touch, true );
                            return;
                        }
                    }
                }
            }, false )

            el.addEventListener( 'touchend', function(ev) {
                for ( var i = 0; i < ev.changedTouches.length; i++ ) {
                    var touch = ev.changedTouches[ i ];
                    
                    if ( touch && touch.identifier === xy.finger ) {
                        xy.finger = -1;

                        updateXY( xy, touch, true );

                        var duration = Date.now() - xy.timestart;
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
            } );
        }

        return el;
    };

    var holdBuilder = IS_TOUCH ?
            function( el, fun ) {
                pressBuilder(
                        el,

                        function(ev) {
                            fun.call( el, ev, true );
                        },

                        function(ev) {
                            fun.call( el, ev, false );
                        }
                )

                return el;
            } :
            function( el, fun ) {
                var isDown = false;

                el.addEventListener( 'mousedown', function(ev) {
                    ev = ev || window.event;

                    if ( (ev.which || ev.button) === 1 ) {
                        ev.preventDefault();
                    
                        isDown = true;
                        fun.call( el, ev, true );
                    }
                } );

                el.addEventListener( 'mouseup', function(ev) {
                    ev = ev || window.event;

                    if ( (ev.which || ev.button) === 1 && isDown ) {
                        ev.preventDefault();
                    
                        isDown = false;
                        fun.call( el, ev, false );
                    }
                } );

                return el;
            } ;

    var touchy = window['touchy'] = {
            click: clickBuilder,
            press: pressBuilder,
            hold : holdBuilder
    }
})();
