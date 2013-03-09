
# Clavier
@author Joseph Lenton

A virtual keyboard for tablets, with a few extra programming centric additions.
These include

 - a numpad
 - more symbols
 - symbols are in blocks (similar to a numpad)
 - move left/right on text

===============================================================================

    var AUDIO_KEYBOARD_CLICK_SRC = '/keyboard-click.wav';
    var DEFAULT_POSITION = '300px';



-------------------------------------------------------------------------------

### addRow

A helper function; given an array, this will create a new button, and add it to
that row.

-------------------------------------------------------------------------------

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
            logError( "invalid parameters", args );
        }

        var key = bb.a('clavier-key', klass, { html: html, click: fun } );

        bb.add( row, key );

        return key;
    }



-------------------------------------------------------------------------------

## Inner Key Pane

Inside the left/right key panes, there are a set of rows, holding the keys.
This is that set of rows.

@param klass An extra, optional css class, for this pane.

-------------------------------------------------------------------------------

    var InnerKeyPane = (function(klass) {
        BBGun.call(this, 'clavier-keys-inner', klass || '');

        this.add(
                this.superTop = bb('clavier-keys-row super-top'),
                this.top    = bb('clavier-keys-row top'),
                this.middle = bb('clavier-keys-row middle'),
                this.bottom = bb('clavier-keys-row bottom')
        )
    }).extend( BBGun, {



-------------------------------------------------------------------------------

### 

-------------------------------------------------------------------------------

        addSuperTop: function( html, klass, fun ) {
            return addRow( this.superTop, arguments );
        },



-------------------------------------------------------------------------------

### 

-------------------------------------------------------------------------------

        addTop: function( html, klass, fun ) {
            return addRow(this.top, arguments);
        },



-------------------------------------------------------------------------------

### 

-------------------------------------------------------------------------------

        addMiddle: function( html, fun ) {
            return addRow(this.middle, arguments);
        },



-------------------------------------------------------------------------------

### 

-------------------------------------------------------------------------------

        addBottom: function( html, fun ) {
            return addRow(this.bottom, arguments);
        }
    })



