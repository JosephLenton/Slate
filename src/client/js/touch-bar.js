"use strict";

window.slate = window.slate || {};
window.slate.TouchBar = (function() {
    var addSlashes = function( str ) {
        return (str+'').replace(/([\\"'])/g, "\\$1").replace(/\0/g, "\\0");
    }

    /**
     * Returns true if the given string represents a valid
     * JavaScript identifier, and false if not.
     *
     * @param str The string to test.
     * @return True if it is valid, and false if not.
     */
    /*
     * Reserved words from: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Reserved_Words
     */
    var isValidIdentifier = function( str ) {
        return str.length > 0 &&
                str.replace(/^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/, '') === '' &&
                str !== 'break' &&
                str !== 'case' &&
                str !== 'catch' &&
                str !== 'continue' &&
                str !== 'debugger' &&
                str !== 'default' &&
                str !== 'delete' &&
                str !== 'do' &&
                str !== 'else' &&
                str !== 'finally' &&
                str !== 'for' &&
                str !== 'function' &&
                str !== 'if' &&
                str !== 'in' &&
                str !== 'instance' &&
                str !== 'new' &&
                str !== 'return' &&
                str !== 'switch' &&
                str !== 'this' &&
                str !== 'throw' &&
                str !== 'try' &&
                str !== 'typeof' &&
                str !== 'var' &&
                str !== 'void' &&
                str !== 'while' &&
                str !== 'with' &&

                str !== 'class' &&
                str !== 'enum' &&
                str !== 'export' &&
                str !== 'extends' &&
                str !== 'import' &&
                str !== 'super' &&

                str !== 'implements' &&
                str !== 'interface' &&
                str !== 'let' &&
                str !== 'package' &&
                str !== 'private' &&
                str !== 'protected' &&
                str !== 'public' &&
                str !== 'static' &&
                str !== 'yield' &&

                str !== 'const' &&

                str !== 'nil' &&
                str !== 'true' &&
                str !== 'false' ;
    }

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

            if ( self.isSelected() ) {
                if ( self.onClickFun !== null ) {
                    self.onClickFun();
                }
            } else {
                self.getView().setCurrent( self );
            }
        } );

        this.setupDeleteButton();
        this.onClickFun = null;
    }

    ast.Node.prototype = {
        setOnClick: function( fun ) {
            assertFun( fun, "click function is not a function object" );
            this.onClickFun = fun;
        },

        setupDeleteButton: function() {
            var self = this;

            var deleteNode = slate.util.newElement( 'a', 'touch-ast-delete' );
            slate.util.click( deleteNode, function(ev) {
                ev.stopPropagation();

                self.replace( new ast.Empty() );
            } );

            this.dom.appendChild( deleteNode );
        },

        isEmpty: function() {
            return false;
        },
        isAssignable: function() {
            return false;
        },

        setError: function() {
            // timeout is to ensure it fades in
            this.addClass.callLater( this, 'error' );

            return this;
        },

        removeError: function() {
            this.removeClass.callLater( this, 'error' );

            return this;
        },
        
        addClass: function( klass ) {
            this.dom.classList.add( klass );

            return this;
        },
        
        removeClass: function( klass ) {
            this.dom.classList.remove( klass );

            return this;
        },

        hasParent: function() {
            return ( this.up !== null );
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

        isSelected: function() {
            return this.dom.classList.contains( 'select' );
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

            if ( this.isSelected() ) {
                this.getView().setCurrent( ast );
            }
            
            return this;
        },

        /**
         * Iterates through this tree,
         * validating this node, and any nodes below.
         *
         * By default this just raises an error,
         * and should be overridden to add validation behaviour.
         *
         * The return value is used to quit validation, early,
         * and to denote if it was successful or not.
         *
         * @param onError A callback for reporting errors.
         * @return True if validation was successful and should continue, false if not.
         */
        validate: function(onError) {
            throw new Error( "Validate has not been overridden" );
        },

        toJS: function() {
            throw new Error( "toJS has not been overridden" );
        },

        evaluateCallback: function( onSuccess ) {
            onSuccess.callLater( null, this.evaluate() );
        },

        evaluate: function() {
            throw new Error( "evaluate is not yet implemented, override it!" );
        },

        /**
         * Returns the first empty node it can find,
         * which is either this node, or below it.
         *
         * It does not look at siblings, or parents.
         *
         * By default, it simply returns null.
         * Sub-classes are expected to override this
         * to add their own behaviour.
         */
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

                    if ( arg.setParent ) {
                        arg.setParent( this );
                    }
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
        isEmpty: function() {
            return true;
        },

        toJS: function() {
            throw new Error( "converting to code but node is still empty" );
        },

        evaluate: function() {
            throw new Error( "evaluating but node is still empty" );
        },

        validate: function( onError ) {
            onError( this, "empty node still present" );

            return false;
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
        validate: function() {
            return true;
        },

        toJS: function() {
            return this.value + '';
        },

        evaluate: function() {
            return this.value;
        }
    } )

    ast.TrueLiteral = (function() {
        var switchToFalse = function() {
            this.replace( new ast.FalseLiteral() );
        }

        return function() {
            var literal = new ast.Literal( true, 'touch-ast-boolean' );
            literal.setOnClick( switchToFalse );
            return literal;
        }
    })();

    ast.FalseLiteral = (function() {
        var switchToTrue = function() {
            this.replace( new ast.TrueLiteral() );
        }

        return function() {
            var literal = new ast.Literal( false, 'touch-ast-boolean' );
            literal.setOnClick( switchToTrue );
            return literal;
        }
    })();

    /**
     * This is a generic operator, with a left
     * and right side, but no information on what
     * that means.
     *
     * It works in conjunction with a description
     * of the double operator it is representing.
     *
     * For example addition is performed through
     * a DoubleOp + AdditionDescription.
     *
     * Why? So descriptions can be changed on the
     * fly, without the node being affected.
     *
     * Different properties between operators:
     *  - html          - Required, symbol text
     *  - css           - Optional, the css class
     *  - validate      - Optional, replaces the validate function with your own
     *  - validateLeft  - Optional, validates left when it's set
     *  - validateRight - Optional, validates right wehn it's set
     *  - execute       - Required, execution function
     *
     *  - opposite      - Optional, (tap) node i.e. equal taps to not equal,
     */
    ast.DoubleOp = function( meta, metas ) {
        ast.Node.call( this );

        this.addClass( 'touch-ast-op' );

        this.left  = new ast.Empty();
        this.right = new ast.Empty();

        /*
         * Convert the meta items we have,
         * into an array of meta items for the menu.
         */
        var menuItems = [];
        var metaIndex = 0,
            countIndex = true;
        for ( var i = 0; i < metas.length; i++ ) {
            var temp = metas[i];

            if ( countIndex ) {
                if ( temp === meta ) {
                    countIndex = false;
                } else {
                    metaIndex++;
                }
            }

            menuItems.push({
                    html: temp.html,
                    css : 'touch-ast-op-text',
                    fun : (function(m) {
                        return function() {
                            self.setMeta( m );
                        }
                    })(temp)
            })
        }

        //this.text = new TransientMenu( menuItems, metaIndex );
        //this.text.getDom().classList.add( 'touch-ast-text' );
        
        this.text = astText( '', 'touch-ast-op-text' );
        this.add(
                astText('(', 'touch-ast-left-paren'),
                this.left,
                this.text,
                this.right,
                astText(')', 'touch-ast-left-paren')
        );

        this.meta = null;
        this.setMeta( meta );
    }

    ast.DoubleOp.prototype = slate.util.extend( ast.Node, {
        setMeta: function( meta ) {
            assertString( meta.html, "html display is missing" );
            assertFun( meta.evaluate, "evaluation function is missing" );

            if ( this.meta !== null ) {
                if ( this.meta.css ) {
                    this.dom.classList.remove( this.meta.css );
                }
            }

            this.text.innerHTML = meta.html;
            if ( meta.css ) {
                this.dom.classList.add.callLater( meta.css );
            }
            this.meta = meta;

            this.validateLeft();
            this.validateRight();
        },

        validate: function(onError) {
            if ( this.left.isEmpty() ) {
                onError( this.left, "left node is still empty" );

                return false;
            } else if ( this.right.isEmpty() ) {
                onError( this.right, "right node is still empty" );

                return false;
            } else {
                if ( this.meta.validate ) {
                    return ! this.meta.validate( onError )
                } else {
                    return this.left.validate( onError ) && this.right.validate( onError );
                }
            }
        },

        toJS: function() {
            return this.meta.toJS( this.left.toJS(), this.right.toJS() );
        },

        evaluate: function() {
            return this.meta.evaluate();
        },

        validateLeft: function() {
            if ( this.meta.validateLeft ) {
                this.meta.validateLeft( this.left );
            }
        },

        validateRight: function() {
            if ( this.meta.validateRight ) {
                this.meta.validateRight( this.right );
            }
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
                this.validateLeft();
            } else if ( this.right === old ) {
                this.right = newChild;
                this.validateRight();
            } else {
                throw new Error( "old child given, but it is not a child of this AST node" );
            }

            newChild.setParent( this );
        },

        getEmpty: function() {
            return this.left.getEmpty() || this.right.getEmpty();
        }
    } );

    var descriptors = (function() {
        var newOps = function( name, sym, print, fun ) {
            return {
                    name    : name,
                    html    : sym,
                    evaluate: fun,
                    toJS    : function( left, right ) {
                        return '(' + left + ' ' + print + ' ' + right + ')';
                    }
            }
        }

        return [
                {
                        name: 'assignment',

                        html: ':=',

                        validateLeft: function( left ) {
                            if ( !left.isAssignable() && !left.isEmpty() ) {
                                left.setError();
                            }
                        },

                        validate: function( onError ) {
                            if ( ! this.left.isAssignable() ) {
                                onError( this.left, "illegal assignment" );
                                return false;
                            } else {
                                return this.left.validate( onError ) && this.right.validate( onError );
                            }
                        },

                        /**
                         * Behaves like:
                         *
                         *  x = left = right
                         *
                         * Right is evaluated, set to the left branch,
                         * and then returned as though there was an 'x' variable.
                         * Since an assignment, is also an expression.
                         *
                         */
                        evaluate: function() {
                            var right = this.right.evaluate();
                            this.left.assign( right );

                            return right;
                        },

                        toJS: function( left, right ) {
                            return left + ' = ' + right;
                        }
                },

                newOps( 'add'               , '+'       , '+'  , function(l, r) { return l + r } ),
                newOps( 'subtract'          , '-'       , '-'  , function(l, r) { return l - r } ),
                newOps( 'multiply'          , '&times;' , '*'  , function(l, r) { return l * r } ),
                newOps( 'divide'            , '&#xf7;'  , '/'  , function(l, r) { return l / r } ),

                newOps( 'equal'             , '&equiv;' , '===', function(l, r) { return l === r } ),
                newOps( 'not equal'         , '&ne;'    , '!==', function(l, r) { return l !== r } ),
                newOps( 'greater than equal', '&ge;'    , '>=' , function(l, r) { return l >=  r } ),
                newOps( 'less than equal'   , '&le;'    , '<=' , function(l, r) { return l <=  r } ),

                newOps( 'and'               , 'and'     , '&&' , function(l, r) { return l && r } ),
                newOps( 'or'                , 'or'      , '||' , function(l, r) { return l || r } ),

                newOps( 'bitwise and'       , '&amp;'   , '&'  , function(l, r) { return l & r  } ),
                newOps( 'bitwise or'        , '|'       , '|'  , function(l, r) { return l | r  } ),

                newOps( 'left shift'        , '&#x226a;', '<<' , function(l, r) { return l << r } ),
                newOps( 'right shift'       , '&#x226b;', '>>' , function(l, r) { return l >> r } )
        ]
    })();

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
     */
    ast.Input = function( type, cssKlass, defaultVal, emptyAllowed ) {
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
        this.emptyAllowed = emptyAllowed;
        this.timeout = null;

        this.add( this.input );

        this.lastInput = '';
        this.inputFuns = [];

        var self = this;
        this.input.addEventListener( 'input', function() {
            self.resizeInput();

            var funs = self.inputFuns;
            for ( var i = 0; i < funs.length; i++ ) {
                funs.call( self );
            }
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
        onInput: function( fun ) {
            assertFun( fun, "non function given for input event" );

            this.inputFuns.push( fun );
        },

        validate: function( onError ) {
            if ( !this.emptyAllowed && this.input.value === '' ) {
                onError( this, "this is missing a value" );
                return false;
            } else {
                return true;
            }
        },

        evaluate: function() {
            throw new Error( "no evaluate function provided!" );
        },

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

        getInputDom: function() {
            return this.input;
        },

        getInputValue: function() {
            return this.input.value;
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

    ast.RegExpInput = (function() {
                ast.Input.call( this,
                        'text',
                        'touch-ast-regexp',
                        undefined,
                        true
                )

                /*
                 * Add in input validation checks.
                 */

                this.onInput( function() {
                    if ( this.isRegExpValid() ) {
                        this.removeError();
                    } else {
                        this.setError();
                    }
                })

                /*
                 * Wrap the RegExp with //'s on either side.
                 */
                var dom = this.getDom();

                dom.insertBefore( astText('/'), this.getInputDom() );
                dom.appendChild( astText('/') );
            } ).
            extend({ 
                    isRegExpValid: function() {
                        try {
                            new RegExp( this.getInputValue() );
                            return true;
                        } catch ( err ) {
                            return false;
                        }
                    },
                    validate: function() {
                        return this.isRegExpValid();
                    },
                    evaluate: function() {
                        return new RegExp( this.getInputValue() );
                    },
                    toJS: function() {
                        return "new RegExp( \"" + addSlashes(this.getInputValue()) + "\" )";
                    }
            })

    ast.StringInput = (function() {
                ast.Input.call( this,
                        'text',
                        'touch-ast-string',
                        undefined,
                        true
                )

                /*
                 * This is here to wrap the constructor,
                 * so we can inject two extra text nodes,
                 * around the input element.
                 */
                var dom = this.getDom();

                dom.insertBefore( astText('"'), this.getInputDom() );
                dom.appendChild( astText('"') );
            }).
            extend( ast.Input, {
                    validate: function() {
                        return true;
                    },
                    evaluate: function() {
                        return this.getInputValue();
                    },
                    toJS: function() {
                        return "\"" + addSlashes(this.getInputValue()) + "\"";
                    }
            })

    ast.NumberInput = ast.Input.curry(
                    'number',
                    'touch-ast-number',
                    0,
                    false
            ).
            extend({
                    validate: function( onError ) {
                        if ( this.getInputValue().length > 0 ) {
                            return true;
                        } else {
                            onError( this, "no number provided" );
                            return false;
                        }
                    },
                    evaluate: function() {
                        var value = this.getInputValue();

                        return value.indexOf('.') !== -1 ?
                                parseFloat( value ) :
                                parseInt( value )   ;
                    },
                    toJS: function() {
                        return this.getInputValue();
                    }
            })

    ast.VariableInput = (function() {
                ast.Input.call( this, 
                        'text',
                        'touch-ast-variable',
                        '',
                        false
                )

                this.onInput( function() {
                    if ( isValidIdentifier(this.getInputValue()) ) {
                        this.removeError();
                    } else {
                        this.setError();
                    }
                } )
            }).
            extend( ast.Input, {
                    validate: function( onError ) {
                        var str = this.getInputValue();

                        if ( str.length === 0 ) {
                            onError( this, "no variable name provided" );
                            return false;
                        } else if ( ! isValidIdentifier(str) ) {
                            onError( this, "invalid variable name given" );
                            return false;
                        } else {
                            return true;
                        }
                    },

                    toJS: function() {
                        return this.getInputValue();
                    },

                    evaluate: function() {
                        return window[ this.getInputValue() ];
                    },
                    isAssignable: function() { return true; },
                    onAssignment: function( expr ) {
                        window[ this.getInputValue() ] = expr;
                    }
            })

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
            clear: function() {
                this.setAST( new ast.Empty() );
            },

            validate: function( callback ) {
                var success = this.getRootAST().validate(function(node, errMsg) {
                    // todo, display the error
                } );

                if ( success ) {
                    callback.later();
                }
            },

            toJS: function() {
                console.log( this.getRootAST() );
                return this.getRootAST().toJS();
            },

            evaluate: function( callback ) {
                this.getRootAST().evaluateCallback( callback );
            },

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

            getRootAST: function() {
                var root = null;
                for ( var current = this.current; current !== null; current = current.getParent() ) {
                    root = current;
                }

                return root;
            },

            /**
             * Replaces the entire AST in the view,
             * with the ast node given.
             */
            setAST: function( ast ) {
                if ( this.current ) {
                    this.dom.removeChild( this.getRootAST().getDom() );
                    this.current = null;
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

    /**
     * Creates a new Div, and fills it with the buttons
     * listed in the object.
     *
     * The object uses a mappings of:
     *
     *      className => onClickEvent
     *
     * @param cssKlass The className for the button-wrapping div.
     * @param obj The object describing the many buttons to create.
     */
    var newButtons = function( cssKlass, obj ) {
        var dom = document.createElement( 'div' );
        dom.className = cssKlass;

        for ( var k in obj ) {
            if ( obj.hasOwnProperty(k) ) {
                var button = slate.util.newElement( 'a', k );
                slate.util.click( button, obj[k] );
                dom.appendChild( button );
            }
        }

        return dom;
    }

    var TouchBar = function( dom, execute, commands ) {
        var upper  = slate.util.newElement( 'div', 'touch-bar-row upper' );
        var lower  = slate.util.newElement( 'div', 'touch-bar-row lower' );
        var barDom = slate.util.newElement( 'div', 'touch-bar', upper, lower );

        var view   = new TouchView( barDom );

        this.view  = view;

        this.bar   = barDom;
        this.row   = null;
        this.lower = lower;
        this.upper = upper;

        var controlsDom = newButtons( 'touch-controls', {
                'touch-controls-run'   : function() {
                    view.validate( function() {
                        var js = view.toJS();
                        execute( 'js', js, function() {
                            view.clear();
                        } );
                    } );
                },
                'touch-controls-redo'  : function() {
                    /* todo: perform a redo */
                },
                'touch-controls-undo'  : function() {
                    /* todo: perform an undo */
                },
                'touch-controls-clear' : function() {
                    view.clear();
                }
        } )

        var wrap  = slate.util.newElement( 'div', 'touch-bar-wrap', barDom, controlsDom );
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

        var SMALL_EMPTY = '<span class="touch-small">&#x25cf;</span>';

        var valuesRow = new TouchRow( this.upper );

        valuesRow.append( 'var', function() {
            view.insert( new ast.VariableInput() );
        } );
        valuesRow.append( SMALL_EMPTY + ' [' + SMALL_EMPTY + ']', function() {
            view.insert( new ast.ArrayAssignment() );
        } );
        valuesRow.append( '[ &hellip; ]', function() {
            view.insert( new ast.ArrayLiteral() );
        } );
        valuesRow.append( '123', function() {
            view.insert( new ast.NumberInput() );
        } );
        valuesRow.append( '"text"', function() {
            view.insert( new ast.StringInput() );
        } );
        valuesRow.append( 'true', function() {
            view.insert( new ast.TrueLiteral() );
        } );
        valuesRow.append( 'false', function() {
            view.insert( new ast.FalseLiteral() );
        } );

        valuesRow.append( '/ ' + SMALL_EMPTY + ' /', function() {
            view.insert( new ast.RegExpInput() );
        } );
        valuesRow.append( '[ ' + SMALL_EMPTY + ' &hellip; ' + SMALL_EMPTY + ' )', function() {
            // todo new *exlusive* range
        } );
        valuesRow.append( '[ ' + SMALL_EMPTY + ' &hellip; ' + SMALL_EMPTY + ' ]', function() {
            // todo new *inclusive* range
        } );

        addSection( this, 'values', valuesRow );

        /*
         * Structural commands, like operators.
         */

        var opsRow = new TouchRow( this.upper );

        var replaceWithDoubleOp = function( op ) {
            var current = view.getCurrent();

            current.replace( op );
            view.setCurrent( op );
            op.left.replace( current );

            view.selectEmpty();
        }

        for ( var i = 0; i < descriptors.length; i++ ) {
            (function(descriptor) {
                opsRow.append(
                        SMALL_EMPTY + ' ' + descriptor.html + ' ' + SMALL_EMPTY,
                        function() { replaceWithDoubleOp( new ast.DoubleOp(descriptor, descriptors) ); }
                )
            })( descriptors[i] );
        }

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
