"use strict";

window.slate = window.slate || {};
window.slate.TouchBar = (function() {
    var newASTText = function( args ) {
        var klass = 'touch-ast-text';
        for ( var i = 1; i < args.length; i++ ) {
            klass += ' ' + args[i];
        }

        var textDiv = document.createElement( 'div' );
        textDiv.className = klass;

        return textDiv;
    }

    var astHTML = function( html ) {
        var div = newASTText( arguments );
        div.innerHTML = html;
        return div;
    }

    var astText = function( text ) {
        var div = newASTText( arguments );
        div.textContent = text;
        return div;
    }

    var ast = {};

    ast.Node = function() {
        this.dom = slate.util.newElement( 'div', 'touch-ast' );
        this.up = null;

        this.view = null;

        var self = this;

        slate.util.click( this.dom, function(ev) {
            ev.stopPropagation();

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

        getParent: function() {
            return this.up;
        },

        /**
         * Private. This should never be called from
         * outside of this class!
         */
        setParent: function( newParent ) {
            assert( newParent, "falsy parent given" );

            this.up = newParent;

            // todo, swap the HTML nodes

            return this;
        },

        /**
         * Returns the view area, which this AST node is
         * present within.
         *
         * Calling this when the node is not present inside
         * of a view, will result in an error.
         *
         * Essentially you shouldn't be trying to interact
         * with the view, if there isn't one.
         */
        getView: function() {
            if ( this.view === null ) {
                if ( this.hasParent() ) {
                    this.view = this.getParent().getView();
                    return this.view;
                } else {
                    throw new Error("getView called when node is not within a view");
                }
            } else {
                return this.view;
            }
        },
        setView: function( view ) {
            assert( view, "falsy view given" );
            this.view = view;

            return this;
        },

        onSelect: function() {
            this.dom.classList.add( 'select' );

            this.selectMore();
        },

        /**
         * A selection hook,
         * which is made every time this is selected,
         * even if it is already selected.
         */
        onEverySelect: function() {
            // do nothing
        },

        selectMore: function() {
            this.withParent( 'touch-ast', function(node) {
                node.getDom().classList.add( 'select-parent' );
            } );
        },

        onUnselect: function() {
            this.dom.classList.remove( 'select' );

            this.withParent( 'select-parent', function(node) {
                node.getDom().classList.remove( 'select-parent' );
            } );
        },

        /**
         * Finds the first parent node with the class given set to it.
         * If found, 'fun' is then called with that parent node passed
         * in.
         *
         * Iteration then stops, unless 'fun' returns true.
         */
        withParent: function( klass, fun ) {
            var p = this.getParent();

            for ( var p = this.getParent(); p !== null; p = p.getParent() ) {
                if ( p.getDom().classList.contains(klass) ) {
                    if ( fun(p) !== true ) {
                        return this;
                    }
                }
            }

            return this;
        },

        getDom: function() {
            return this.dom;
        },

        setDom: function( dom ) {
            var old = this.dom;
            this.dom = dom;

            // swap the old and new nodes
            var upDom = old.parentNode;
            if ( upDom ) {
                upDom.replaceChild( dom, old );
            }

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
                return this.getParent().findEmpty();
            }
        },

        add: function() {
            for ( var i = 0; i < arguments.length; i++ ) {
                var arg = arguments[i];

                if ( arg instanceof HTMLElement ) {
                    this.dom.appendChild( arg );
                } else if ( arg.getDom !== undefined ) {
                    this.dom.appendChild( arg.getDom() );

                    arg.setParent( this );
                } else {
                    throw new Error( "unknown argument given" );
                }
            }
        }
    }

    ast.Empty = function() {
        ast.Node.call( this );

        this.addClass( 'touch-ast-empty' );
        this.dom.innerHTML = '&#x25cf;';
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

        this.dom.appendChild( astText(value) );
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

        this.add(
                astText('(', 'touch-ast-left-paren'),
                this.left,
                astHTML(text, 'touch-ast-op-text'),
                this.right,
                astText(')', 'touch-ast-left-paren')
        );

        this.fun = fun;
    }

    ast.DoubleOp.prototype = slate.util.extend( ast.Node, {
        evaluate: function() {
            return this.fun(
                    this.left.evaluate(),
                    this.right.evaluate()
            )
        },

        selectMore: function() {
            // do nothing
        },

        /**
         * Replaces this double operator, i.e. a plus,
         * with the node given.
         *
         * However if the node given is also a double operator,
         * i.e. replacing a plus with a subtract,
         * then the left and right values are kept.
         */
        replace: function( other ) {
            if ( other instanceof ast.DoubleOp ) {
                if ( ! (this.left instanceof ast.Empty) ) {
                    other.left.replace( this.left );
                }

                if ( ! (this.right instanceof ast.Empty) ) {
                    other.right.replace( this.right );
                }
            }

            ast.Node.prototype.replace.call( this, other );
        },

        replaceChild: function( old, newChild ) {
            if ( this.left === old ) {
                this.left = newChild;
            } else if ( this.right === old ) {
                this.right = newChild;
            } else {
                throw new Error( "old child given, but it is not a child of this AST node" );
            }

            newChild.setParent( this );
        },

        getEmpty: function() {
            return this.left.getEmpty() || this.right.getEmpty();
        }
    } );

    /**
     * The addFun is used primarily as a way of injecting extra nodes
     * into this AST node. If provided, it is called when the input
     * node is added to this AST nodes DOM.
     *
     * Then you can add the input node yourself, however you like.
     *
     * @param type The type for the HTMLInputElement; i.e. 'text', 'number'. 
     * @param cssKlass Extra class name for this AST node.
     * @param defaultVal The default value this input should contain, undefined for none.
     * @param emptyAllowed True if this node can be left empty, false if that is invalid.
     * @param addFun Optional, a function which defines how items are added.
     */
    ast.Input = function( type, cssKlass, defaultVal, emptyAllowed, addFun ) {
        ast.Node.call( this );

        var inputDom = document.createElement( 'input' );
        inputDom.setAttribute( 'type', type );
        if ( defaultVal !== undefined ) {
            inputDom.value = defaultVal;
        }

        var dom = this.getDom();
        dom.classList.add( 'touch-ast-input' );
        dom.classList.add( cssKlass );

        this.input = inputDom;
        this.timeout = null;

        if ( addFun ) {
            addFun.call( this, this.input );
        } else {
            this.add( this.input );
        }

        this.lastInput = '';

        var self = this;

        this.input.addEventListener( 'input', function() {
            self.resizeInput();
        } );

        this.resizeInput();
    }

    /**
     * Returns the width of the text given,
     * for a 'touch-ast-input > input' node.
     *
     * @param text The text to measure the width of.
     * @return The width, in pixels, but as an int. i.e. '400' not '400px'.
     */
    ast.Input.textWidth = (function() {
        var isMeasureSet = false;

        var div = document.createElement( 'div' );
        div.className = 'touch-input-measure-div';

        var inputTextWrap = document.createElement( 'div' );
        inputTextWrap.className = 'touch-input-measure';
        inputTextWrap.appendChild( div );

        return function( text ) {
            if ( ! isMeasureSet ) {
                isMeasureSet = true;
                document.getElementsByTagName('body')[0].appendChild( inputTextWrap );
            }

            div.textContent = text;
            return div.clientWidth;
        }
    })();

    ast.Input.prototype = slate.util.extend( ast.Node, {
        onEverySelect: function() {
            this.input.focus();
            this.resizeInput();
        },

        onUnselect: function() {
            ast.Node.prototype.onUnselect.call( this );

            this.input.classList.remove( 'multi-change' );
        },

        resizeInput: function() {
            /*
             * If more than 2 characters are inputted at once,
             * it will animate the width change.
             */
            var thisInput = this.input.value;
            if ( Math.abs(thisInput.length-this.lastInput.length) > 2 ) {
                this.input.classList.add( 'multi-change' );
            } else {
                this.input.classList.remove( 'multi-change' );
            }
            this.lastInput = thisInput;

            this.input.style.width = ast.Input.textWidth( this.input.value ) + 'px';
        },

        withInput: function( fun ) {
            var self = this;

            if ( this.timeout !== null ) {
                clearTimeout( this.timeout );
                this.timeout = null;
            }

            this.timeout = setTimeout( function() {
                this.timeout = null;
                
                fun.call( self );
            }, 0 );
        }
    } );

    var newASTInput = function() {
        var args = arguments;

        var cons = function() {
            ast.Input.apply( this, args );
        }

        cons.prototype = slate.util.extend( ast.Input.prototype );

        return cons;
    }

    ast.StringInput = newASTInput(
            'text',
            'touch-ast-string',
            undefined,
            true,
            function(input) {
                this.add( astText('"'), input, astText('"') );
            }
    );
    ast.NumberInput = newASTInput(
            'number',
            'touch-ast-number',
            0,
            false
    );
    ast.VariableInput = newASTInput(
            'text',
            'touch-ast-string',
            'x',
            false
    );

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
            dom.innerHTML = item;
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
                        this.current.onUnselect();
                    }

                    this.current = ast;
                    this.current.setView( this );

                    this.current.onSelect();
                }

                this.current.onEverySelect();

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
                node.setView( this );

                this.selectEmpty( node );
            },

            selectEmpty: function( node ) {
                node = ( node || this.current );
                this.setCurrent( node.findEmpty() || node );
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
            view.insert( new ast.VariableInput() );
        } );
        valuesRow.append( '123', function() {
            view.insert( new ast.NumberInput() );
        } );
        valuesRow.append( '"text"', function() {
            view.insert( new ast.StringInput() );
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
                var op = new ast.DoubleOp(sym, fun)
                var current = view.getCurrent();

                current.replace( op );
                view.setCurrent( op );
                op.left.replace( current );

                view.selectEmpty();
            } )
        }

        newOps( '+' , function(l, r) { return l + r } );
        newOps( '-' , function(l, r) { return l - r } );
        newOps( '&times;' , function(l, r) { return l * r } );
        newOps( '&#xf7;' , function(l, r) { return l / r } );

        newOps( '&gt;=', function(l, r) { return l >=  r } );
        newOps( '&lt;=', function(l, r) { return l <=  r } );
        newOps( '==', function(l, r) { return l === r } );
        newOps( '&#x2260', function(l, r) { return l !== r } );

        newOps( '&gt;&gt;', function(l, r) { return l >> r } );
        newOps( '&lt;&lt;', function(l, r) { return l << r } );
        newOps( 'and', function(l, r) { return l && r } );
        newOps( 'or', function(l, r) { return l || r } );

        newOps( '&amp;' , function(l, r) { return l & r  } );
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