-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

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
        var keys = pane.dom().querySelectorAll( '.clavier-key' );

        for ( var i = 0; i < keys.length; i++ ) {
            highlightKeyInner( keys[i], 'highlight-border' );
        }
    }

    var KeyPane = (function() {
        BBGun.call( this, 'clavier-keys' );

        this.add( 
                this.mainPane =
                        new InnerKeyPane( 'main' )
        );

        var alts = [];
        for ( var i = 0; i < arguments.length; i++ ) {
            alts.push(
                    new InnerKeyPane( arguments[i] ).
                            addTo( this )
            )
        }

        this.alts = alts;

        this.showMain();
    }).
    extend( BBGun,
        (function() {
            var newMainAltMethod = function( mainMeth, altMeth ) {
                return function( klass ) {
                    this.mainPane[mainMeth]( 'show' );

                    var found = false;
                    for ( var i = 0; i < this.alts.length; i++ ) {
                        var alt = this.alts[i];

                        if ( klass && alt.hasClass(klass) ) {
                            this.alts[i][altMeth]( 'show' );
                            found = true;
                        } else {
                            this.alts[i].removeClass( 'show' );
                        }
                    }

                    if ( klass ) {
                        assert( found, klass + ", was not found" );
                    }

                    return this;
                }
            };

            return {
                    //showMain: newMainAltMethod(    'addClass', 'removeClass' ),
                    showMain : function( klass ) {
                        this.mainPane.addClass('show');
                        highlightKeyPane( this.mainPane );

                        return this.alts.each( this, function(alt) {
                            alt.removeClass( 'show' )
                        } );
                    },

                    //showalt: newMainAltMethod( 'removeClass', 'addClass'    ),
                    showAlt  : function( klass ) {
                        return this.alts.each( this, function(alt) {
                            if ( alt.hasClass(klass) ) {
                                if ( ! alt.hasClass('show') ) {
                                    alt.addClass('show');
                                    this.mainPane.removeClass('show');

                                    highlightKeyPane( alt );
                                }
                            } else {
                                alt.removeClass( 'show' )
                            }
                        } );
                    },

                    toggleAlt: function( klass ) {
                        return this.alts.each( this, function(alt) {
                            if ( alt.hasClass(klass) ) {
                                if ( alt.hasClass('show') ) {
                                    alt.removeClass('show');
                                    this.mainPane.addClass('show');

                                    highlightKeyPane( this.mainPane );
                                } else {
                                    alt.addClass('show');
                                    this.mainPane.removeClass('show');

                                    highlightKeyPane( alt );
                                }
                            } else {
                                alt.removeClass( 'show' )
                            }
                        } );
                    }
            }
        })(),
        {



-------------------------------------------------------------------------------

### 

-------------------------------------------------------------------------------

                main: function() {
                    return this.mainPane;
                },

-------------------------------------------------------------------------------

### 

-------------------------------------------------------------------------------

                alt: function( klass ) {
                    assert( klass, "no klass name provided" );

                    for ( var i = 0; i < this.alts.length; i++ ) {
                        if ( this.alts[i].hasClass(klass) ) {
                            return this.alts[i];
                        }
                    }

                    assertUnreachable();
                }
        }
    )

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

    var setupTextMoveControlButtons = function( clavier ) {
        clavier.
                rightControl(bb.div('clavier-key-move-home'), function() {
                    // todo
                }).
                rightControl(bb.div('clavier-key-move-left'), function() {
                    // todo
                }).
                rightControl(bb.div('clavier-key-move-right'), function() {
                    // todo
                }).
                rightControl(bb.div('clavier-key-move-end'), function() {
                    // todo
                }).
                rightControl(bb.div('clavier-key-delete'), function() {
                    // todo
                })
        ;
    }

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

    var newKeyPress = function( self ) {
        return function() {
            self.inputCharacter( this.textContent );
        }
    }

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

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
                    logError( "more than 4 rows is not supported" )
                }
            }
        }

        return buttons;
    }

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

    var setupLeftKeys = function( self, pane, options ) {
        setupLeftLower( self, pane, options );

        var buttons = setupButtonKeys( self, pane,
                [ 'q', 'w', 'e', 'r', 't' ],
                [ 'a', 's', 'd', 'f', 'g' ],
                [ 'z', 'x', 'c', 'v', 'b' ]
        )

        return buttons;
    }

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

    var setupLeftLower = function( self, pane, options ) {
        pane.addSuperTop( '&#x21d0;', 'control left-node' , self.method('controlMove', 'left' ) );
        pane.addSuperTop( '&#x21d2;', 'control right-node', self.method('controlMove', 'right') );
        pane.addTop(      '&#x21d3;', 'control down-node' , self.method('controlMove', 'down' ) );
        pane.addTop(      '&#x21d1;', 'control up-node'   , self.method('controlMove', 'up'   ) );

        pane.addMiddle( 'shift', 'control shift', self.method('toggleShift') );

        pane.addBottom( '123'  , 'control numpad', self.right.method( 'toggleAlt', 'numpad' ) );

        pane.addBottom( '&amp;[]&lt;&gt;', 'control symbols-special', self.right.method('toggleAlt', 'symbols') );

        pane.addBottom( '&nbsp;', 'space', self.method('inputCharacter', ' ') );
    }

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

    var setupRightKeys = function( self, pane, options ) {
        var buttons = setupButtonKeys( self, pane,
                [ 'y', 'u', 'i', 'o', 'p' ],
                [ 'h', 'j', 'k', 'l' ],
                [ 'n', 'm', ',', '.' ]
        )

        setupRightLower( self, pane, options );

        return buttons;
    }

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

    var setupLeftSymbols = function( self, pane, options ) {
        setupLeftLower( self, pane, options );

        setupButtonKeys( self, pane,
                [  '{', '}', '`', ':', '-' ],
                [  '[', ']', '^', ';', '_' ],
                [ '\\', '~', '#', '|', '$' ]
        )
    }

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

    // missing: %
    var setupRightSymbols = function( self, pane, options ) {
        setupButtonKeys( self, pane,
                [ '!', '\'', '"', '-', '*' ],
                [ '?',  '(', ')', '+', '/' ],
                [ '=',  '<', '>', ';', ':' ]
        )

        setupRightLower( self, pane, options );
    }

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

    var setupRightNumpad = function( self, pane, options ) {
        setupButtonKeys( self, pane,
                [ '7', '8', '9', '-', '*' ],
                [ '4', '5', '6', '+', '/' ],
                [ '1', '2', '3', '0', '.' ]
        )

        setupRightLower( self, pane, options );
    }

