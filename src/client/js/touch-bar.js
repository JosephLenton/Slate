"use strict";

window.slate = window.slate || {};
window.slate.TouchBar = (function() {
    var TouchRow = function( upperDom ) {
        this.dom = slate.util.newElement( 'div', 'touch-bar-row-inner' );

        upperDom.appendChild( this.dom );
    }

    TouchRow.prototype.show = function() {
        this.dom.classList.add( 'show' );
    }

    TouchRow.prototype.hide = function() {
        this.dom.classList.remove( 'show' );
    }

    TouchRow.prototype.append = function( item, callback ) {
        var dom = slate.util.newElement( 'a', 'touch-bar-button' );

        if ( window.slate.util.isString(item) ) {
            dom.textContent = item;
        } else {
            dom.appendChild( item );
        }

        dom.addEventListener( 'click', function(ev) {
            ev.preventDefault();
            callback();
        } );

        this.dom.appendChild( dom );
    }

    var addSection = function( touchBar, name, row ) {
        var button = slate.util.newElement( 'a', 'touch-bar-button', name );

        button.addEventListener( 'click', function(ev) {
            ev.preventDefault();

            touchBar.showRow( row );
        } );

        touchBar.lower.appendChild( button );
    }

    var TouchBar = function( dom, execute, commands ) {
        var viewArea = slate.util.newElement( 'div', 'touch-bar-view' );
        var upper = slate.util.newElement( 'div', 'touch-bar-row' );
        var lower = slate.util.newElement( 'div', 'touch-bar-row' );

        var wrap = slate.util.newElement( 'div', 'touch-bar', viewArea, upper, lower );

        this.dom   = wrap;
        this.row   = null;
        this.lower = lower;
        this.upper = upper;

        dom.appendChild( wrap );

        /**
         * Add the initial commands
         */

        var commandsRow = new TouchRow( this.upper );
        for ( var i = 0; i < commands.length; i++ ) {
            commandsRow.append( commands[i], function() {
                console.log( 'blah' );
            } );
        }
        addSection( this, 'command', commandsRow );

        /**
         * Add the values and literals
         */

        var valuesRow = new TouchRow( this.upper );

        valuesRow.append( 'x', function() {
            console.log( 'new var' );
        } );
        valuesRow.append( '123', function() {
            console.log( 'new number' );
        } );
        valuesRow.append( '"text"', function() {
            console.log( 'new text' );
        } );
        valuesRow.append( 'true', function() {
            console.log( 'boolean true' );
        } );
        valuesRow.append( 'false', function() {
            console.log( 'boolean false' );
        } );

        addSection( this, 'values', valuesRow );

        this.showRow( commandsRow );
    }

    TouchBar.prototype.showRow = function( row ) {
        if ( this.row ) {
            if ( this.row === row ) {
                return;
            } else {
                this.row.hide();
            }
        }

        row.show();
        this.row = row;
    }

    return TouchBar;
})();
