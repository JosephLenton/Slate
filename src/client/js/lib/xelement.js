"use strict";

/**
 * The higher level DOM alternative, SweetSpot.
 * It wraps doms, allowing you to do slightly more.
 *
 * It is intended that you would extend this,
 * to create your own nodes.
 */
window['SweetSpot'] = (function() {
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
    var EventsManager = function( xe ) {
        this.xe = xe;
        this.events = {};

        var self = this;
        this.handleEvent = function( ev ) {
            self.fireDomEvent( ev.name, ev );
        }
    }

    EventsManager.prototype = {
        register: function( name, f ) {
            if ( name instanceof Array ) {
                for ( var i = 0; i < name.length; i++ ) {
                    this.register( name, f );
                }
            } else {
                if ( this.events.hasOwnProperty(name) ) {
                    this.events[name].push( f );
                } else {
                    ss.on( xe.getDom(), name, this.handleEvent );
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

        once: function( name, f ) {
            var self = this;
            var fun = function(ev) {
                self.unregister( fun );
                return f.call( this, ev );
            }

            this.register( name, fun );
        },

        fireEvent: function( name, args ) {
            var evs = this.events[name],
                xe  = this.xe;

            for ( var i = 0; i < evs.length; i++ ) {
                if ( evs[i].apply(xe, args) === false ) {
                    return;
                }
            }
        },

        fireDomEvent: function( name, ev ) {
            var evs = this.events[name],
                xe  = this.xe;

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

    var removeOne = function( self, selfDom, node ) {
        if ( node instanceof SweetSpot ) {
            var nodeParent = node.parent();

            if ( nodeParent === null ) {
                logError( "removing node which does not have a parent", node );
            } else if ( nodeParent !== self ) {
                logError( "removing node which is not a child of this node", node );
            }

            var nodeDom = node.dom();
            nodeDom.parentNode.removeChild( nodeDom );
        } else if ( node instanceof HTMLElement ) {
            if ( node.parentNode !== selfDom ) {
                logError( "removing HTMLElement which is not a child of this node", node );
            } else {
                delete node.__xe;
                node.parentNode.removeChild( nodeDom );
            }
        } else {
            logError( "removing unsupported element", node );
        }
    }

    var SweetSpot = function( domType ) {
        var dom;

        if ( arguments.length === 0 ) {
            dom = ss.div();
        } else {
            dom = ss.createArray( domType, arguments, 1 );
        }

        this.__xeEvents = null;
        this.__xeDom    = dom ;
    }

    SweetSpot.events = function() {
        var methods = {};

        for ( var i = 0; i < arguments.length; i++ ) {
            var name = arguments[i];
            methods[name] = new Function( "f", "return this.on('" + name + "', f);" );
        }

        return this.extends( methods );
    }

    SweetSpot.prototype = {
        parent: function( f ) {
            if ( arguments.length === 0 ) {
                for (
                        var upDom = this.getDom().parentNode; 
                        upDom !== null;
                        upDom = upDom.parentNode;
                ) {
                    if ( upDom.__xe !== null ) {
                        return upDom.__xe;
                    }
                }

                return null;
            } else {
                if ( f instanceof Function ) {
                    var p = this.parent();

                    if ( p !== null ) {
                        f.call( this, p );
                    }

                    return this;
                } else {
                    logError( "invalid parameter given", f );
                }
            }
        },

        add: function() {
            ss.addArray( this.dom, arguments, 0 );

            return this;
        },

        /**
         * Replaces this node with the one given,
         * or replaces one child with another.
         */
        replace: function( oldNode, newNode ) {
            if ( arguments.length === 1 ) {
                var parent = this.parent();
                assert( parent, "replacing this element, when it has no parent" );
                parent.replace( this, arguments[0] );
            } else if ( arguments.length === 2 ) {
                var oldDom, newDom;
                if ( oldNode instanceof HTMLElement ) {
                    oldDom = oldNode;
                } else if ( oldNode instanceof SweetSpot ) {
                    oldDom = oldNode.dom();
                } else {
                    logError( "unknown 'oldNode' given", oldNode );
                }

                var newDom = ss( newNode );

                var dom = this.dom();
                assert( oldDom.parentNode === dom , "removing node which is not a child of this element" );
                assert( newDom.parentNode === null, "adding node which is already a child of another" );

                oldDom.parentNode.replaceChild( newDom, oldDom );
            } else {
                logError( "too many, or not enough, parameters provided", arguments );
            }

            return this;
        },

        /**
         * remove()
         *
         *  Removes this from it's parent DOM node.
         *
         * remove( node )
         *
         *  Removes the node given, from this.
         *  If it is not found, then an error is raised.
         */
        remove: function() {
            if ( arguments.length === 0 ) {
                var dom = this.__xeDom;
                assert( dom.parentNode !== null, "removing this when it has no parent" );

                dom.parentNode.removeChild( dom );
            } else {
                for ( var i = 0; i < arguments.length; i++ ) {
                    removeOne( this, this.__xeDom, arguments[i] );
                }
            }

            return this;
        },
             
        unregister: function( es, f ) {
            if ( this.__xeEvents !== null ) {
                this.__xeEvents.unregister( es, f );
            }

            return this;
        },

        fire: function( name ) {
            if ( this.__xeEvents !== null ) {
                var args = new Array( arguments.length-1 );

                for ( var i = 0; i < args.length; i++ ) {
                    args[i] = arguments[i+1];
                }

                this.__xeEvents.fireEvent( name, args );
            }

            return this;
        },

        /**
         * 
         */
        on: function( es, f ) {
            assertFunction( es, "no event name(s) provided" );
            assertFunction( f, "no function provided" );

            if ( this.__xeEvents === null ) {
                this.__xeEvents = new EventsManager( this );
            }

            this.__xeEvents.register( es, f );

            return this;
        },

        dom: function( newDom ) {
            if ( arguments.length === 0 ) {
                return this.__xeDom;
            } else {
                if ( this.__xeDom !== newDom ) {
                    delete this.__xeDom.__xe;

                    this.__xeDom = ss.createArray( arguments[0], arguments, 1 );
                    this.__xeDom.__xe = this;
                }

                return this;
            }
        },

        html: function() {
            if ( arguments.length === 0 ) {
                return this.__xeDom.innerHTML;
            } else {
                ss.htmlArray( this.__xeDom, arguments );

                return this;
            }
        },

        attr: function( obj, val ) {
            if ( arguments.length === 1 ) {
                if ( isString(obj) ) {
                    return ss.attr( obj );
                } else {
                    ss.attr( obj );

                    return this;
                }
            } else {
                ss.attr( obj, val );
            }

            return this;
        },

        addClass: function() {
            ss.addClassArray( this.__xeDom, arguments );
            return this;
        },

        setClass: function() {
            ss.setClassArray( this.__xeDom, arguments );
            return this;
        },

        hasClass: function( klass ) {
            return ss.hasClass( this.__xeDom, klass );
        },
       
        removeClass: function() {
            ss.removeClassArray( this.__xeDom, arguments );
            return this;
        },

        toggle: function( klass, onExists, onRemove ) {
            var argsLen = arguments.length;

            if ( argsLen === 1 ) {
                ss.toggle( klass );
            } else if ( argsLen === 2 ) {
                ss.toggle( klass, onExists.bind(this) );
            } else if ( argsLen === 3 ) {
                ss.toggle( klass, onExists.bind(this), onRemove.bind(this) );
            } else {
                throw new Error( "invalid parameters given" );
            }

            return this;
        }
    }

    return SweetSpot;
})();
