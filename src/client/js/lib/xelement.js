"use strict";

/**
 * The higher level DOM alternative, xelement.
 * It wraps doms, allowing you to do slightly more.
 *
 * It is intended that you would extend this,
 * to create your own nodes.
 */
window['XElement'] = (function() {
    var prepEvent = function( ev ) {
        ev.doPropagate = false;
        ev.propagate = function() {
            this.doPropagate = true;
        }
    }

    /**
     * The event handler.
     *
     * It works in two levels:
     *  - events do *not* propagate to parents by default.
     *  - events are passed to those on the same level, unless they return false.
     */
    var XElementEvents = function( xe ) {
        this.xe = xe;
        this.events = {};
    }

    XElementEvents.prototype = {
        register: function( name, f ) {
            var self = this;

            if ( this.events.hasOwnProperty(name) ) {
                this.events[name].push( f );
            } else {
                xdom.on( xe.getDom(), name, function(ev) {
                    self.call( name, ev );
                } );
            }

            return {
                    cancel: function() {
                        self.unregister( name, f )
                    }
            }
        },

        unregister: function( name, fun ) {
            if ( this.events.hasOwnProperty(name) ) {
                var evs = this.events[name];

                for ( var i = 0; i < evs.length; i++ ) {
                    if ( evs[i] === fun ) {
                        evs.splice( i, 1 );

                        return true;
                    }
                }
            }

            return false;
        },

        call: function( name, ev ) {
            var evs = this.events[name];
            prepEvent( ev );

            for ( var i = 0; i < evs.length; i++ ) {
                if ( evs[i].call(xe, ev) === false ) {
                    ev.stopPropagation();
                    return;
                }
            }

            if ( ! ev.doPropagate ) {
                ev.stopPropagation();
            }
        }
    }

    var XElement = function( domType ) {
        var dom;

        if ( arguments.length === 0 ) {
            dom = xdom.div();
        } else {
            dom = xdom.createArray( domType, arguments, 1 );
        }
    }

    XElement.prototype = {
        parent: function() {
            // todo
        },

        add: function() {
            // todo
        },

        remove: function() {
            // todo
        },

        replace: function() {
            // todo
        },

        on: function() {
            // todo
        },

        dom: function( newDom ) {
            if ( arguments.length === 0 ) {
                return this.domObj;
            } else {
                if ( this.domObj !== newDom ) {
                    this.domObj = xdom.createArray( arguments[0], arguments, 1 );
                }

                return this;
            }
        },

        html: function() {
            if ( arguments.length === 0 ) {
                return this.domObj.innerHTML;
            } else {
                xdom.htmlArray( domObj, arguments );

                return this;
            }
        },

        attr: function( obj, val ) {
            if ( arguments.length === 1 ) {
                if ( isString(obj) ) {
                    return xdom.attr( obj );
                } else {
                    xdom.attr( obj );

                    return this;
                }
            } else {
                xdom.attr( obj, val );
            }

            return this;
        },

        addClass: function() {
            xdom.addClassArray( this.domObj, arguments );
            return this;
        },

        setClass: function() {
            xdom.setClassArray( this.domObj, arguments );
            return this;
        },

        hasClass: function( klass ) {
            return xdom.hasClass( this.domObj, klass );
        },
       
        removeClass: function() {
            xdom.removeClass( this.domObj, arguments );
            return this;
        }

        toggle: function( klass, onExists, onRemove ) {
            var argsLen = arguments.length;

            if ( argsLen === 1 ) {
                xdom.toggle( klass );
            } else if ( argsLen === 2 ) {
                xdom.toggle( klass, onExists.bind(this) );
            } else if ( argsLen === 3 ) {
                xdom.toggle( klass, onExists.bind(this), onRemove.bind(this) );
            } else {
                throw new Error( "invalid parameters given" );
            }

            return this;
        },
    }

    return XElement;
})();
