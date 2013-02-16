"use strict";

window['Clavier'] = (function() {
    var DEFAULT_POSITION = '300px';

    var KeyPane = (function() {
        BBGun.call(this, 'clavier-keys');
    }).extend( BBGun, {
        // todo
    })

    var Clavier = (function() {
        var leftKeys  = new KeyPane();
        var rightKeys = new KeyPane();

        BBGun.call( this, 'clavier',
                {
                    '.clavier-left' : leftKeys,
                    '.clavier-right': rightKeys
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