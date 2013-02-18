"use static";

window.TransientMenu = (function() {
    var HIDE_TIME = 1500;

    var newTransientMenuItem = function( item, isEnabled ) {
        var dom = document.createElement( 'a' );
        dom.setAttribute( 'href', '#' );

        if ( isEnabled ) {
            dom.className = 'transient-menu-item';
        } else {
            dom.className = 'transient-menu-item disable';
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

        return dom;
    }

    var TransientMenu = function( items ) {
        var list = document.createElement( 'div' );
        list.className = 'transient-menu-list';

        var dom = document.createElement( 'div' );
        dom.className = 'transient-menu';
        dom.appendChild( list );

        /*
         * If the dom is currently hiding,
         * it will stop the hiding process.
         */
        var self = this;
        var cancelHide = function() {
            self.autoHide();
        }

        dom.addEventListener( 'mousedown', cancelHide );
        dom.addEventListener( 'mousemove', cancelHide );
        dom.addEventListener( 'touchdown', cancelHide );

        dom.addEventListener( 'blur', function() {
            self.hide();
        } );

        this.list = list;
        this.dom  = dom;

        if ( items ) {
            this.setItems( items );
        }
    }

    TransientMenu.prototype = {
        onSelectItem: function( itemDom ) {
            this.lastSelectedItem.classList.add( 'disable' );
            this.itemDom.classList.remove( 'disable' );

            this.hide();
        },

        dom: function() {
            return this.dom;
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
            if ( ! this.isShown() ) {
                // re-position to align with the parent
                this.dom.classList.add( 'show' );
            }

            this.autoHide();
        },

        autoHide: function() {
            if ( this.isHiding ) {
                cancelTimeout( this.isHiding );
            }

            var self = this;
            self.isHiding = setTimeout( function() {
                self.hide();
                self.isHiding = 0;
            }, HIDE_TIME );
        },

        hide: function() {
            this.dom.classList.remove( 'show' );
        }
    }

    return TransientMenu;
})();
