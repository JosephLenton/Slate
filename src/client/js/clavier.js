"use strict";

window['Clavier'] = (function() {
    var DEFAULT_POSITION = '300px';

    var KeyPaneInner = (function() {
        BBGun.call(this, 'clavier-keys-inner');

        this.add(
                this.top    = bb('clavier-keys-row'),
                this.middle = bb('clavier-keys-row'),
                this.bottom = bb('clavier-keys-row')
        )
    }).extend( BBGun, {
        addRow: function( row, html, fun ) {
            bb.add( row, bb.a('clavier-key', { html: html, click: fun } ) )
            return this;
        },

        addTop: function( html, fun ) {
            return this.addRow(this.top, html, fun);
        },
        addMiddle: function() {
            return this.addRow(this.middle, html, fun);
        },
        addBottom: function() {
            return this.addRow(this.bottom, html, fun);
        }
    })

    var KeyPane = (function() {
        BBGun.call(this, 'clavier-keys');

        this.add(
                this.controls = bb('clavier-keys-row top'),
                this.main   = new KeyPaneInner(),
                this.alt    = new KeyPaneInner()
        )

        this.showMain();
        
    }).extend( BBGun, {
        controlButton: function( html, fun ) {
            bb.add(this.controls, bb.a('clavier-key', { html: html, click: fun }))

            return this;
        },

        showMain: function() {
            bb.addClass(this.main, 'show');
            bb.removeClass(this.alt, 'show');

            return this;
        },

        showAlt: function() {
            bb.removeClass( this.main, 'show' );
            bb.addClass( this.alt, 'show' );

            return this;
        }
    })

    var Clavier = (function() {
        var left = new KeyPane();
        var right = new KeyPane();

        right.
                controlButton(bb.div('clavier-key-move-home'), function() {
                    // todo
                }).
                controlButton(bb.div('clavier-key-move-left'), function() {
                    // todo
                }).
                controlButton(bb.div('clavier-key-move-right'), function() {
                    // todo
                }).
                controlButton(bb.div('clavier-key-move-end'), function() {
                    // todo
                }).
                controlButton(bb.div('clavier-key-delete'), function() {
                    // todo
                })
        ;

        BBGun.call( this, 'clavier',
                {
                    '.clavier-left': left,
                    '.clavier-right': right
                }
        )

        this.lastPosition = DEFAULT_POSITION;
    }).
    extend( BBGun, {
        open: function() {
            this.style('top', this.lastPosition);
        },

        close: function() {
            this.style('top', '100%');
        }
    })

    return Clavier;
})()