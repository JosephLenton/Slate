"use strict";

(function(window) {
    var TAB_KEY     = 9,
        ENTER_KEY   = 13,
        DOWN_KEY    = 40,
        UP_KEY      = 38,
        ESCAPE_KEY  = 27;

    function UndoStack() {
        this.stack = [];
        this.index = 0;
    }

    UndoStack.prototype.add = function( cmd ) {
        if ( this.index < this.stack.length ) {
            this.index++;
            this.stack.splice( this.index, 0, cmd );
        } else {
            this.stack[this.index++] = cmd;
        }
    }

    UndoStack.prototype.backward = function() {
        console.log( this.index, this.stack.length );

        if ( this.index > 0 ) {
            this.index--;
            return this.stack[ this.index ];
        }
    }

    UndoStack.prototype.forward = function() {
        console.log( this.index, this.stack.length );

        if ( this.index < this.stack.length ) {
            this.index++;
            return this.stack[ this.index ];
        }
    }

    UndoStack.prototype.toEnd = function() {
        this.index = this.stack.length;
    }

    /**
     * The bar at the bottom of the terminal.
     */
    function TerminalBar( outerDom, execute, languages, defaultType ) {
        if ( ! outerDom ) throw new Error( 'undefined dom object given'     );
        if ( ! execute  ) throw new Error( 'undefined execute object given' );

        var dom  = slate.util.newElement( 'textarea', {
                'class' : 'slate-bar-input',
                'wrap'  : 'off'
        });
        var buttonDom = slate.util.newElement( 'a', {
                'class' : 'slate-bar-type'
        });

        outerDom.appendChild(
                slate.util.newElement( 'div', 'slate-bar', [
                        buttonDom,
                        dom,
                        slate.util.newElement( 'div', 'slate-bar-input-mark' )
                ] )
        );
        
        var langs = [],
            langI = 0;
        for ( var k in languages ) {
            if ( languages.hasOwnProperty(k) ) {
                langs.push(k);

                if ( k === defaultType ) {
                    langI = langs.length-1;
                }
            }
        }

        this.dom = dom;

        var self = this;

        var setType = function( i ) {
            if ( i >= 0 && i < langs.length ) {
                var old = langs[ langI ];
                var lang = langs[i];

                buttonDom.className = buttonDom.className.
                        replace( new RegExp('( ?)slate-lang-' + old), '' ) +
                        ' slate-lang-' + lang;

                buttonDom.textContent = lang;

                langI = i;
            }
        }

        var switchType = function(ex) {
            setType( (langI+1) % langs.length );

            ex.preventDefault();
        };

        buttonDom.addEventListener( 'click', switchType );

        setType( langI );

        var undoStack = new UndoStack();

        if ( dom ) {
            dom.addEventListener( 'keypress', function(ex) {
                if ( ex.keyCode === ENTER_KEY ) {
                    var cmd = self.dom.value;

                    execute( langs[langI], cmd, function() {
                        undoStack.add( cmd );

                        self.setText( '' );

                        self.focus();
                    });

                    ex.preventDefault();
                }
            } );

            dom.addEventListener( 'keydown', function(ex) {
                var handled = false;

                if ( ex.keyCode === UP_KEY ) {
                    handled = true;

                    var cmd = undoStack.backward();
                    if ( cmd ) {
                        self.setText( cmd );
                    }
                } else if ( ex.keyCode === DOWN_KEY ) {
                    handled = true;

                    var cmd = undoStack.forward();
                    if ( ! cmd ) {
                        cmd = '';
                    }

                    self.setText( cmd );
                } else if ( ex.keyCode === ESCAPE_KEY ) {
                    handled = true;

                    self.setText( '' );
                    undoStack.toEnd();
                } else if ( ex.keyCode === TAB_KEY ) {
                    switchType( ex );

                    handled = true;
                }

                if ( handled ) {
                    ex.stopPropagation();
                    ex.preventDefault();
                }
            } );
        }
    }

    TerminalBar.prototype.setText = function(cmd) {
        this.dom.value = cmd;
    }

    TerminalBar.prototype.focus = function() {
        this.dom.focus();
    }

    window.slate.TerminalBar = TerminalBar;
})(window);
