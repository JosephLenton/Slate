"use strict";

(function(window) {
    var TAB_KEY     = 9,
        ENTER_KEY   = 13,
        DOWN_KEY    = 40,
        UP_KEY      = 38,
        ESCAPE_KEY  = 27;

    var UndoStack = function() {
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

    var TerminalBar = function( dom, buttonDom, execute, defaultType ) {
        if ( ! dom     ) throw new Error( 'undefined dom object given'     );
        if ( ! execute ) throw new Error( 'undefined execute object given' );

        this.dom = dom;

        var self = this;

        var type;
        var setType = function( t ) {
            type = t;

            if ( type === 'js' ) {
                buttonDom.className = buttonDom.className.replace( /( ?)slate-coffee/, '' ) + ' slate-js';
            } else {
                buttonDom.className = buttonDom.className.replace( /( ?)slate-js/, '' ) + ' slate-coffee';
            }
        }

        var switchType = function(ex) {
            if ( type === 'coffee' ) {
                setType( 'js'     );
            } else {
                setType( 'coffee' );
            }           

            ex.preventDefault();
        };

        buttonDom.addEventListener( 'click', switchType );

        setType( defaultType );

        var undoStack = new UndoStack();

        if ( dom ) {
            dom.addEventListener( 'keypress', function(ex) {
                if ( ex.keyCode === ENTER_KEY ) {
                    var cmd = self.dom.textContent;

                    execute( type, cmd, function() {
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
        this.dom.innerText = cmd;
    }

    TerminalBar.prototype.focus = function() {
        this.dom.focus();
    }

    window.slate.lib.TerminalBar = TerminalBar;
})(window);
