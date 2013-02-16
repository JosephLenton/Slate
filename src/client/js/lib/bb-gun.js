"use strict";

/**
 * The higher level DOM alternative, BB-Gun.
 * It wraps doms, allowing you to do slightly more.
 *
 * It is intended that you would extend this,
 * to create your own nodes.
 */
window['BBGun'] = (function() {
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
                    bb.on( this.xe.dom(), name, this.handleEvent );
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
                    return false;
                }
            }

            return true;
        },

        fireDomEvent: function( name, ev ) {
            var evs = this.events[name],
                xe  = this.xe;

            prepEvent( ev );

            for ( var i = 0; i < evs.length; i++ ) {
                if ( evs[i].call(xe, ev) === false ) {
                    ev.stopPropagation();
                    return false;
                }
            }

            if ( ! ev.doPropagate ) {
                ev.stopPropagation();
            }

            return true;
        }
    }

    var removeOne = function( self, selfDom, node ) {
        if ( node.__isBBGun ) {
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

    var beforeAfterChild = function( current, args, isAfter ) {
        if ( args.length >= 2 ) {
            assert( current, "falsy parameter given" );
            assert( current.parent() === this, "inserting using a child which is not within this" );

            for ( var i = 1; i < args.length; i++ ) {
                var arg = args[i];
                assert( arg, "falsy parameter given" );
                assert( arg.parent() === null, "inserting node alredy has a parent" );
            }

            if ( isAfter ) {
                bb.afterArray( current, args, 1 );
            } else {
                bb.beforeArray( current, args, 1 );
            }
        } else {
            logError( "invalid number of parameters" );
        }
    }

    var BBGun = function( domType ) {
        this.__xeEvents = null;
        this.__isBBGun  = true;
        this.__xeDom    = ( arguments.length !== 0 ) ?
                bb.createBBGun( this, domType, arguments, 1 ) :
                bb.div() ;
    }

    var duplicateEventList = function( oldList, newEvents ) {
        var eventList = {};

        for ( var k in oldList ) {
            if ( oldList.hasOwnProperty(k) ) {
                eventList[k] = true;
            }
        }

        for ( var i = 0; i < newEvents; i++ ) {
            eventList[ newEvents[i] ] = true;
        }

        return eventList;
    }

    /**
     * Extends this BBGun prototype,
     * with a new version, which includes the
     * events given.
     *
     * These events must be added, for them to be
     * legal events.
     */
    BBGun.registerEvents = function() {
        return this.override({
                __eventList: duplicateEventList( this.prototype.__eventList, arguments )
        })
    }

    /**
     * The same as 'registerEvents', only it also
     * adds no method stubs.
     *
     * If a method already exists, an error will be raised.
     */
    BBGun.events = function() {
        var methods = {};

        for ( var i = 0; i < arguments.length; i++ ) {
            var name = arguments[i];
            methods[name] = new Function( "f", "return this.on('" + name + "', f);" );
        }

        var extension = this.extends( methods );
        extension.prototype.__eventList =
                duplicateEventList( this.prototype.__eventList, arguments );

        return extension;
    }

    BBGun.prototype = {
        /**
         * A list of all 'legal' events.
         */
        __eventList: {},

        /**
         *      parent() -> BBGun | null
         *
         * Returns the BBGun parent of this object, or
         * null if this has no parent.
         *
         * @return The BBGun parent above this one,
         *         or null.
         *
         *      parent( BBGun ) -> boolean
         *
         * Given a BBGun instance, this returns true
         * if it is the parent of this object, and false
         * if not.
         *
         * @param bbgun A BBGun object to test against.
         * @return True if the BBGun given is the parent
         *         of this, otherwise false.
         *
         *      parent( (BBGun) -> any ) -> BBGun | null | any
         *
         * Given a function, it will call the function,
         * if this has a parent. If there is no parent,
         * then null is returned.
         *
         * If the function returns a value other than
         * undefined, this will be returned instead of
         * the parent.
         *
         * This means if the function returns 'false'
         * or 'null', then 'false' or 'null' will be
         * returned.
         *
         *      parent( string ) -> BBGun | null
         *
         * Given a string description of a node, this will
         * search for it, and return the first parent that
         * matches, if found.
         *
         * If not found, then this will return null.
         *
         *      parent( string, (BBGun) -> any ) -> BBGun | null | any
         *
         * This is a mix of the function and string version
         * of parent.
         */
        parent: function( f, f2 ) {
            if ( arguments.length === 0 ) {
                for (
                        var upDom = this.dom().parentNode; 
                        upDom !== null;
                        upDom = upDom.parentNode
                ) {
                    if ( upDom.__xe !== undefined && upDom.__xe !== null ) {
                        return upDom.__xe;
                    }
                }
            } else if ( arguments.length === 1 ) {
                var p = this.parent();

                if ( f instanceof Function ) {
                    if ( p !== null ) {
                        var r = f.call( this, p );

                        if ( r !== undefined ) {
                            return r;
                        }
                    }

                    return p;
                } else if ( f.__isBBGun ) {
                    return ( p === f ) ? p : null ;
                } else if ( isString(f) ) {
                    for (
                            var upDom = this.dom().parentNode; 
                            upDom !== null;
                            upDom = upDom.parentNode
                    ) {
                        if (
                                upDom.__xe !== undefined &&
                                upDom.__xe !== null &&
                                upDom.matchesSelector( f )
                        ) {
                            return upDom.__xe;
                        }
                    }
                } else {
                    logError( "invalid parameter given", f );
                }
            } else if ( arguments.length === 2 ) {
                assertFunction( f2, "second parameter is expected to be a function" );

                var p = this.parent( f );

                if ( p !== null ) {
                    var r = f2.call( this, p );

                    if ( r !== undefined ) {
                        return r;
                    } else {
                        return p;
                    }
                }
            } else {
                logError( "too many parameters given" );
            }

            return null;
        },

        /**
         *      children() -> [ BBGun ]
         *
         *      children( (BBGun) -> any ) -> [ BBGun ]
         *
         * @return An array containing all of the children of this BBGun.
         */
        children: function( f, f2 ) {
            if ( arguments.length === 0 ) {
                var bbGuns = [];
                var doms = this.dom().childNodes;

                for ( var i = 0; i < doms.length; i++ ) {
                    var dom = doms[i];
                    var bbGun = dom.__xe;

                    if ( bbGun !== undefined && bbGun !== null && bbGun.__isBBGun ) {
                        bbGuns.push( bbGun );
                    }
                }

                return bbGuns;
            } else if ( arguments.length === 1 ) {
                if ( isFunction(f) ) {
                    var guns = this.children();

                    for ( var i = 0; i < guns.length; i++ ) {
                        f.call( this, guns[i] );
                    }

                    return guns;
                } else if ( isString(f) ) {
                    assert( f !== '', "empty selector given" );

                    var bbGuns = [];
                    var doms = this.dom().childNodes;

                    for ( var i = 0; i < doms.length; i++ ) {
                        var dom = doms[i];
                        var bbGun = dom.__xe;

                        if (
                                bbGun !== undefined    &&
                                bbGun !== null         &&
                                bbGun.__isBBGun &&
                                dom.matchesSelector( f )
                        ) {
                            bbGuns.push( bbGun );
                        }
                    }

                    return bbGuns;
                } else {
                    logError( "unknown parameter given", f );
                }
            } else if ( arguments.length === 3 ) {
                assertString( f, "non string given for element selector" );
                assertFunction( f2, "non function given for function callback" );

                var guns = this.children( f );

                for ( var i = 0; i < guns.length; i++ ) {
                    f2.call( this, guns[i] );
                }

                return guns;
            } else {
                logError( "too many parameters given" );
            }

            return [];
        },

        child: function( obj, f ) {
            if ( arguments.length === 1 ) {
                if ( isString(obj) ) {
                    var child = document.querySelector( obj );

                    if ( child !== null ) {
                        if ( child.__xe ) {
                            return child.__xe;
                        } else {
                            return child;
                        }
                    }
                /*
                 * These are here as checks of existance,
                 * they are returned if found.
                 */
                } else if ( obj.__isBBGun ) {
                    // todo
                } else if ( obj instanceof Element ) {
                    // todo
                } else {
                    logError( "invalid parameter given as selector", obj );
                }
            } else if ( arguments.length === 2 ) {
                var child = this.child( obj );

                assertFunction( f, "none function given" );
                var r = f.call( this, obj );

                if ( r !== undefined ) {
                    return r;
                } else {
                    return child;
                }
            } else {
                logError( "too many parameters given" );
            }

            return null;
        },

        /**
         * Inserts the nodes given before *this* element.
         */
        before: function() {
            bb.beforeArray( this, arguments, 0 )
            return this;
        },

        /**
         * Inserts the nodes given after *this* element.
         */
        after: function() {
            bb.beforeArray( this, arguments, 0 )
            return this;
        },

        beforeChild: function( current ) {
            beforeAfterChild( current, arguments, false );
            return this;
        },

        afterChild: function( current ) {
            beforeAfterChild( current, arguments, true );
            return this;
        },

        add: function() {
            bb.addArray( this.dom(), arguments, 0 );

            return this;
        },

        /**
         * Replaces this node with the one given,
         * or replaces one child with another.
         *
         *      replace( newNode ) -> this
         *
         * Replaces this node, with the one given,
         * in the DOM.
         *
         *      replace( childNode, newNode ) -> this
         *
         * Replaces the childNode given, with the nodeNode.
         * The child must be a child of this node.
         *
         *      replace( (newNode, newDom:Element) -> any ) -> this 
         *
         * Adds a function to be called, when this node
         * is replaced by another.
         *
         * The first parameter is whatever was given, for
         * the replacement. This could be text, an object
         * description, a BBGun node, or whatever.
         *
         * The second parameter is the DOM node for that
         * newNode.
         *
         * If an Element was given, then 'newNode' and 'newDom'
         * will be identical.
         *
         * The event is called *before* the replacement.
         * This allows you to cancel the replacelement,
         * by returning false.
         */
        replace: function( oldNode, newNode ) {
            if ( arguments.length === 1 ) {
                if ( isFunction(oldNode) ) {
                    this.on( 'replace', oldNode );
                } else {
                    var parent = this.parent();
                    assert( parent, "replacing this element, when it has no parent" );
                    parent.replace( this, arguments[0] );
                }
            } else if ( arguments.length === 2 ) {
                var oldDom, newDom;
                if ( oldNode instanceof HTMLElement ) {
                    oldDom = oldNode;
                } else if ( oldNode.__isBBGun ) {
                    oldDom = oldNode.dom();
                } else {
                    logError( "unknown 'oldNode' given", oldNode );
                }

                var newDom = bb( newNode );

                var dom = this.dom();
                assert( oldDom.parentNode === dom , "removing node which is not a child of this element" );
                assert( newDom.parentNode === null, "adding node which is already a child of another" );

                if ( this.fire('replace', newNode, newDom) ) {
                    oldDom.parentNode.replaceChild( newDom, oldDom );
                }
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

                return this.__xeEvents.fireEvent( name, args );
            } else {
                return true;
            }
        },

        /**
         * 
         */
        on: function( es, f ) {
            assertString( es, "no event name(s) provided" );
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

                    this.__xeDom = bb.createArray( arguments[0], arguments, 1 );
                    this.__xeDom.__xe = this;
                }

                return this;
            }
        },

        html: function() {
            if ( arguments.length === 0 ) {
                return this.__xeDom.innerHTML;
            } else {
                bb.htmlArray( this.__xeDom, arguments );

                return this;
            }
        },

        attr: function( obj, val ) {
            if ( arguments.length === 1 ) {
                if ( isString(obj) ) {
                    return bb.attr( obj );
                } else {
                    bb.attr( obj );

                    return this;
                }
            } else {
                bb.attr( obj, val );
            }

            return this;
        },

        addClass: function() {
            bb.addClassArray( this.__xeDom, arguments );
            return this;
        },

        setClass: function() {
            bb.setClassArray( this.__xeDom, arguments );
            return this;
        },

        hasClass: function( klass ) {
            return bb.hasClass( this.__xeDom, klass );
        },
       
        removeClass: function() {
            bb.removeClassArray( this.__xeDom, arguments );
            return this;
        },

        toggle: function( klass, onExists, onRemove ) {
            var argsLen = arguments.length;

            if ( argsLen === 1 ) {
                bb.toggle( klass );
            } else if ( argsLen === 2 ) {
                bb.toggle( klass, onExists.bind(this) );
            } else if ( argsLen === 3 ) {
                bb.toggle( klass, onExists.bind(this), onRemove.bind(this) );
            } else {
                throw new Error( "invalid parameters given" );
            }

            return this;
        }
    }

    return BBGun;
})();
