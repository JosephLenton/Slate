"use strict";

window.slate = window.slate || {};
window.slate.TouchBar = (function() {
    var ast = {};

    ast.Node = function() {
        this.dom = slate.util.newElement( 'div', 'touch-ast' );
        this.up = null;

        this.view = null;

        var self = this;

        slate.util.click( this.dom, function() {
            self.getView().setCurrent( self );
        } );
    }

    ast.Node.prototype = {
        addClass: function( klass ) {
            this.dom.classList.add( klass );

            return this;
        },

        hasParent: function() {
            return this.up !== null;
        },

        parent: function( newParent ) {
            if ( arguments.length === 0 ) {
                return this.up;
            } else {
                assert( newParent, "falsy parent given" );
                this.up = newParent;

                // todo, swap the HTML nodes

                return this;
            }
        },

        getView: function() {
            assert( this.view !== null, "getting view when this node does not have one" );
            return this.view;
        },
        setView: function( view ) {
            assert( view, "falsy view given" );
            this.view = view;

            return this;
        },

        select: function() {
            this.dom.classList.add( 'select' );
        },
        unselect: function() {
            this.dom.classList.remove( 'select' );
        },

        getDom: function() {
            return this.dom;
        },

        setDom: function( dom ) {
            this.dom = dom;

            // todo, swap the HTML nodes
            
            return this;
        },

        replaceChild: function( old, newChild ) {
            // do nothing
        },

        /**
         * Replaces this AST node with the one given.
         * This happens with both it's AST structure,
         * and within the DOM.
         */
        replace: function( ast ) {
            this.dom.parentNode.replaceChild( ast.getDom(), this.dom );

            if ( this.hasParent() ) {
                this.getParent().replaceChild( this, ast );
            }
            
            return this;
        },

        evaluate: function() {
            throw new Error( "evaluate is not yet implemented, override it!" );
        },

        getEmpty: function() {
            return null;
        },

        findEmpty: function() {
            var empty = this.getEmpty();

            if ( empty ) {
                return empty;
            } else if ( this.hasParent() ) {
                return this.parent().findEmpty();
            }
        }
    }

    ast.Empty = function() {
        ast.Node.call( this );

        this.addClass( 'touch-ast-empty' );
    }

    ast.Empty.prototype = slate.util.extend( ast.Node, {
        evaluate: function() {
            throw new Error( "evaluating but node is still empty" );
        },

        getEmpty: function() {
            return this;
        }
    } )

    ast.Literal = function( value, klass ) {
        ast.Node.call( this );

        this.value = value;

        this.addClass( 'touch-ast-literal' ).
                addClass( klass );

        var inner = slate.util.newElement( 'div', 'touch-ast-literal-inner' );
        inner.textContent = value;

        this.dom.appendChild( inner );
    }

    ast.Literal.prototype = slate.util.extend( ast.Node, {
        evaluate: function() {
            return this.value;
        }
    } )

    ast.DoubleOp = function( text, fun ) {
        ast.Node.call( this );

        this.addClass( 'touch-ast-op' );

        this.left  = new ast.Empty();
        this.right = new ast.Empty();

        var textDiv = document.createElement( 'div' );
        textDiv.className = 'touch-ast-op-text';
        textDiv.textContent = text;

        this.add( this.left, textDiv, this.right );

        this.fun = fun;
    }

    ast.DoubleOp.prototype = slate.util.extend( ast.Node, {
        evaluate: function() {
            return this.fun(
                    this.left.evaluate(),
                    this.right.evaluate()
            )
        },

        replaceChild: function( old, newChild ) {
            if ( this.left === old ) {
                this.left = newChild;
            } else if ( this.right === old ) {
                this.right = newChild;
            } else {
                throw new Error( "old child given, but it is not a child of this AST node" );
            }

            newChild.parent( this );
        },

        getEmpty: function() {
            return this.left.getEmpty() || this.right.getEmpty();
        }
    } );

    /**
     * A horizontal row of options to select.
     * It's essentially a row of buttons,
     * that can be hidden and shown.
     */
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

        slate.util.click( dom, callback );

        this.dom.appendChild( dom );
    }

    var addSection = function( touchBar, name, row ) {
        var button = slate.util.newElement( 'a', 'touch-bar-button', name )

        slate.util.click( button, function() {
            touchBar.showRow( row );
        } )

        touchBar.lower.appendChild( button )
    }

    /**
     * The area that displays the AST.
     */
    var TouchView = function( parentDom ) {
        var viewArea = slate.util.newElement( 'div', 'touch-bar-view' );

        parentDom.appendChild( viewArea );
        this.dom = viewArea;

        this.current = null;

        this.setAST( new ast.Empty() );
    }

    TouchView.prototype = {
            getCurrent: function() {
                return this.current;
            },

            setCurrent: function( ast ) {
                if ( this.current !== ast ) {
                    if ( this.current !== null ) {
                        this.current.unselect();
                    }

                    this.current = ast;
                    this.current.select();
                }

                return this;
            },

            /**
             * Replaces the entire AST in the view,
             * with the ast node given.
             */
            setAST: function( ast ) {
                if ( this.current ) {
                    this.dom.removeChild( this.current.getDom() )
                }

                this.dom.appendChild( ast.getDom() );
                this.setCurrent( ast );
            },

            /**
             * Inserts a node into the currently empty space.
             */
            insert: function( node ) {
                this.current.replace( node );
                this.current = node;

                var empty = this.current.findEmpty();
                if ( empty ) {
                    empty.select();
                } else {
                    node.select();
                }
            }
    }

    var TouchBar = function( dom, execute, commands ) {
        var upper = slate.util.newElement( 'div', 'touch-bar-row upper' );
        var lower = slate.util.newElement( 'div', 'touch-bar-row lower' );

        var wrap  = slate.util.newElement( 'div', 'touch-bar', upper, lower );

        var view = new TouchView( wrap );
        this.view = view;

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

        valuesRow.append( 'var', function() {
            console.log( 'new var' );
        } );
        valuesRow.append( '123', function() {
            console.log( 'new number' );
        } );
        valuesRow.append( '"text"', function() {
            view.insert( new ast.Literal(true, 'touch-ast-boolean') );
        } );
        valuesRow.append( 'true', function() {
            view.insert( new ast.Literal(true, 'touch-ast-boolean') );
        } );
        valuesRow.append( 'false', function() {
            view.insert( new ast.Literal(false, 'touch-ast-boolean') );
        } );

        addSection( this, 'values', valuesRow );

        /*
         * Structural commands, like operators.
         */

        var opsRow = new TouchRow( this.upper );

        var newOps = function( sym, fun ) {
            opsRow.append( '_ ' + sym + ' _', function() {
                view.insert( new ast.DoubleOp( sym, fun ) )
            } )
        }

        newOps( '+' , function(l, r) { return l + r } );
        newOps( '-' , function(l, r) { return l - r } );
        newOps( '*' , function(l, r) { return l * r } );
        newOps( '/' , function(l, r) { return l / r } );

        newOps( '>=', function(l, r) { return l >=  r } );
        newOps( '<=', function(l, r) { return l <=  r } );
        newOps( '==', function(l, r) { return l === r } );
        newOps( '!=', function(l, r) { return l !== r } );

        newOps( '>>', function(l, r) { return l >> r } );
        newOps( '<<', function(l, r) { return l << r } );
        newOps( '&&', function(l, r) { return l && r } );
        newOps( '||', function(l, r) { return l || r } );

        newOps( '&' , function(l, r) { return l & r  } );
        newOps( '|' , function(l, r) { return l | r  } );

        addSection( this, 'operators', opsRow );

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