-------------------------------------------------------------------------------

##

-------------------------------------------------------------------------------

    var setupRightLower = function( self, pane, options ) {
        pane.addSuperTop( '&#x25C4;', 'control left' , self.method('inputLeft') );

        pane.addSuperTop( '&#x25Ba;', 'control right', self.method('inputRight') );

        pane.addTop( 'back', 'control backspace', self.method( 'inputBackspace' ) );

        pane.addMiddle( 'shift', 'control shift', self.method('toggleShift') );
        
        pane.addBottom( '&nbsp;', 'space', self.method('inputCharacter', ' ') );

        pane.addBottom( '";+*/', 'control symbols-common', self.left.method('toggleAlt', 'symbols') );

        pane.addBottom( '&#x25Be;', 'control close', options.onClose );
    }

-------------------------------------------------------------------------------

## newDoubleFocusEvent

This 'double-focus', is to lose and then regain
focus artificially.

Artificial focus, closes the iOS keyboard.

-------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------

## Clavier 

This is the keyboard it's self, and what the outside world interacts with.

-------------------------------------------------------------------------------

    var Clavier = (function(options) {
        assertObject( options, "no options provided" );

        var audio = new Audio();
        audio.loop = false;
        audio.src = AUDIO_KEYBOARD_CLICK_SRC;

        this.input = null;

        this.left  = new KeyPane( 'symbols' ).addClass( 'clavier-left clavier-background' );
        this.right = new KeyPane( 'symbols', 'numpad' ).addClass( 'clavier-right clavier-background' );

        BBGun.call( this, 'clavier', this.left, this.right );

        this.lastPosition = DEFAULT_POSITION;

        var rightButtons = setupRightKeys( this, this.right.main(), options );
        var leftButtons = setupLeftKeys( this, this.left.main(), options );

        this.shiftButtons = rightButtons.concat( leftButtons );
        this.shiftDown = false;

        setupLeftSymbols( this, this.left.alt( 'symbols' ), options );

        setupRightNumpad( this, this.right.alt( 'numpad' ), options );
        setupRightSymbols( this, this.right.alt( 'symbols' ), options );

        this.focusEvent = newDoubleFocusEvent();

        this.on( 'dblclick', function(ev) {
            ev.preventDefault();
        } );
        
        var onButtonClick = function(ev) {
            if ( ev.target.classList.contains('clavier-key') ) {
                highlightKey( ev.target );
                
                audio.play();
            }

            ev.preventDefault();
        };

        this.on( 'touchend', onButtonClick );
        this.on( 'mouseup', onButtonClick );
    }).
    extend( BBGun, {

-------------------------------------------------------------------------------

### Clavier.toggleShift()

Turns the shift keys on and off.

-------------------------------------------------------------------------------

        toggleShift: function() {
            this.shiftDown = ! this.shiftDown;

            for ( var i = 0; i < this.shiftButtons.length; i++ ) {
                var button = this.shiftButtons[i];

                button.textContent = this.shiftDown ?
                        button.textContent.toUpperCase() :
                        button.textContent.toLowerCase() ;
            }
        },

-------------------------------------------------------------------------------

### Clavier.

-------------------------------------------------------------------------------

        inputLeft: function() {
            var input = this.input;

            if ( input ) {
                input.selectionEnd =
                        input.selectionStart =
                                Math.max( 0, input.selectionStart-1 );
            }
        },

-------------------------------------------------------------------------------

### Clavier.

-------------------------------------------------------------------------------

        inputRight: function() {
            var input = this.input;

            if ( input ) {
                input.selectionEnd =
                        input.selectionStart =
                                Math.max( 0, input.selectionStart+1 );
            }
        },

-------------------------------------------------------------------------------

### Clavier.inputBackspace()

Deletes text from the input, as though you hit backspace.

-------------------------------------------------------------------------------

        inputBackspace: function() {
            var input = this.input;

            if ( input ) {
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
        },

-------------------------------------------------------------------------------

### Clavier.inputCharacter( String )

Sets a new string to the end of the input. If the input has an area selected,
then it will be replaced with the string given.

The string is inserted, after the current cursor position.

-------------------------------------------------------------------------------

        inputCharacter: function( char ) {
            assert( char !== undefined, "undefined character given" );

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
                        char +
                        input.value.substring( end );

                input.selectionEnd =
                        input.selectionStart =
                                start + char.length;

                this.informInput();
            }
        },

-------------------------------------------------------------------------------

### Clavier.informInput()

Sends an event to the HTMLInput current set to this Clavier, to tell it that
it's value has been updated.

This is a HTMLEvent of type 'input'.

-------------------------------------------------------------------------------

        informInput: function() {
            if ( this.input ) {
                var event = document.createEvent("HTMLEvents");
                event.initEvent( 'input', true, true )
                this.input.dispatchEvent( event );
            }
        },

-------------------------------------------------------------------------------

### Clavier.clearInput()

Removes the HTMLInput currently stored, so this will no longer interact with
any input.

A new input would need to be set using 'setInput'.

-------------------------------------------------------------------------------

        clearInput: function() {
            this.input = null;

            return this;
        },

-------------------------------------------------------------------------------

### Clavier.setInput( HTMLInput )

Sets the input object the Clavier object will insert characters into.

@param input The new input object.

-------------------------------------------------------------------------------

        setInput: function( input ) {
            assert( input instanceof Element );

            if ( this.input !== null ) {
                this.input.removeEventListener( 'focus', this.focusEvent, true );
                this.input.blur();
            }

            this.input = input;
            this.input.addEventListener( 'focus', this.focusEvent, true );

            return this;
        },

-------------------------------------------------------------------------------

### Clavier.controlMove( "up" | "down" | "left" | "right" )

Calls the currently set control move function, with the direction given. The
direction signifies which button was pressed.

### Clavier.controlMove( fun )

Allows you to set the callback, for the movement buttons on the left side of
the clavier keyboard.

-------------------------------------------------------------------------------

        controlMove: function( fun ) {
            if ( isFunction(fun) ) {
                this.controlMoveFun = fun;
            } else if ( this.controlMoveFun ) {
                this.controlMoveFun( fun );
            }

            return this;
        },

-------------------------------------------------------------------------------

### Clavier.fixed()

When called, this makes the Clavier a fixed component, on top of the rest of 
the HTML.

-------------------------------------------------------------------------------

        fixed: function() {
            this.addClass( 'fixed' );
        },

-------------------------------------------------------------------------------

### Clavier.open()

-------------------------------------------------------------------------------

        open: function() {
            this.style('top', this.lastPosition);
        },

-------------------------------------------------------------------------------

### Clavier.close()

-------------------------------------------------------------------------------

        close: function() {
            this.style('top', '100%');
        }
    })


Finally, make the Clavier public.


    window['Clavier'] = Clavier;

