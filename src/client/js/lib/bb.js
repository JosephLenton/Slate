"use strict";

/**
 *      bb.js
 *
 * @author Joseph Lenton
 * 
 * This is a set of dom creation, and interaction, functions.
 * It aims to provide a more rich API than the standard
 * document API, with very little overhead added on top.
 * 
 * This does no DOM wrapping, or other functionality like that,
 * it mostly takes information to create a dom element which
 * is returned, or alter a given dom element.
 */

window['bb'] = (function() {
    /**
     * When the type of an element is not declared,
     * it will be of this type by default.
     */
    var DEFAULT_ELEMENT = 'div';

    var TYPE_NAME_PROPERTY = 'nodeName';

    var listToMap = function() {
        var elements = {};

        for ( var i = 0; i < arguments.length; i++ ) {
            var el = arguments[i];

            assert( ! elements.hasOwnProperty(el), "duplicate entry found in list '" + el + "'" );
            elements[ el ] = true;
        }

        return elements;
    }

    var HTML_ELEMENTS = listToMap(
            'a',
            'abbr',
            'address',
            'area',
            'article',
            'aside',
            'audio',
            'b',
            'base',
            'bdi',
            'bdo',
            'blockquote',
            'body',
            'br',
            'button',
            'canvas',
            'caption',
            'cite',
            'code',
            'col',
            'colgroup',
            'data',
            'datalist',
            'dd',
            'del',
            'details',
            'dfn',
            'dialog',
            'div',
            'dl',
            'dt',
            'em',
            'embed',
            'fieldset',
            'figcaption',
            'figure',
            'footer',
            'form',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'head',
            'header',
            'hgroup',
            'hr',
            'html',
            'i',
            'iframe',
            'img',
            'input',
            'ins',
            'kbd',
            'keygen',
            'label',
            'legend',
            'li',
            'link',
            'map',
            'mark',
            'menu',
            'menuitem',
            'meta',
            'meter',
            'nav',
            'noscript',
            'object',
            'ol',
            'optgroup',
            'option',
            'output',
            'p',
            'param',
            'pre',
            'progress',
            'q',
            'rp',
            'rt',
            'ruby',
            's',
            'samp',
            'script',
            'section',
            'select',
            'small',
            'source',
            'span',
            'strong',
            'style',
            'sub',
            'summary',
            'sup',
            'table',
            'tbody',
            'td',
            'textarea',
            'tfoot',
            'th',
            'thead',
            'time',
            'title',
            'tr',
            'track',
            'u',
            'ul',
            'var',
            'video',
            'wbr'
    )

    var HTML_EVENTS = listToMap(
            /* CSS Events */
            'transitionend',
            'animationstart',
            'animationend',
            'animationiteration',

            /* Touch Events */
            'touchstart',
            'touchend',
            'touchmove',
            'touchcancel',

            /* Drag n' Drop Events */
            'drag',
            'dragstart',
            'dragend',
            'dragover',
            'dragenter',
            'dragleave',
            'drop',

            /* HTML5 Events (minus those which are also L3) */
            'afterprint',
            'beforeprint',
            'beforeunload',
            'change',
            'contextmenu',
            'DOMContentLoaded',
            'hashchange',
            'input',
            'invalid',
            'message',
            'offline',
            'online',
            'pagehide',
            'pageshow',
            'popstate',
            'readystatechange',
            'reset',
            'show',
            'submit',
                
            /* L3 Dom Events */
            'DOMActivate',
            'load',
            'unload',
            'abort',
            'error',
            'select',
            'resize',
            'scroll',

            'blur',
            'DOMFocusIn',
            'DOMFocusOut',
            'focus',
            'focusin',
            'focusout',

            'click',
            'dblclick',
            'mousedown',
            'mouseenter',
            'mouseleave',
            'mousemove',
            'mouseover',
            'mouseout',
            'mouseup',

            'wheel',

            'keydown',
            'keypress',
            'keyup',

            'compositionstart',
            'compositionupdate',
            'compositionend',

            'DOMAttrModified',
            'DOMCharacterDataModified',
            'DOMNodeInserted',
            'DOMNodeInsertedIntoDocument',
            'DOMNodeRemoved',
            'DOMNodeRemovedFromDocument',
            'DOMSubtreeModified'
    )

    var ensureParent = function( dom ) {
        var parentNode = dom.parentNode;
        assert( parentNode !== null, "dom is not in the document; it doesn't have a parentNode" );
        return parentNode;
    }

    var newBB = function( args ) {
        /**
         * Runs 'createArray' with the values given,
         * and then returns the result.
         * 
         * This is shorthand for creating new DOM elements.
         */
        var bb = function() {
            if (
                    this !== undefined && 
                    this !== null && 
                    this.__hasConstructed !== true &&
                    this instanceof bb
            ) {
                return newBB( arguments );
            } else {
                return bb.createArray( arguments[0], arguments, 1 );
            }
        }

        bb.__hasConstructor = true;

        /**
         * Generates a register method.
         *
         * We generate it, so we can avoid the cost of passing
         * in a callback method.
         *
         * @param methodName The name of this method (for internal recursive calls).
         * @param methodNameOne The name of the callback to perform, on this object.
         */
        var newRegisterMethod = function( methodName, methodNameOne ) {
            return new Function( "name", "fun", [
                            '    var argsLen = arguments.length;',
                            '    ',
                            '    if ( argsLen === 1 ) {',
                            '        assertObject( name, "non-object given for registering" );',
                            '        ',
                            '        for ( var k in name ) {',
                            '            if ( name.hasOwnProperty(k) ) {',
                            '                this.' + methodName + '( k, name[k] );',
                            '            }',
                            '        }',
                            '    } else if ( argsLen === 2 ) {',
                            '        if ( name instanceof Array ) {',
                            '            for ( var i = 0; i < name.length; i++ ) {',
                            '                this.' + methodName + '( name[i], fun );',
                            '            }',
                            '        } else {',
                            '            assertString( name, "non-string given for name" );',
                            '            assertFunction( fun, "non-function given for function" );',
                            '            ',
                            '            this.' + methodNameOne + '( name, fun );',
                            '        }',
                            '    } else if ( argsLen === 0 ) {',
                            '        logError( "no parameters given" )',
                            '    } else {',
                            '        var names = new Array( argsLen-1 );',
                            '        fun = arguments[ argsLen-1 ];',
                            '        ',
                            '        for ( var i = 0; i < argsLen-1; i++ ) {',
                            '            names[i] = arguments[i];',
                            '        }',
                            '        ',
                            '        this.' + methodName + '( names, fun );',
                            '    }',
                            '    ',
                            '    return this;',
                    ].join("\n")
            )
        }

        /**
         * Deals with the global setup of bb.
         *
         * For example adding more default elements.
         */
        bb.setup = {
                data: {
                        classPrefix: '',

                        /**
                         *  Map< Element-Name, (Name) -> Element >
                         *
                         * These contain alternative names for custom elements.
                         * At the time of writing, it's just shorthand for input
                         * types. So a name with 'checkbox' returns an input box
                         * of type 'checkbox'.
                         */
                        elements: {},

                        /**
                         *  Map< Event-Name, (Element, Name, Callback) -> void >
                         *
                         * Holds mappings of event names, to the functions that
                         * define them.
                         */
                        events  : {}
                },

                /**
                 * Allows you to get or set a prefix,
                 * which is appended before all class names,
                 * when a class is set to this.
                 *
                 *      classPrefix() -> String
                 *      classPrefix( prefix ) -> this
                 */
                classPrefix: function( prefix ) {
                    if ( arguments.length === 0 ) {
                        return this.data.prefix;
                    } else {
                        this.data.prefix = prefix;
                        return this;
                    }
                },

                /**
                 * Registers event building functions.
                 *
                 * This allows you to over-write existing event defining,
                 * or add entirely new ones.
                 *
                 * For example, you could over-write 'click' for touch devices,
                 * or add new events such as 'taponce'.
                 */
                event: newRegisterMethod( 'event', 'eventOne' ),

                eventOne: function( name, fun ) {
                    this.data.events[ name ] = fun;
                },

                /**
                 * Allows registering new types of elements.
                 *
                 * When you build an 'a', you get an anchor.
                 * When you create a 'div', you get a div.
                 *
                 * This allows you to add to this list.
                 * For example 'button' is added, to return
                 * an <input type="button">.
                 *
                 * You can use this to create generic components,
                 * such as 'video', 'menu', and other components.
                 *
                 * @param name The name for the component.
                 * @param fun A function callback which creates, and returns, the element.
                 */
                element: newRegisterMethod( 'element', 'elementOne' ),
                
                elementOne: function( name, fun ) {
                    this.data.elements[ name ] = fun;
                }
        }

        bb.setup.
                element( 'a', function() {
                    var anchor = document.createElement('a');
                    anchor.setAttribute( 'href', '#' );
                    return anchor;
                } ).
                element( [
                                'button',
                                'checkbox',
                                'color',
                                'date',
                                'datetime',
                                'datetime-local',
                                'email',
                                'file',
                                'hidden',
                                'image',
                                'month',
                                'number',
                                'password',
                                'radio',
                                'range',
                                'reset',
                                'search',
                                'submit',
                                'tel',
                                'text',
                                'time',
                                'url',
                                'week'
                        ],

                        function( type ) {
                            var input = document.createElement('input');
                            input.type = type;
                            return input;
                        }
                );

        bb.util = (function() {
                var element = document.createElement( 'div' );

                return {
                        htmlToElement : function( str ) {
                            element.innerHTML = str;
                            return element.childNodes[0];
                        },

                        htmlToText: function( html ) {
                            element.innerHTML = str;
                            return element.textContent;
                        }
                }
        })();

        /**
         * Helper Methods, before, bb it's self!
         */

        var setOnObject = function( events, dom, obj, useCapture ) {
            for ( var k in obj ) {
                if ( obj.hasOwnProperty(k) ) {
                    setOn( events, dom, k, obj[k], useCapture )
                }
            }
        }

        var setOn = function( events, dom, name, fun, useCapture ) {
            if ( name instanceof Array ) {
                for ( var i = 0; i < name.length; i++ ) {
                    setOn( events, dom, name, fun, useCapture );
                }
            } else {
                if ( dom instanceof Element ) {
                    dom.addEventListener( name, fun, useCapture )
                } else if ( dom instanceof Array ) {
                    for ( var i = 0; i < dom.length; i++ ) {
                        setOn( events, dom[i], name, fun, useCapture );
                    }
                }
            }
        }

        var iterateClasses = function( args, i, fun ) {
            for ( ; i < args.length; i++ ) {
                var arg = args[i];

                if ( isString(arg) ) {
                    assertString( arg, "expected string for add DOM class" );

                    if ( arg.indexOf(' ') !== -1 ) {
                        var klasses = arg.split( ' ' );

                        for ( var j = 0; j < klasses.length; j++ ) {
                            if ( fun(arg) === false ) {
                                break;
                            }
                        }
                    } else {
                        fun( arg );
                    }
                } else if ( isArray(arg) ) {
                    iterateClasses( arg, 0, fun );
                } else {
                    logError( "invalid parameter", arg );
                }
            }
        }

        var parseClassArray = function( arr, startI ) {
            var klass = '';

            for ( var i = startI; i < arr.length; i++ ) {
                var c = arr[i];

                if ( isString(c) ) {
                    klass += ' ' + c;
                } else if ( c instanceof Array ) {
                    klass += parseClassArray( c, 0 );
                } else {
                    logError( 'unknown class given', c );
                }
            }

            return klass;
        }

        /**
         * Sets events to be run on this element.
         *
         * # Examples
         *
         *      on( dom, "click"                        , fun, true  )
         *      on( dom, "click"                        , fun        )
         *
         *      on( dom, ["mouseup", "mousedown"]       , fun, false )
         *      on( dom, ["mouseup", "mousedown"]       , fun        )
         *
         *      on( dom, { click: fun, mousedown: fun } , true       )
         *      on( dom, { click: fun, mousedown: fun }              )
         */
        bb.on = function( dom, name, fun, useCapture ) {
            var argsLen = arguments.length;

            if ( argsLen === 4 ) {
                setOn( this.setup.data.events, dom, name, fun, useCapture )
            } else if ( argsLen === 3 ) {
                if ( fun === true ) {
                    setOnObject( this.setup.data.events, dom, name, true )
                } else if ( fun === false ) {
                    setOnObject( this.setup.data.events, dom, name, false )
                } else {
                    setOn( this.setup.data.events, dom, name, fun, false )
                }
            } else if ( argsLen === 2 ) {
                setOnObject( this.setup.data.events, dom, name, false )
            } else {
                logError( "unknown parameters given", arguments )
            }

            return dom;
        }

        bb.once = function( dom, name, fun, useCapture ) {
            var self = this;

            var funWrap = function() {
                self.unregister( dom, name, funWrap );
                return fun.apply( this, arguments );
            }

            return this.on( don, name, funWrap, useCapture );
        }

        /**
         *      bb.create( html-element,
         *              info1,
         *              info2,
         *              info3,
         *              info4 ...
         *      )
         */
        bb.create = function() {
            return this.createArray( arguments[0], arguments, 1 );
        }

        bb.createBBGun = function( bbGun, obj, args, i ) {
            if ( i === undefined ) {
                i = 0
            }

            return applyArray(
                    this,
                    bbGun,
                    bb.createOne( obj ),
                    args,
                    i
            )
        }

        bb.createArray = function( obj, args, i ) {
            if ( i === undefined ) {
                i = 0
            }

            return applyArray(
                    this,
                    null,
                    bb.createOne( obj ),
                    args,
                    i
            )
        }

        bb.apply = function( dom ) {
            return applyArray(
                    this,
                    null,
                    this.get( dom ),
                    arguments,
                    1
            )
        }

        bb.applyArray = function( dom, args, startI ) {
            if ( startI === undefined ) {
                startI = 0
            }

            return applyArray(
                    this,
                    null,
                    this.get( dom ),
                    args,
                    startI
            )
        }

        var applyArray = function( bb, bbGun, dom, args, startI ) {
            var argsLen = args.length;

            for ( var i = startI; i < argsLen; i++ ) {
                var arg = args[i];

                if ( arg instanceof Array ) {
                    applyArray( this, bbGun, dom, arg, 0 );
                } else if ( arg instanceof Element ) {
                    dom.appendChild( arg );
                } else if ( arg.__isBBGun ) {
                    dom.appendChild( arg.dom() );
                /*
                 * - html
                 * - class names
                 */
                } else if ( isString(arg) ) {
                    var c = arg.trim().charAt( 0 );

                    if ( c === '<' ) {
                        dom.insertAdjacentHTML( 'beforeend', arg );
                    } else {
                        bb.addClassOne( dom, arg );
                    }
                } else if ( isObject(arg) ) {
                    attrObj( bb, bbGun, dom, arg );
                } else {
                    logError( "invalid argument given", arg );
                }
            }

            return dom
        }

        /**
         * Just describes the dom, based on the object given,
         * and nothing more.
         * 
         * This is mostly for internal use, where I *only*
         * want to describe a dom. I don't want any of the
         * arguments-add-class stuff.
         * 
         * @param obj A JavaScript object literal describing an object to create.
         * @return A Element based on the object given.
         */
        bb.createOne = function( obj ) {
            /*
             * A String ...
             *  <html element="description"></html>
             *  .class-name
             *  element-name
             *  '' (defaults to a div)
             */
            if ( isString(obj) ) {
                return bb.createString( obj );
                
            /*
             * An array of classes.
             */
            } else if ( obj instanceof Array ) {
                if ( obj.length > 0 ) {
                    if ( obj[0].charAt(0) === '.' ) {
                        return bb.createString( obj.join(' ') );
                    } else {
                        return bb.createString( '.' + obj.join(' ') );
                    }
                } else {
                    return bb.createElement();
                }
            } else if ( obj instanceof Element ) {
                return obj;
            } else if ( obj.__isBBGun ) {
                return obj;
            } else if ( isObject(obj) ) {
                return bb.createObj( obj );
            } else {
                logError( "unknown parameter given", obj );
            }
        }

        bb.createObj = function( obj ) {
            assertObject( obj );

            var dom = obj.hasOwnProperty(TYPE_NAME_PROPERTY)      ?
                    this.createElement( obj[TYPE_NAME_PROPERTY] ) :
                    this.createElement()                          ;

            for ( var k in obj ) {
                if ( obj.hasOwnProperty(k) ) {
                    attrOne( this, null, dom, k, obj[k] );
                }
            }

            return dom;
        }

        bb.createString = function( obj ) {
            obj = obj.trim();

            /*
             * It's a HTML element.
             */
            if ( obj.charAt(0) === '<' ) {
                var dom = htmlToElement( obj );

                if ( dom === undefined ) {
                    logError( "invalid html given", obj );
                } else {
                    return dom;
                }
            } else if ( obj.charAt(0) === '.' ) {
                var dom = this.createElement();
                dom.className = obj.substring(1)
                return dom;
            } else if ( obj === '' ) {
                return this.createElement();
            } else {
                return this.createElement( obj )
            }
        }

        /**
         * Creates just an element, of the given name.
         * 
         * What makes this special is that it also hooks into
         * the provided names, such as 'button' as shorthand
         * the input with type button.
         * 
         * @param name The name of the component to create.
         * @return A Element for the name given.
         */
        bb.createElement = function( name ) {
            if ( arguments.length === 0 ) {
                name = DEFAULT_ELEMENT;
            } else {
                assertString( name, "non-string name provided for nodeName", name );
                assert( name !== '', "empty name provided" );
            }

            var setup = this.setup.data.elements[ name ];

            if ( this.setup.data.elements.hasOwnProperty(name) ) {
                return this.setup.data.elements[name]();
            } else if ( HTML_ELEMENTS.hasOwnProperty(name) ) {
                return document.createElement( name );
            } else {
                return this.setClass(
                        document.createElement( DEFAULT_ELEMENT ),
                        name
                )
            }
        }

        bb.hasClass = function( dom, klass ) {
            return dom.classList.contains( klass );
        } 

        bb.hasClassArray = function( dom, klasses, i ) {
            if ( i === undefined ) {
                i = 0;
            }

            var isRemoved = false;
            iterateClasses( klasses, i, function(klass) {
                if ( ! isRemoved && dom.classList.contains(klass) ) {
                    isRemoved = true;
                    return false;
                }
            } )

            return isRemoved;
        }

        bb.removeClass = function( dom ) {
            return bb.removeClassArray( dom, arguments, 1 );
        }

        bb.removeClassArray = function( dom, klasses, i ) {
            if ( i === undefined ) {
                i = 0;
            }

            iterateClasses( klasses, i, function(klass) {
                dom.classList.remove( klass );
            } )

            return dom;
        }

        /**
         * @param dom The element to add or remove the class from.
         * @param klass The klass to toggle.
         * @param onAddition Optional, a function called if the class gets added.
         * @param onRemoval Optional, a function called if the class gets removed.
         */
        bb.toggle = function() {
            return this.toggleArray( arguments );
        },

        bb.toggleArray = function( args ) {
            var argsLen   = args.length;

            var dom        = this.get( args[0] ),
                klass      = args[1],
                onAddition = args[2],
                onRemoval  = args[3];

            if ( argsLen < 1 ) {
                logError( "not enough arguments provided" );
            } else {
                var wasAdded = dom.classList.toggle( klass );

                if ( argsLen === 3 && wasAdded ) {
                    onAddition( dom );
                } else if ( argsLen === 4 ) {
                    if ( wasAdded ) {
                        onAddition( dom );
                    } else {
                        onRemoval( dom );
                    }
                }
            }

            return dom;
        },

        bb.addClass = function( dom ) {
            if ( arguments.length === 2 ) {
                return this.addClassOne( dom, arguments[1] );
            } else {
                return this.addClassArray( dom, arguments, 1 );
            }
        }

        bb.addClassArray = function( dom, args, i ) {
            assertArray( args );

            if ( i === undefined ) {
                i = 0;
            }

            iterateClasses( args, i, function(klass) {
                dom.classList.add( klass );
            } )

            return dom;
        }

        bb.addClassOne = function( dom, klass ) {
            if ( klass.indexOf(' ') === -1 ) {
                dom.classList.add( klass );
            } else {
                var klassParts = klass.split( ' ' );

                for ( var i = 0; i < klassParts.length; i++ ) {
                    var part = klassParts[i];

                    if ( part !== '' ) {
                        dom.classList.add( part );
                    }
                }
            }

            return dom;
        }

        bb.setClass = function( dom ) {
            if ( arguments.length === 2 ) {
                dom.className = arguments[1];
                return dom;
            } else {
                return this.setClassArray( dom, arguments, 1 );
            }
        }

        bb.setClassArray = function( dom, args, i ) {
            assertArray( args );

            if ( i === undefined ) {
                i = 0;
            }

            var str = '';
            iterateClasses( args, i, function(klass) {
                str += ' ' + klass;
            } )

            dom.className = str;

            return dom;
        }

        bb.style = function( dom, k, val ) {
            if ( arguments.length === 2 ) {
                if ( isString(k) ) {
                    return dom.style[k];
                } else if ( k instanceof Array ) {
                    for ( var i = 0; i < k.length; i++ ) {
                        this.style( dom, k[i] );
                    }
                } else if ( isObject(k) ) {
                    for ( var i in k ) {
                        if ( k.hasOwnProperty(i) ) {
                            this.style( dom, i, k[i] );
                        }
                    }
                }
            } else if ( arguments.length === 3 ) {
                if ( isString(k) ) {
                    dom.style[k] = val;
                } else if ( k instanceof Array ) {
                    for ( var i = 0; i < k.length; i++ ) {
                        this.style( dom, k[i], val );
                    }
                }
            } else {
                logError( "unknown object given", arguments );
            }

            return dom;
        }

        bb.get = function( dom ) {
            if ( (typeof dom === "string") || (dom instanceof String) ) {
                return document.querySelector( dom ) || null;
            } else if ( dom instanceof Element ) {
                return dom;
            } else if ( isObject(dom) ) {
                return this.createObj( dom );
            } else if ( dom && dom.__isBBGun ) {
                return dom.dom()
            } else {
                logError( "unknown object given", dom );
            }
        }

        var beforeOne = function( bb, parentDom, dom, arg ) {
            if ( dom !== null ) {
                if ( arg instanceof Array ) {
                    for ( var i = 0; i < arg.length; i++ ) {
                        beforeOne( bb, parentDom, dom, arg[i] );
                    }
                } else if ( arg instanceof Element ) {
                    parentDom.insertBefore( arg, dom );
                } else if ( arg.__isBBGun ) {
                    parentDom.insertBefore( arg.dom(), dom );
                } else if ( isString(arg) ) {
                    dom.insertAdjacentHTML( 'beforebegin', arg );
                } else if ( isObject(arg) ) {
                    parentDom.insertBefore( bb.createObj(arg), dom );
                } else {
                    logError( "invalid argument given", arg );
                }
            }

            return dom;
        }

        var afterOne = function( bb, parentDom, dom, arg ) {
            if ( dom !== null ) {
                if ( arg instanceof Array ) {
                    for ( var i = 0; i < arg.length; i++ ) {
                        afterOne( bb, parentDom, dom, arg[i] );
                    }
                } else if ( arg instanceof Element ) {
                    parentDom.insertAfter( arg, dom );
                } else if ( arg.__isBBGun ) {
                    parentDom.insertAfter( arg.dom(), dom );
                } else if ( isString(arg) ) {
                    dom.insertAdjacentHTML( 'afterend', arg );
                } else if ( isObject(arg) ) {
                    parentDom.insertAfter( bb.createObj(arg), dom );
                } else {
                    logError( "invalid argument given", arg );
                }
            }

            return dom;
        }

        bb.beforeOne = function( dom, node ) {
            var dom = bb.get( dom );
            var parentDom = ensureParent( dom );

            return beforeOne( this, parentDom, dom, node );
        }

        bb.afterOne = function( dom, node ) {
            var dom = bb.get( dom );
            var parentDom = ensureParent( dom );

            return afterOne( this, parentDom, dom, node );
        }

        bb.beforeArray = function( dom, args, i ) {
            if ( i === undefined ) {
                i = 0;
            }

            var dom = bb.get( dom );
            var parentDom = ensureParent( dom );

            for ( ; i < args.length; i++ ) {
                beforeOne( this, parentDom, dom, args[i] );
            }

            return dom;
        }

        bb.afterArray = function( dom, args, i ) {
            if ( i === undefined ) {
                i = 0;
            }

            var dom = bb.get( dom );
            var parentDom = ensureParent( dom );

            for ( ; i < args.length; i++ ) {
                afterOne( this, parentDom, dom, node );
            }

            return dom;
        }

        bb.before = function( dom ) {
            return this.beforeArray( dom, arguments, 1 );
        }

        bb.after = function( dom ) {
            return this.afterArray( dom, arguments, 1 );
        }

        var addOne = function( bb, dom, arg ) {
            if ( dom !== null ) {
                if ( arg instanceof Array ) {
                    for ( var i = 0; i < arg.length; i++ ) {
                        addOne( bb, dom, arg[i] );
                    }
                } else if ( arg instanceof Element ) {
                    dom.appendChild( arg );
                } else if ( arg.__isBBGun ) {
                    dom.appendChild( arg.dom() );
                } else if ( isString(arg) ) {
                    dom.insertAdjacentHTML( 'beforeend', arg );
                } else if ( isObject(arg) ) {
                    dom.appendChild( bb.createObj(arg) );
                } else {
                    logError( "invalid argument given", arg );
                }
            }

            return dom;
        }

        var addArray = function( bb, dom, args, startI ) {
            if ( dom !== null ) {
                for ( var i = startI; i < args.length; i++ ) {
                    addOne( bb, dom, args[i] );
                }
            }

            return dom;
        }

        bb.add = function( dom ) {
            if ( arguments.length === 2 ) {
                return addOne( this, this.get(dom), arguments[1] );
            } else {
                return this.addArray( dom, arguments, 1 );
            }
        }

        bb.addArray = function( dom, args, startI ) {
            if ( startI === undefined ) {
                startI = 0;
            }

            return addArray( bb, this.get(dom), args, startI );
        }

        /**
         * Sets the HTML content within this element.
         */
        bb.html = function( dom ) {
            return this.htmlArray( dom, arguments, 1 );
        }

        bb.htmlOne = function( dom, el ) {
            assert( el, "given element is not valid" );

            if ( isString(el) ) {
                dom.innerHTML = el;
            } else if ( el instanceof Element ) {
                dom.appendChild( el );
            } else if ( el.__isBBGun ) {
                dom.appendChild( el.dom() )
            } else if ( el instanceof Array ) {
                this.htmlArray( dom, el, 0 )
            } else if ( isObject(el) ) {
                dom.appendChild( this.describe(el) )
            } else {
                logError( "Unknown html value given", el );
            }

            return dom;
        }

        bb.htmlArray = function( dom, htmls, i ) {
            assertArray( htmls, "non-array object was given" );

            if ( i === undefined ) {
                i = 0;
            }

            /*
             * Content is cached, so multiple HTML strings
             * are inserted once.
             */
            var content = '',
                children = [];
            for ( ; i < htmls.length; i++ ) {
                var el = htmls[i];

                if ( isString(el) ) {
                    content += el;
                } else if ( el instanceof Array ) {
                    this.htmlArray( dom, el, 0 );
                } else {
                    if ( content !== '' ) {
                        dom.insertAdjacentHTML( 'beforeend', content );
                        content = '';
                    }

                    if ( el instanceof Element ) {
                        dom.appendChild( el );
                    } else if ( el.__isBBGun ) {
                        dom.appendChild( el.dom() );
                    } else if ( isObject(el) ) {
                        dom.appendChild(
                                this.describe(el)
                        );
                    }
                }
            }

            if ( content !== '' ) {
                dom.insertAdjacentHTML( 'beforeend', content );
            }

            return dom;
        }

        /**
         * Sets the text content within this dom,
         * to the text values given.
         */
        bb.text = function( dom ) {
            return this.textArray( dom, arguments, 1 );
        }

        bb.textOne = function( dom, text ) {
            if ( text instanceof Array ) {
                this.textArray( dom, text, 0 );
            } else if ( isString(text) ) {
                dom.textContent = text;
            } else {
                logError( "none string given for text content", text );
            }

            return dom;
        }

        bb.textArray = function( dom, args, startI ) {
            if ( startI === undefined ) {
                startI = 0;
            }

            for ( var i = startI; i < args.length; i++ ) {
                this.textOne( dom, args[i] );
            }

            return dom;
        }

        var attrOne = function( bb, bbGun, dom, k, val, classesAreElements ) {
            if ( classesAreElements && k.charAt(0) === '.' ) {
                var descDom;

                if ( val instanceof Element ) {
                    descDom = bb.addClassOne( val, k )
                } else if ( val.__isBBGun ) {
                    descDom = bb.addClassOne( val.dom(), k )
                } else if ( isObject(val) ) {
                    descDom = bb.addClassOne( bb(val), k )
                } else {
                    descDom = bb.createElement( 'div' );
                    descDom.className = k.substring( 1 );

                    if ( isString(val) ) {
                        descDom.innerHTML = val;
                    } else if ( val instanceof Array ) {
                        descDom = bb.applyArray( descDom, val, 1 );
                    } else {
                        logError( "invalid item given as objects contents, for " + k, val );
                    }
                }

                dom.appendChild( descDom );
            } else if ( k === TYPE_NAME_PROPERTY ) {
                /* do nothing */
            } else if ( k === 'className' ) {
                bb.setClass( dom, val );
            } else if ( k === 'stop' ) {
                bb.stop( dom, val );
            } else if ( k === 'on' ) {
                bb.on( dom, val );
            } else if ( k === 'once' ) {
                bb.once( dom, val );
            } else if ( k === 'id' ) {
                dom.id = val
            } else if ( k === 'style' ) {
                bb.style( dom, val );
            } else if ( k === 'text' ) {
                bb.textOne( dom. val );
            } else if ( k === 'html' ) {
                bb.htmlOne( dom, val );
            } else if ( k === 'value' ) {
                dom.value = val

            /* Events */

            /* custom new event */
            } else if ( bb.setup.data.events.hasOwnProperty(k) ) {
                if ( bbGun !== null ) {
                    bbGun.on( k, val );
                } else {
                    var eventFun = bb.setup.data.events[k];
                    eventFun( dom, val );
                }
            /* a HTML event */
            } else if ( HTML_EVENTS.hasOwnProperty(k) ) {
                if ( bbGun !== null ) {
                    bbGun.on( k, val );
                } else {
                    dom.addEventListener( k, val, false )
                }
            /* legal BBGun Event */
            } else if ( bbGun !== null && bbGun.__proto__.__eventList[k] === true ) {
                bbGun.on( k, val );

            /* Arribute */
            } else {
                assertLiteral( val, "setting an object to a DOM attribute (probably a bug)," + k, k, val )
                dom.setAttribute( k, val );
            }
        }

        var attrObj = function( bb, bbGun, dom, obj ) {
            var hasHTMLText = false;

            for ( var k in obj ) {
                if ( obj.hasOwnProperty(k) ) {
                    if ( k === 'text' || k === 'html' ) {
                        if ( hasHTMLText ) {
                            logError( "cannot use text and html at the same time", obj );
                        } else {
                            hasHTMLText = true;
                        }
                    }

                    attrOne( bb, bbGun, dom, k, obj[k], false );
                }
            }
        }

        /**
         * # Special Properties
         *
         *  - on, events
         *  - className
         *  - id
         *  - style
         *  - html
         *  - text
         */
        bb.attr = function( dom, obj, val ) {
            if ( arguments.length === 2 ) {
                if ( isString(obj) ) {
                    if ( obj === 'className' || obj === 'class' ) {
                        return dom.className;
                    } else if ( obj === 'value' ) {
                        return obj.value;
                    } else if ( obj === 'id' ) {
                        return dom.id;
                    } else if ( obj === 'html' ) {
                        return dom.innerHTML;
                    } else if ( obj === 'text' ) {
                        return dom.textContent;
                    } else if ( obj === 'style' ) {
                        return dom.style;
                    } else if ( obj === TYPE_NAME_PROPERTY ) {
                        return dom.nodeName;
                    } else {
                        return dom.getAttribute( obj );
                    }
                } else if ( isObject(obj) ) {
                    attrObj( this, null, dom, obj );
                } else {
                    logError( "invalid parameter given", obj );
                }
            } else if ( arguments.length === 3 ) {
                assertString( obj, "non-string given as key for attr", obj );
                attrOne( this, null, dom, obj, val, false );
            } else {
                if ( arguments.length < 2 ) {
                    throw new Error( "not enough parameters given" );
                } else {
                    throw new Error( "too many parameters given" );
                }
            }

            return dom;
        }

        for ( var k in HTML_ELEMENTS ) {
            if ( HTML_ELEMENTS.hasOwnProperty(k) ) {
                if ( bb.hasOwnProperty(k) ) {
                    console.log( 'BB-Gun function clash: ' + k );
                } else {
                    bb[k] = new Function( "return this.createArray('" + k + "', arguments, 0);" );
                }
            }
        }

        /*
         *      Pre-provided Touch Events
         */

        var IS_TOUCH = !! ('ontouchstart' in window)  // works on most browsers 
                    || !!('onmsgesturechange' in window); // works on IE 10

        if ( IS_TOUCH ) {
            bb.setup.event({
                    click: function( el, fun ) {
                        window.jester( el ).tap( fun );
                    },

                    hold: function( el, fun ) {
                        window.jester(el).start( function(ev) {
                            fun.call( el, ev, true );
                        } )

                        window.jester(el).end( function(ev) {
                            fun.call( el, ev, false );
                        } )
                    }
            })
        } else {
            bb.setup.event({
                    hold: function( el, fun ) {
                        var isDown = false;

                        el.addEventListener( 'mousedown', function(ev) {
                            ev = ev || window.event;

                            if ( (ev.which || ev.button) === 1 ) {
                                ev.preventDefault();
                            
                                isDown = true;
                                fun.call( el, ev, true );
                            }
                        } )

                        el.addEventListener( 'mouseup', function(ev) {
                            ev = ev || window.event;

                            if ( (ev.which || ev.button) === 1 && isDown ) {
                                ev.preventDefault();
                            
                                isDown = false;
                                fun.call( el, ev, false );
                            }
                        } )
                    }
            })
        }

        return bb;
    }

    return newBB();
})();
