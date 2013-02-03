"use static";

window.TransientMenu = (function() {
    var newTransientMenuItem = function( item, stopScrollCallback, isEnabled ) {
        var dom = document.createElement( 'a' );
        dom.href = '#';

        if ( isEnabled ) {
            dom.className = 'transient-list-item';
        } else {
            dom.className = 'transient-list-item disable';
        }

        if ( item.css ) {
            dom.className += ' ' + item.css;
        }

        if ( item.html ) {
            dom.innerHTML = item.html;
        }

        if ( item.text ) {
            dom.textContent = item.text;
        }
    }

    var TransientMenu = function() {
        var list = document.createElement( 'div' );
        list.className = 'transient-menu-list';

        var dom = document.createElement( 'div' );
        dom.className = 'transient-menu';
        dom.appendChild( list );

        /*
         * If the dom is currently hiding,
         * it will stop the hiding process.
         */
        var cancelHide = function() {
            dom.classList.add( 'show' );
        }

        dom.addEventListener( 'mousedown', cancelHide );
        dom.addEventListener( 'mousemove', cancelHide );
        dom.addEventListener( 'touchdown', cancelHide );

        this.list = list;
        this.dom  = dom;
    }

    TransientMenu.prototype = {
        onSelectItem: function( itemDom ) {
            this.lastSelectedItem.classList.add( 'disable' );
            this.itemDom.classList.remove( 'disable' );

            this.hide();
        },

        /**
         * @param items The items to show in the list.
         * @param firstIndex The main index to start listing from.
         */
        setItems: function( items, firstIndex ) {
            if ( firstIndex === undefined ) {
                firstIndex = 0;
            }

            this.list.innerHTML = '';
            var self = this;
            for ( var i = 0; i < items.length; i++ ) {
                var itemDom = newTransientMenuItem(
                        items[i],
                        stopScroll,
                        firstIndex === i
                )

                itemDom.addEventListener( 'click', function(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();

                    self.onSelectItem( itemDom );
                } );

                this.list.appendChild( itemDom );
            }
        },

        isShown: function() {
            return this.dom.classList.contains( 'show' );
        },

        show: function() {
            this.dom.classList.add( 'show' );
        },

        hide: function() {
            this.dom.classList.add( 'hide' );
        }
    }

    return TransientMenu;
})();
