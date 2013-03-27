"use strict";

(function() {
    /* 
      ============================================================================= 
        # Clavier
        @author Joseph Lenton

        A virtual keyboard for tablets, with a few extra programming centric 
        additions. 
        
        These include:

         - a numpad
         - more symbols
         - symbols are in blocks (similar to a numpad)
         - move left/right on text

      ==============================================================================
    */

    var ENABLE_AUDIO = false;

    var AUDIO_KEYBOARD_CLICK_SRC = './keyboard-click.wav',
        NUM_AUDIO_SOUNDS = 5;

    var DEFAULT_POSITION = 'translate3d(0, -300px, 0)';

    var Audios = function( src, count ) {
        this.audios = new Array( count );

        for ( var i = 0; i < count; i++ ) {
            var audio = new Audio();

            audio.loop = false;
            audio.preload = 'auto';
            audio.src = src;

            this.audios[i] = audio;
        }

        this.offset = 0;
    }

    Audios.prototype.play = function() {
        this.audios[ this.offset ].play();
        this.offset = (this.offset + 1) % this.audios.length;

        return this;
    }

    var newElement = function( type, klass ) {
        var el = document.createElement( type );
        if ( type === 'a' ) {
            el.setAttribute('href', '#');
        }

        el.className = klass || '';

        return el;
    }

    /*
    -------------------------------------------------------------------------------

     ### addRow

    A helper function; given an array, this will create a new button, and add it to
    that row.

    ------------------------------------------------------------------------------- 
    */

    var addRow = function( row, args ) {
        var html,
            fun,
            klass = '';

        if ( args.length === 2 ) {
            html  = args[0];
            fun   = args[1];
        } else if ( args.length === 3 ) {
            html  = args[0];
            klass = args[1];
            fun   = args[2];
        } else {
            throw new Error( "invalid parameters");
        }

        var key = newElement( 'a', 'clavier-key ' + klass );
        touchy.click( key, fun );
        key.innerHTML = html;

        row.appendChild( key );

        return key;
    }



    /*
    -------------------------------------------------------------------------------
    
     ## Inner Key Pane
    
    Inside the left/right key panes, there are a set of rows, holding the keys.
    This is that set of rows.
    
    @param klass An extra, optional css class, for this pane.
    
    ------------------------------------------------------------------------------- */

    var InnerKeyPane = function(klass) {
        this.dom = newElement( 'div', 'clavier-keys-inner ' + (klass || '') );

        this.superTop = newElement('div', 'clavier-keys-row super-top');
        this.top      = newElement('div', 'clavier-keys-row top');
        this.middle   = newElement('div', 'clavier-keys-row middle');
        this.bottom   = newElement('div', 'clavier-keys-row bottom');

        this.dom.appendChild( this.superTop );
        this.dom.appendChild( this.top );
        this.dom.appendChild( this.middle );
        this.dom.appendChild( this.bottom );
    }

    InnerKeyPane.prototype = {



    /*
    -------------------------------------------------------------------------------
    
     ### 
    
    ------------------------------------------------------------------------------- */

        addSuperTop: function( html, klass, fun ) {
            return addRow( this.superTop, arguments );
        },



    /*
    -------------------------------------------------------------------------------
    
     ### 
    
    ------------------------------------------------------------------------------- */

        addTop: function( html, klass, fun ) {
            return addRow(this.top, arguments);
        },



    /*
     -------------------------------------------------------------------------------

     ### 

     -------------------------------------------------------------------------------
     */

        addMiddle: function( html, fun ) {
            return addRow(this.middle, arguments);
        },



    /*
     -------------------------------------------------------------------------------

     ### 

     -------------------------------------------------------------------------------
     */

        addBottom: function( html, fun ) {
            return addRow(this.bottom, arguments);
        }
    }



    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    var highlightKey = function( key ) {
        highlightKeyInner( key, 'highlight' );
    }

    var highlightKeyInner = function( key, klass ) {
        if ( ! key.classList.contains(klass) ) {
            key.classList.add( klass );

            setTimeout( function() {
                key.classList.remove( klass )
            }, 100 );
        }
    }

    var highlightKeyPane = function( pane ) {
        var keys = pane.dom.querySelectorAll( '.clavier-key' );

        for ( var i = 0; i < keys.length; i++ ) {
            highlightKeyInner( keys[i], 'highlight-border' );
        }
    }

    var KeyPane = (function() {
        this.dom = newElement( 'div', 'clavier-keys' );

        this.mainPane = new InnerKeyPane( 'main' );
        this.dom.appendChild( this.mainPane.dom );

        var alts = [];
        for ( var i = 0; i < arguments.length; i++ ) {
            var innerPane = new InnerKeyPane( arguments[i] );
            this.dom.appendChild( innerPane.dom );

            alts.push( innerPane );
        }

        this.alts = alts;

        this.showMain();
    });
    KeyPane.prototype = {
            showMain : function( klass ) {
                this.mainPane.dom.classList.add('show');
                highlightKeyPane( this.mainPane );

                this.alts.forEach( function(alt) {
                    alt.dom.classList.remove( 'show' )
                } );

                return this;
            },

            showAlt  : function( klass ) {
                var self = this;

                this.alts.forEach( function(alt) {
                    if ( alt.dom.classList.contains(klass) ) {
                        if ( ! alt.dom.classList.contains('show') ) {
                            alt.dom.classList.add('show');
                            self.mainPane.dom.classList.remove('show');

                            highlightKeyPane( alt );
                        }
                    } else {
                        alt.dom.classList.remove( 'show' )
                    }
                } );
            },

            toggleAlt: function( klass ) {
                var self = this;

                this.alts.forEach( function(alt) {
                    if ( alt.dom.classList.contains(klass) ) {
                        if ( alt.dom.classList.contains('show') ) {
                            alt.dom.classList.remove('show');
                            self.mainPane.dom.classList.add('show');

                            highlightKeyPane( self.mainPane );
                        } else {
                            alt.dom.classList.add('show');
                            self.mainPane.dom.classList.remove('show');

                            highlightKeyPane( alt );
                        }
                    } else {
                        alt.dom.classList.remove( 'show' )
                    }
                } );

                return this;
            },



    /*
     -------------------------------------------------------------------------------

     ### 

     -------------------------------------------------------------------------------
     */

            main: function() {
                return this.mainPane;
            },

    /*
     -------------------------------------------------------------------------------

     ### 

     -------------------------------------------------------------------------------
     */

            alt: function( klass ) {
                for ( var i = 0; i < this.alts.length; i++ ) {
                    if ( this.alts[i].dom.classList.contains(klass) ) {
                        return this.alts[i];
                    }
                }
            }
    }

    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    var newKeyPress = function( self ) {
        return function() {
            self.inputCharacter( this.textContent );
        }
    }

    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    var setupButtonKeys = function( self, pane ) {
        var buttons = [];

        var argsStart = 2;
        for ( var i = argsStart; i < Math.min(arguments.length, argsStart+3); i++ ) {
            var row = arguments[i];

            for ( var j = 0; j < row.length; j++ ) {
                var k = row[j];

                var fun = newKeyPress( self );

                if ( i === argsStart ) {
                    buttons.push( pane.addSuperTop( k, fun ) );
                } else if ( i === argsStart+1 ) {
                    buttons.push( pane.addTop( k, fun ) );
                } else if ( i === argsStart+2 ) {
                    buttons.push( pane.addMiddle( k, fun ) );
                } else if ( i === argsStart+3 ) {
                    buttons.push( pane.addBottom( k, fun ) );
                } else {
                    throw new Error( "more than 4 rows is not supported" )
                }
            }
        }

        return buttons;
    }

    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    var setupLeftKeys = function( self, pane, options ) {
        setupLeftLower( self, pane, options );

        var buttons = setupButtonKeys( self, pane,
                [ 'q', 'w', 'e', 'r', 't' ],
                [ 'a', 's', 'd', 'f', 'g' ],
                [ 'z', 'x', 'c', 'v', 'b' ]
        )

        return buttons;
    }

    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    var setupLeftLower = function( self, pane, options ) {
        pane.addSuperTop( '&#x21d0;', 'control left-node' , function() {
            self.controlMove( 'left' );
        });
        pane.addSuperTop( '&#x21d2;', 'control right-node', function() {
            self.controlMove( 'right');
        });
        pane.addTop(      '&#x21d3;', 'control down-node' , function() {
            self.controlMove( 'down' );
        });
        pane.addTop(      '&#x21d1;', 'control up-node'   , function() {
            self.controlMove( 'up'   );
        });

        pane.addMiddle( 'shift', 'control shift', function() {
            self.toggleShift();
        });

        pane.addBottom( '123'  , 'control numpad', function() {
            self.right.toggleAlt( 'numpad' );
        });

        pane.addBottom( '";+*/', 'control symbols-common', function() {
            self.right.toggleAlt( 'symbols');
        });

        pane.addBottom( '&nbsp;', 'space', function() {
            self.inputCharacter( ' ');
        });
    }

    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    var setupRightKeys = function( self, pane, options ) {
        var buttons = setupButtonKeys( self, pane,
                [ 'y', 'u', 'i', 'o', 'p' ],
                [ 'h', 'j', 'k', 'l' ],
                [ 'n', 'm', ',', '.' ]
        )

        setupRightLower( self, pane, options );

        return buttons;
    }

    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    var setupLeftSymbols = function( self, pane, options ) {
        setupLeftLower( self, pane, options );

        setupButtonKeys( self, pane,
                [  '{', '}', '`', ':', '-' ],
                [  '[', ']', '^', ';', '_' ],
                [ '\\', '~', '#', '|', '$' ]
        )
    }

    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    // missing: %
    var setupRightSymbols = function( self, pane, options ) {
        setupButtonKeys( self, pane,
                [ '!', '\'', '"', '-', '*' ],
                [ '?',  '(', ')', '+', '/' ],
                [ '=',  '<', '>', ';', ':' ]
        )

        setupRightLower( self, pane, options );
    }

    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    var setupRightNumpad = function( self, pane, options ) {
        setupButtonKeys( self, pane,
                [ '7', '8', '9', '-', '*' ],
                [ '4', '5', '6', '+', '/' ],
                [ '1', '2', '3', '0', '.' ]
        )

        setupRightLower( self, pane, options );
    }

    /*
     -------------------------------------------------------------------------------

     ##

     -------------------------------------------------------------------------------
     */

    var setupRightLower = function( self, pane, options ) {
        pane.addSuperTop( '&#x25C4;', 'control left', function() {
            self.inputLeft();
        });

        pane.addSuperTop( '&#x25Ba;', 'control right', function() {
            self.inputRight();
        });

        pane.addTop( 'back', 'control backspace', function() {
            self.inputBackspace();
        });

        pane.addMiddle( 'shift', 'control shift', function() {
            self.toggleShift();
        });
        
        pane.addBottom( '&nbsp;', 'space', function() {
            self.inputCharacter(' ');
        });

        pane.addBottom( '&amp;[]&lt;&gt;', 'control symbols-special', function() {
            self.left.toggleAlt('symbols');
        });

        pane.addBottom( '&#x25Be;', 'control close', function() {
            self.close();
        } );
    }

    /*
    -------------------------------------------------------------------------------

     ## newDoubleFocusEvent

    This 'double-focus', is to lose and then regain
    focus artificially.

    Artificial focus, closes the iOS keyboard.

    -------------------------------------------------------------------------------
    */

    var newDoubleFocusEvent = function() {
        var isDoubleFocusing = false;

        return function(ev) {
            var self = this;

            if ( isDoubleFocusing ) {
                isDoubleFocusing = false;
                return;
            } else {
                var self = this;

                setTimeout( function() {
                    document.activeElement.blur();
                    document.body.focus();

                    isDoubleFocusing = true;
                    setTimeout(function() {
                        self.focus();
                    });
                }, 0 );
            }
        }
    }

    /*
    -------------------------------------------------------------------------------

     ## Clavier 

    This is the keyboard it's self, and what the outside world interacts with.

     ### Options:

        - onClose, run when the 'close' method is called. This includes pressing
          the close button on the keyboard.

        - onOpen, run when this is asked to open.

        - onInput, called when a character is hit on the keyboard.

        - onBackspace, called when the backspace key is hit.

        If you return 'false' from 'onClose' or 'onOpen', then those methods
        default behaviour will be skipped entirely. This is to allow you to have
        custom open/close behaviour.

    -------------------------------------------------------------------------------
    */

    var Clavier = (function(options) {
        this.isOpenFlag = false;

        if ( arguments.length > 0 ) {
            if ( ! options ) {
                throw new Error( "no options provided" );
            }
        } else {
            options = {};
        }

        this.onCloseFun = options.onClose || null;
        this.onOpenFun  = options.onOpen  || null;
        this.onInputFun = options.onInput || null;
        this.onBackspaceFun = options.onBackspace || null;

        var audio = ENABLE_AUDIO ?
                new Audios( AUDIO_KEYBOARD_CLICK_SRC, NUM_AUDIO_SOUNDS ) :
                null ;

        this.input = null;

        this.left  = new KeyPane( 'symbols' );
        this.left.dom.classList.add( 'clavier-left' );
        this.left.dom.classList.add( 'clavier-background' );

        this.right = new KeyPane( 'symbols', 'numpad' )
        this.right.dom.classList.add( 'clavier-right' );
        this.right.dom.classList.add( 'clavier-background' );

        this.dom = newElement( 'div', 'clavier' );
        this.dom.appendChild( this.left.dom );
        this.dom.appendChild( this.right.dom );

        this.lastPosition = DEFAULT_POSITION;

        var rightButtons = setupRightKeys( this, this.right.main(), options );
        var leftButtons = setupLeftKeys( this, this.left.main(), options );

        this.shiftButtons = rightButtons.concat( leftButtons );
        this.shiftDown = false;

        setupLeftSymbols( this, this.left.alt( 'symbols' ), options );

        setupRightNumpad( this, this.right.alt( 'numpad' ), options );
        setupRightSymbols( this, this.right.alt( 'symbols' ), options );

        this.focusEvent = newDoubleFocusEvent();

        this.dom.addEventListener( 'dblclick', function(ev) {
            ev.preventDefault();
        } );
        
        var onButtonClick = function(ev) {
            if ( ev.target.classList.contains('clavier-key') ) {
                if ( audio !== null ) {
                    audio.play();
                }

                highlightKey( ev.target );
            }

            ev.preventDefault();
        };

        this.dom.addEventListener( 'touchend', onButtonClick );
        this.dom.addEventListener( 'mouseup', onButtonClick );
    });

    Clavier.prototype = {
        getDom: function() {
            return this.dom;
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.toggleShift()

    Turns the shift keys on and off.

    -------------------------------------------------------------------------------
    */

        toggleShift: function() {
            this.shiftDown = ! this.shiftDown;

            for ( var i = 0; i < this.shiftButtons.length; i++ ) {
                var button = this.shiftButtons[i];

                button.textContent = this.shiftDown ?
                        button.textContent.toUpperCase() :
                        button.textContent.toLowerCase() ;
            }
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.

    -------------------------------------------------------------------------------
    */

        inputLeft: function() {
            var input = this.input;

            if ( input ) {
                input.selectionEnd =
                        input.selectionStart =
                                Math.max( 0, input.selectionStart-1 );
            }
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.

    -------------------------------------------------------------------------------
    */

        inputRight: function() {
            var input = this.input;

            if ( input ) {
                input.selectionEnd =
                        input.selectionStart =
                                Math.max( 0, input.selectionStart+1 );
            }
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.inputBackspace()

    Deletes text from the input, as though you hit backspace.

    -------------------------------------------------------------------------------
    */

        inputBackspace: function() {
            if ( this.onBackspaceFun ) {
                if ( this.onBackspaceFun.call(this) === false ) {
                    return this;
                }
            }

            var input = this.input;

            if ( input && input.value !== '' ) {
                var start = input.selectionStart,
                    end = input.selectionEnd;

                if ( start === end ) {
                    if ( start > 0 ) {
                        input.value =
                                input.value.substring( 0, start-1 ) +
                                input.value.substring( start );
                    }
                } else {
                    if ( start > end ) {
                        var temp = start;
                        start = end;
                        end = temp;
                    }

                    input.value =
                            input.value.substring( 0, start ) +
                            input.value.substring( end );
                }

                input.selectionEnd =
                        input.selectionStart = start;

                this.informInput();
            }

            return this;
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.inputCharacter( String )

    Sets a new string to the end of the input. If the input has an area selected,
    then it will be replaced with the string given.

    The string is inserted, after the current cursor position.

    -------------------------------------------------------------------------------
    */

        inputCharacter: function( c ) {
            if ( c === undefined ) {
                throw new Error( "undefined character given" );
            }

            if ( this.onInputFun ) {
                if ( this.onInputFun.call(this, c) === false ) {
                    return this;
                }
            }

            var input = this.input;

            if ( input ) {
                var start = input.selectionStart,
                    end   = input.selectionEnd;

                if ( start > end ) {
                    var temp = start;
                    start = end;
                    end = temp;
                }

                input.value =
                        input.value.substring( 0, start ) +
                        c +
                        input.value.substring( end );

                input.selectionEnd =
                        input.selectionStart =
                                start + c.length;

                this.informInput();
            }

            return this;
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.informInput()

    Sends an event to the HTMLInput current set to this Clavier, to tell it that
    it's value has been updated.

    This is a HTMLEvent of type 'input'.

    -------------------------------------------------------------------------------
    */

        informInput: function() {
            if ( this.input ) {
                var event = document.createEvent("HTMLEvents");
                event.initEvent( 'input', true, true )
                this.input.dispatchEvent( event );
            }
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.clearInput()

    Removes the HTMLInput currently stored, so this will no longer interact with
    any input.

    A new input would need to be set using 'setInput'.

    -------------------------------------------------------------------------------
    */

        clearInput: function() {
            this.input = null;

            return this;
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.setInput( HTMLInput )

    Sets the input object the Clavier object will insert characters into.

    @param input The new input object.

    -------------------------------------------------------------------------------
    */

        setInput: function( input ) {
            if ( !(input instanceof Element) ) {
                throw new Error("non-element given");
            }

            if ( this.input !== null ) {
                this.input.removeEventListener( 'focus', this.focusEvent, true );
                this.input.blur();
            }

            this.input = input;
            this.input.addEventListener( 'focus', this.focusEvent, true );

            return this;
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.controlMove( "up" | "down" | "left" | "right" )

    Calls the currently set control move function, with the direction given. The
    direction signifies which button was pressed.

     ### Clavier.controlMove( fun )

    Allows you to set the callback, for the movement buttons on the left side of
    the clavier keyboard.

    -------------------------------------------------------------------------------
    */

        controlMove: function( fun ) {
            if ( isFunction(fun) ) {
                this.controlMoveFun = fun;
            } else if ( this.controlMoveFun ) {
                this.controlMoveFun( fun );
            }

            return this;
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.fixed()

    When called, this makes the Clavier a fixed component, on top of the rest of 
    the HTML.

    -------------------------------------------------------------------------------
    */

        fixed: function() {
            this.dom.classList.add( 'fixed' );

            return this;
        },

        isOpen: function() {
            return this.isOpenFlag;
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.open()

    -------------------------------------------------------------------------------
    */

        open: function() {
            if ( this.onOpenFun ) {
                if ( this.onOpenFun() === false ) {
                    return this;
                }
            }

            if ( ! this.isOpenFlag ) {
                this.isOpenFlag = true;
                this.dom.style.transform = this.dom.style.WebkitTransform = this.lastPosition;
            }

            return this;
        },

    /*
    -------------------------------------------------------------------------------

     ### Clavier.close()

    -------------------------------------------------------------------------------
    */

        close: function() {
            if ( this.onCloseFun ) {
                if ( this.onCloseFun(this.isOpenFlag) === false ) {
                    return this;
                }
            }

            if ( this.isOpenFlag ) {
                this.isOpenFlag = false;

                this.lastPosition = this.dom.style.transform || this.dom.style.WebkitTransform;
                this.dom.style.transform = this.dom.style.WebkitTransform = 'translate3d(0, 0, 0)' ;
            }

            return this;
        },

        toggle: function() {
            if ( this.isOpen() ) {
                this.close();
            } else {
                this.open();
            }

            return this;
        },

        attach: function() {
            this.fixed();

            if ( document.body ) {
                document.body.appendChild( this.getDom() );
            } else {
                var self = this;

                setTimeout( function() {
                    document.body.appendChild( self.getDom() );
                }, 1 );
            }

            return this;
        }
    };


    /*
     * Finally, make the Clavier public.
     */

    window['Clavier'] = Clavier;
})();

