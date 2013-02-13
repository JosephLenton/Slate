"use strict";

/**
 *      xdom
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

window['xdom'] = (function() {
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

    var newXDom = function( args ) {
        /**
         * Runs 'createArray' with the values given,
         * and then returns the result.
         * 
         * This is shorthand for creating new DOM elements.
         */
        var xdom = function() {
            if (
                    this !== undefined && 
                    this !== null && 
                    this.__hasConstructed !== true &&
                    this instanceof xdom
            ) {
                return newXDom( arguments );
            } else {
                return xdom.createArray( arguments[0], arguments, 1 );
            }
        }

        xdom.__hasConstructor = true;

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
                            '        assertObj( name, "non-object given for registering" );',
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
                            '            assertFun( fun, "non-function given for function" );',
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
         * Deals with the global setup of xdom.
         *
         * For example adding more default elements.
         */
        xdom.setup = {
                data: {
                        classPrefix: '',

                        /**
                         *  Map< Element-Name, (Name) -> HTMLElement >
                         *
                         * These contain alternative names for custom elements.
                         * At the time of writing, it's just shorthand for input
                         * types. So a name with 'checkbox' returns an input box
                         * of type 'checkbox'.
                         */
                        elements: {},

                        /**
                         *  Map< Event-Name, (HTMLElement, Name, Callback) -> void >
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

        xdom.setup.
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

        xdom.util = (function() {
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
         * Helper Methods, before, xdom it's self!
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
                if ( dom instanceof HTMLElement ) {
                    dom.addEventListener( name, fun, useCapture )
                } else if ( dom instanceof Array ) {
                    for ( var i = 0; i < dom.length; i++ ) {
                        setOn( events, dom[i], name, fun, useCapture );
                    }
                }
            }
        }

        var parseClassArray = function( arr, startI ) {
            var klass = '';

            for ( var i = startI; i < arr.length; i++ ) {
                var c = arr[i];

                if ( (typeof c === 'string') || (c instanceof String) ) {
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
        xdom.on = function( dom, name, fun, useCapture ) {
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

        xdom.once = function( dom, name, fun, useCapture ) {
            // todo
        }


        /**
         *      xdom.create( html-element,
         *              info1,
         *              info2,
         *              info3,
         *              info4 ...
         *      )
         */
        xdom.create = function() {
            return this.createArray( arguments[0], arguments, 1 );
        }

        xdom.createArray = function( obj, args, i ) {
            if ( i === undefined ) {
                i = 0
            }

            return xdom.applyArray(
                    xdom.createOne( obj ),
                    args,
                    i
            )
        }

        xdom.apply = function( dom ) {
            return applyArray( this,
                    this.get( dom ),
                    arguments,
                    1
            )
        }

        xdom.applyArray = function( dom, args, startI ) {
            if ( startI === undefined ) {
                startI = 0
            }

            return applyArray( this,
                    this.get( dom ),
                    args,
                    startI
            )
        }

        var applyArray = function( xdom, dom, args, startI ) {
            var argsLen = args.length;

            for ( var i = startI; i < argsLen; i++ ) {
                var arg = args[i];

                if ( arg instanceof Array ) {
                    applyArray( this, dom, arg, 0 );
                } else if ( arg instanceof HTMLElement ) {
                    dom.appendChild( arg );
                } else if ( arg && arg.getDom !== undefined ) {
                    dom.appendChild( arg.getDom() );
                /*
                 * - html
                 * - class names
                 */
                } else if ( (typeof arg === 'string') || (arg instanceof String) ) {
                    if ( arg.trim().charAt(0) === '<' ) {
                        dom.insertAdjacentHTML( 'beforeend', arg );
                    } else {
                        xdom.addClassOne( dom, arg );
                    }
                } else if ( typeof arg === 'object' ) {
                    xdom.attr( dom, arg );
                } else {
                    error( arg, "unknown argument given" );
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
         * @return A HTMLElement based on the object given.
         */
        xdom.createOne = function( obj ) {
            /*
             * A String ...
             *  <html element="description"></html>
             *  .class-name
             *  element-name
             *  '' (defaults to a div)
             */
            if ( (typeof obj === 'string') || (obj instanceof String) ) {
                return xdom.createString( obj );
                
            /*
             * An array of classes.
             */
            } else if ( obj instanceof Array ) {
                return xdom.createString( '.' + obj.join(' ') );
            } else {
                return xdom.createObj( obj );
            }
        }

        xdom.createObj = function( obj ) {
            assertObj( obj );

            return this.attr(
                    ( obj.hasOwnProperty(TYPE_NAME_PROPERTY) ?
                                    this.createOne( obj[TYPE_NAME_PROPERTY] ) :
                                    this.createElement() ),
                    obj
            )
        }

        xdom.createString = function( obj ) {
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
         * @return A HTMLElement for the name given.
         */
        xdom.createElement = function( name ) {
            if ( arguments.length === 0 ) {
                name = DEFAULT_ELEMENT;
            } else {
                assertString( name, "non-string name provided" );
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

        xdom.hasClass = function( dom, klass ) {
            return dom.classList.contains( klass );
        } 

        xdom.removeClass = function( dom, klass ) {
            if ( dom.classList.contains(klass) ) {
                dom.classList.remove( klass );

                return true;
            } else {
                return false;
            }
        }

        /**
         * @param dom The element to add or remove the class from.
         * @param klass The klass to toggle.
         * @param onAddition Optional, a function called if the class gets added.
         * @param onRemoval Optional, a function called if the class gets removed.
         */
        xdom.toggle = function() {
            return xdom.toggleArray( arguments );
        },

        xdom.toggleArray = function( args ) {
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

        xdom.addClass = function( dom ) {
            if ( arguments.length === 2 ) {
                return this.addClassOne( dom, arguments[1] );
            } else {
                return this.addClassArray( dom, arguments, 1 );
            }
        }

        xdom.addClassArray = function( dom, args, i ) {
            assertArray( args );

            var classes = parseClassArray( args, i );

            if ( classes !== '' ) {
                var currentClasses = dom.className;

                if (
                        currentClasses === undefined ||
                        currentClasses === ''
                ) {
                    dom.className = classes;
                } else {
                    dom.className = currentClasses + ' ' + classes ;
                }
            }

            return dom;
        }

        xdom.addClassOne = function( dom, klass ) {
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

        xdom.setClass = function( dom ) {
            if ( arguments.length === 2 ) {
                dom.className = arguments[1];
                return dom;
            } else {
                return this.setClassArray( dom, arguments, 1 );
            }
        }

        xdom.setClassArray = function( dom, args, i ) {
            assertArray( args );

            dom.className = parseClassArray(args, i);

            return dom;
        }

        xdom.style = function( dom, k, val ) {
            if ( arguments.length === 2 ) {
                if ( (typeof k === 'string') || (k instanceof String) ) {
                    return dom.style[k];
                } else if ( k instanceof Array ) {
                    for ( var i = 0; i < k.length; i++ ) {
                        this.style( dom, k[i] );
                    }
                } else if ( typeof k === 'object' ) {
                    for ( var i in k ) {
                        if ( k.hasOwnProperty(i) ) {
                            this.style( dom, i, k[i] );
                        }
                    }
                }
            } else if ( arguments.length === 3 ) {
                if ( (typeof k === 'string') || (k instanceof String) ) {
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

        xdom.get = function( dom ) {
            if ( (typeof dom === "string") || (dom instanceof String) ) {
                return document.querySelector( dom ) || null;
            } else if ( dom instanceof HTMLElement ) {
                return dom;
            } else if ( typeof dom === 'object' ) {
                return xdom.createObj(dom);
            } else {
                logError( "unknown object given", dom );
            }
        }

        var appendOne = function( dom, arg ) {
            if ( dom !== null ) {
                if ( arg instanceof Array ) {
                    for ( var i = 0; i < arg.length; i++ ) {
                        appendOne( dom, arg[i] );
                    }
                } else if ( arg instanceof HTMLElement ) {
                    dom.appendChild( arg );
                } else if ( arg && arg.getDom !== undefined ) {
                    dom.appendChild( arg.getDom() );
                } else if ( (typeof arg === 'string') || (arg instanceof String) ) {
                    dom.insertAdjacentHTML( 'beforeend', arg );
                } else if ( typeof arg === 'object' ) {
                    dom.appendChild( xdom.createObj(arg) );
                } else {
                    logError( "unknown argument given", arg );
                }
            }

            return dom;
        }

        var appendArray = function( dom, args, startI ) {
            if ( dom !== null ) {
                for ( var i = startI; i < args.length; i++ ) {
                    appendOne( dom, args[i] );
                }
            }

            return dom;
        }

        xdom.append = function( dom ) {
            if ( arguments.length === 2 ) {
                return appendOne( xdom.get(dom), arguments[1] );
            } else {
                return this.appendArray( dom, arguments, 1 );
            }
        }

        xdom.appendArray = function( dom, args, startI ) {
            if ( startI === undefined ) {
                startI = 0;
            }

            return appendArray( xdom.get(dom), args, startI );
        }

        /**
         * Sets the HTML content within this element.
         */
        xdom.html = function( dom ) {
            return this.htmlArray( dom, arguments, 1 );
        }

        xdom.htmlOne = function( dom, el ) {
            assert( el, "given element is not valid" );

            if ( (typeof el === 'string') || (el instanceof String) ) {
                dom.innerHTML = el;
            } else if ( el instanceof HTMLElement ) {
                dom.appendChild( el );
            } else if ( el.getDom !== undefined ) {
                dom.appendChild( el.getDom() );
            } else if ( el instanceof Array ) {
                this.htmlArray( dom, el, 0 );
            } else if ( isObject(el) ) {
                dom.appendChild(
                        this.describe(el)
                );
            } else {
                logError( "Unknown html value given", el );
            }

            return dom;
        }

        xdom.htmlArray = function( dom, htmls, i ) {
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

                if ( typeof el === 'string' || (el instanceof String) ) {
                    content += el;
                } else if ( el instanceof Array ) {
                    this.htmlArray( dom, el, 0 );
                } else {
                    if ( content !== '' ) {
                        dom.insertAdjacentHTML( 'beforeend', content );
                        content = '';
                    }

                    if ( el instanceof HTMLElement ) {
                        dom.appendChild( el );
                    } else if ( el instanceof XElement ) {
                        dom.appendChild( el.getDom() );
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
        xdom.text = function( dom ) {
            return this.textArray( dom, arguments, 1 );
        }

        xdom.textOne = function( dom, text ) {
            if ( text instanceof Array ) {
                this.textArray( dom, text, 0 );
            } else if ( typeof text === 'string' || (text instanceof String) ) {
                dom.textContent = text;
            } else {
                logError( "none string given for text content", text );
            }

            return dom;
        }

        xdom.textArray = function( dom, args, startI ) {
            if ( startI === undefined ) {
                startI = 0;
            }

            for ( var i = startI; i < args.length; i++ ) {
                this.textOne( dom, args[i] );
            }

            return dom;
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
        xdom.attr = function( dom, obj, val ) {
            if ( arguments.length === 1 ) {
                if ( (typeof obj === 'string') || (obj instanceof String) ) {
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
                }
            } else if ( arguments.length === 2 ) {
                var events = this.setup.data.events;
                var textHtml = false;

                for ( var k in obj ) {
                    if ( obj.hasOwnProperty(k) ) {
                        if ( k === TYPE_NAME_PROPERTY ) {
                            /* do nothing */
                        } else if ( k === 'className' ) {
                            this.setClass( dom, obj.className );
                        } else if ( k === 'stop' ) {
                            this.stop( dom, obj.stop );
                        } else if ( k === 'on' ) {
                            this.on( dom, obj.on );
                        } else if ( k === 'once' ) {
                            this.once( dom, obj.once );
                        } else if ( k === 'id' ) {
                            dom.id = obj.id;
                        } else if ( k === 'style' ) {
                            this.style( dom, obj.style );
                        } else if ( k === 'text' ) {
                            this.textOne( dom. obj.text );

                            if ( textHtml ) {
                                logError( "cannot use text and html at the same time", obj );
                            }
                            textHtml = true;
                        } else if ( k === 'html' ) {
                            this.htmlOne( dom, obj.html );

                            if ( textHtml ) {
                                logError( "cannot use text and html at the same time", obj );
                            }
                            textHtml = true;
                        } else if ( k === 'value' ) {
                            dom.value = obj
                        } else if ( events.hasOwnProperty(k) ) {
                            var eventFun = events[k];
                            eventFun( dom, obj[k] );
                        } else if ( HTML_EVENTS.hasOwnProperty(k) ) {
                            setOn( events, dom, k, obj[k], false )
                        } else {
                            dom.setAttribute( k, obj[k] );
                        }
                    }
                }
            } else {
                dom[obj] = val;
            }

            return dom;
        }

        for ( var k in HTML_ELEMENTS ) {
            if ( HTML_ELEMENTS.hasOwnProperty(k) ) {
                if ( xdom.hasOwnProperty(k) ) {
                    console.log( 'xdom function clash: ' + k );
                } else {
                    xdom[k] = new Function( "return this.createArray('" + k + "', arguments, 0);" );
                }
            }
        }

        return xdom;
    }

    return newXDom();
})();
