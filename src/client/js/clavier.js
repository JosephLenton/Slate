"use strict";

window['Clavier'] = (function() {
    var DEFAULT_POSITION = '300px';

    var KeyPaneInner = (function(klass) {
        BBGun.call(this, 'clavier-keys-inner', klass || '');

        this.add(
                this.superTop = bb('clavier-keys-row super-top'),
                this.top    = bb('clavier-keys-row top'),
                this.middle = bb('clavier-keys-row middle'),
                this.bottom = bb('clavier-keys-row bottom')
        )
    }).extend( BBGun, {
        addRow: function( row, args ) {
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

            bb.add( row, bb.a('clavier-key', klass, { html: html, click: fun } ) )
            return this;
        },

        addSuperTop: function( html, klass, fun ) {
            return this.addRow( this.superTop, arguments );
        },

        addTop: function( html, klass, fun ) {
            return this.addRow(this.top, arguments);
        },
        addMiddle: function( html, fun ) {
            return this.addRow(this.middle, arguments);
        },
        addBottom: function( html, fun ) {
            return this.addRow(this.bottom, arguments);
        }
    })

    var KeyPane = (function() {
        BBGun.call(this, 'clavier-keys');

        this.add(
                this.mainPane = new KeyPaneInner( 'main' ),
                this.altPane  = new KeyPaneInner( 'alt' )
        )

        this.showMain();
        
    }).extend( BBGun, {
        showMain: function() {
            this.mainPane.addClass( 'show' );
            this.altPane.removeClass( 'show' );

            return this;
        },

        showAlt: function() {
            this.mainPane.removeClass( 'show' );
            this.altPane.addClass( 'show' );

            return this;
        },

        main: function() {
            return this.mainPane;
        },

        alt: function() {
            return this.altPane;
        }
    })

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

    var newKeyPress = function( key ) {
        return function() {
            // todo
        }
    }

    var setupButtonKeys = function( pane ) {
        for ( var i = 1; i < Math.min(arguments.length, 4); i++ ) {
            var row = arguments[i];

            for ( var j = 0; j < row.length; j++ ) {
                var k = row[j];

                if ( i === 1 ) {
                    pane.addSuperTop( k, newKeyPress(k) );
                } else if ( i === 2 ) {
                    pane.addTop( k, newKeyPress(k) );
                } else if ( i === 3 ) {
                    pane.addMiddle( k, newKeyPress(k) );
                } else if ( i === 4 ) {
                    pane.addBottom( k, newKeyPress(k) );
                }
            }
        }
    }

    var setupLeftKeys = function( pane ) {
        pane.addSuperTop( '&#x21d0;', 'control left-node', function() {
            // todo
        } );
        pane.addSuperTop( '&#x21d2;', 'control right-node', function() {
            // todo
        } );
        pane.addTop( '&#x21d3;', 'control down-node', function() {
            // todo
        } );
        pane.addTop( '&#x21d1;', 'control up-node', function() {
            // todo
        } );

        pane.addMiddle( 'shift', 'control shift', function() {
            // todo
        } )

        setupButtonKeys( pane,
                [ 'q', 'w', 'e', 'r', 't' ],
                [ 'a', 's', 'd', 'f', 'g' ],
                [ 'z', 'x', 'c', 'v', 'b' ]
        )

        pane.addBottom( '1,2,3...', 'control numpad', function() {
            // todo
        } )
        pane.addBottom( '&amp;[]&lt;&gt;', 'control symbols-special', function() {
            // todo
        } )
        pane.addBottom( '&nbsp;', 'space', function() {
            // todo
        } )
    }

    var setupRightKeys = function( pane, options ) {
        setupButtonKeys( pane,
                [ 'y', 'u', 'i', 'o', 'p' ],
                [ 'h', 'j', 'k', 'l' ],
                [ 'n', 'm', ',', '.' ]
        )

        pane.addSuperTop( '&#x25C4;', 'control left', function() {
            // todo
        } );

        pane.addSuperTop( '&#x25Ba;', 'control right', function() {
            // todo
        } );

        pane.addTop( 'BS', 'control backspace', function() {
            // todo
        } )

        pane.addMiddle( 'shift', 'control shift', function() {
            // todo
        } )
        
        pane.addBottom( '&nbsp;', 'space', function() {
            // todo
        } )
        pane.addBottom( '";+*/', 'control symbols-common', function() {
            // todo
        } )
        pane.addBottom( '&#x25Be;', 'control close', options.onClose );
    }

    var setupRightNumpad = function( pane ) {
        // todo
    }

    var Clavier = (function(options) {
        assertObject( options, "no options provided" );

        this.left  = new KeyPane();
        this.right = new KeyPane();

        BBGun.call( this, 'clavier',
                {
                    '.clavier-right clavier-background' : this.right,
                    '.clavier-left  clavier-background' : this.left
                }
        )

        this.lastPosition = DEFAULT_POSITION;

        setupRightKeys( this.right.main(), options );
        setupRightNumpad( this.right.alt() );

        setupLeftKeys( this.left.main() );
    }).
    extend( BBGun, {
        leftControl: function( html, fun ) {
            this.left.controlButton( html, fun );
            return this;
        },
        rightControl: function( html, fun ) {
            this.right.controlButton( html, fun );
            return this;
        },

        fixed: function() {
            this.addClass( 'fixed' );
        },

        open: function() {
            this.style('top', this.lastPosition);
        },

        close: function() {
            this.style('top', '100%');
        }
    })

    return Clavier;
})()
