"use strict";

window.slate = window.slate || {};
window.slate.TouchBar = (function() {
    var COMMAND_TO_SYMBOL = {
            'sqrt' : String.fromCharCode( 8730 ),
            'sum'  : String.fromCharCode( 8721 )
    }

    var SYMBOL_TO_COMMAND = (function() {
        var symToCmd = {};

        for ( var cmd in COMMAND_TO_SYMBOL ) {
            if ( COMMAND_TO_SYMBOL.hasOwnProperty(cmd) ) {
                var sym = COMMAND_TO_SYMBOL[cmd];
                symToCmd[ sym ] = cmd;
            }
        }

        return symToCmd;
    })();

    var SMALL_EMPTY = '<span class="touch-small">&#x25cf;</span>';

    var INPUT_WIDTH_PADDING = 4;

    /*
     * Helpers.
     *
     * These are helper functions, for the evaluation stage.
     * It's mostly for the runtime error checks rather than for the logic.
     */

    var pipeWrapper = function( ast ) {
        return function() {
            return ast.evaluateParams( arguments );
        }
    }

    var pipeJSWrapper = function( ast ) {
        return '(function() { ' +
                    ast.toJSArguments() +
               '})';
    }

    var readHelper = function( obj, prop ) {
        if ( obj === null ) {
            throw new Error( "reading from 'null' object" );
        } else if ( obj === undefined ) {
            throw new Error( "reading from 'undefined' object" );
        } else {
            return obj[prop];
        }
    }

    var assignHelper = function( obj, prop, expr ) {
        if ( obj === null ) {
            throw new Error( "assigning to 'null' object" );
        } else if ( obj === undefined ) {
            throw new Error( "assigning to 'undefined' object" );
        } else {
            return obj[prop] = expr;
        }
    }

    var toJSHelper = function( obj, name, params, addArgs ) {
        var strParams = params.join( '), (' );
        if ( strParams.length > 0 ) {
            strParams = '( ' + strParams + ' )';
        }

        if ( addArgs ) {
            if ( obj ) {
                return '(slate.runtime.callObj( ' + obj + ', "' + name + '", [' + strParams + '], arguments ))';
            } else {
                return '(slate.runtime.call( window.' + name + ', [' + strParams + '], arguments ))';
            }
        } else if ( obj ) {
            return '(' + obj + ').' + name + '(' + params.join(', ') + ')';
        } else {
            return name + '(' + params.join(', ') + ')';
        }
    }

    var evaluateHelper = function( desc, obj, name, params ) {
        if ( obj[name] === undefined ) {
            throw new Error( desc + " not found, " + name );
        } else {
            var fun = obj[ name ];

            if ( ! slate.util.isFunction(fun) ) {
                throw new Error( desc + " is not a " + desc + ", " + name );
            } else {
                return fun.apply( obj, params );
            }
        }
    }

    /*
     * Utility prototypes.
     */

    var Events = function( target ) {
        var events = [];

        var fun = function( ev ) {
            events.push( ev );
        }
        
        fun.run = function() {
            for ( var i = 0; i < events.length; i++ ) {
                events[i].apply( target, arguments );
            }
        }

        return fun;
    }

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

    ast.Node = (function() {
                this.dom = slate.util.newElement( 'div', 'touch-ast' );

                this.up = null;

                this.view = null;

                this.onClick = new Events( this );
                var self = this;

                slate.util.click( this.dom, function(ev) {
                    if ( self.isSelected() ) {
                        self.onClick.run();
                    } else {
                        self.getView().setCurrent( self );
                    }

                    ev.stopPropagation();
                } );

                this.setupDeleteButton();
            }).

            /*
             * Blank, but required, methods.
             */
            require({
                /**
                 * Runs this node,
                 * and the result is then returned.
                 *
                 * @return The result of running this node.
                 */
                evaluate: function() { },

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
                validate: function( onError ) { },

                /**
                 * @return The JavaScript equivalent for this node, if executed.
                 */
                toJS: function() { }
            }).

            /*
             * Marker functions,
             *
             * These return 'false' by default, and you override them
             * to have them return different values.
             */
            extend({
                allowsEmpties: function() {
                    return false;
                },

                isEmpty: function() {
                    return false;
                },

                isAssignable: function() {
                    return false;
                },

                /**
                 * Returns true, if the operator can be considered some type of command.
                 *
                 * For example:
                 *  - a function call
                 *  - a method call
                 *  - an expression which is then evaluated as a function
                 *  - a function object which is being evaluated
                 *
                 * @return True if this ast node can be considered some type of executing function; false if not.
                 */
                isCommandable: function() {
                    return false;
                },

                isPipeReceiver: function() {
                    return false;
                },

                /**
                 * Used for finding something,
                 * which can take a pipe.
                 * 
                 * Pipes come in two directions:
                 *  - literal values: gets passed into the pip
                 *  - function/methods: they are given the pipe, and chose to call it
                 */
                findPipeReceiver: function( callback ) {
                    return false;
                }
            }).

            extend({
                onTransitionEnd: function( tEnd ) {
                    slate.util.transitionEnd( this.getDom(), tEnd );
                },

                setupDeleteButton: function() {
                    var self = this;

                    var deleteNode = slate.util.newElement( 'a', 'touch-ast-delete' );
                    slate.util.click( deleteNode, function(ev) {
                        ev.stopPropagation();

                        self.replace( new ast.Empty() )
                    } )

                    this.dom.appendChild( deleteNode );
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
                /*
                 * This is built in a way so that it can call it's self
                 * recursively, by always checking before it makes a change.
                 *
                 * It also has a lock, to ignore recursive calls.
                 */
                replace: function( ast ) {
                    if ( this.replaceLock ) {
                        return this;
                    } else {
                        this.replaceLock = true;

                        var parentNode = this.dom.parentNode;
                        if ( parentNode !== null ) {
                            this.dom.parentNode.replaceChild( ast.getDom(), this.dom );
                        }

                        var parentAst = this.getParent();
                        if ( parentAst !== null ) {
                            parentAst.replaceChild( this, ast );
                            ast.setParent( parentAst );
                        }

                        var view = this.getView();
                        if ( view ) {
                            if ( this.isSelected() ) {
                                view.setCurrent( ast );
                            }

                            view.hideError();
                        }

                        /*
                         * If being replaced with an empty,
                         * animate out.
                         */
                        if ( ast.isEmpty() ) {
                            ast.add( this );
                            this.addClass( 'pre-remove' );

                            (function() {
                                this.removeClass( 'pre-remove' );
                                this.addClass( 'remove' );

                                this.onTransitionEnd( (function() {
                                    var dom = this.getDom();
                                    var parentDom = dom.parentNode;

                                    if ( parentDom ) {
                                        parentDom.removeChild( dom );
                                    }
                                }).bind(this) )
                            }).later( this );
                        }
                        
                        this.replaceLock = false;

                        return this;
                    }
                },

                evaluateCallback: function( onSuccess ) {
                    var self = this;

                    setTimeout( function() {
                        var r = undefined;

                        try {
                            r = self.evaluate();
                        } catch ( err ) {
                            r = err;
                            
                            // Keep! for debugging
                            console.log( err.stack );
                        }

                        onSuccess.callLater( null, r );
                    }, 0 );
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
                 *
                 * @param value This can optionally take 'value' as a hint, for a future implementation.
                 * @return An empty node, or null if none found. This specifically always returns null.
                 */
                getEmpty: function( value ) {
                    return null;
                },

                /**
                 * The value can be anything you want,
                 * and is there specifically to pass on data,
                 * for a future implementation.
                 *
                 * @param value. An optional value to pass on to this nodes 'getEmpty'.
                 */
                findEmpty: function( value ) {
                    var empty = this.getEmpty( value );

                    if ( empty ) {
                        return empty;
                    } else if ( this.hasParent() ) {
                        return this.getParent().findEmpty();
                    }
                },

                insertBefore: function( newEl, current ) {
                    if ( current.getDom !== undefined ) {
                        current = current.getDom();
                    }

                    if ( newEl.setParent !== undefined ) {
                        newEl.setParent( this );
                    }

                    if ( newEl.getDom !== undefined ) {
                        newEl = newEl.getDom();
                    }

                    this.getDom().insertBefore( newEl, current );
                },

                add: function() {
                    for ( var i = 0; i < arguments.length; i++ ) {
                        var arg = arguments[i];

                        if ( arg instanceof HTMLElement ) {
                            this.dom.appendChild( arg );
                        } else if ( arg.getDom !== undefined ) {
                            this.dom.appendChild( arg.getDom() );

                            if ( arg.setParent !== undefined ) {
                                arg.setParent( this );
                            }
                        } else {
                            throw new Error( "unknown argument given" );
                        }
                    }
                }
            })

    ast.Empty = ast.Node.
            sub(function() {
                this.addClass( 'touch-ast-empty' );

/**
 * Disabled, because the switching just doesn't work right,
 * when on the iPad.
 */
/*
                var emptyInput = slate.util.newElement( 'input' );
                emptyInput.setAttribute( 'type', 'text' );

                this.input = emptyInput;

                var self = this;
                emptyInput.addEventListener( 'input', function(ev) {
                    var value = emptyInput.value;

                    var newInput = (value.match(/^[0-9]+$/) !== null) ?
                            new ast.NumberInput()   :
                            new ast.VariableInput() ;

                    newInput.setInputValue( emptyInput.value );

                    self.replace( newInput );

                    newInput.getInputDom().focus();

                    emptyInput.value = '';

                    ev.preventDefault();
                } );

                this.add( emptyInput, astHTML('&#x25cf;') );
*/
                this.add( astHTML('&#x25cf;') );
            }).
            override({
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
                        if ( this.hasParent() && this.getParent().allowsEmpties() ) {
                            return true;
                        } else {
                            onError( this, "node is empty" );

                            return false;
                        }
                    },

                    getEmpty: function() {
                        return this;
                    }
            } )

    ast.Literal = (function(value, klass, displayValue, jsValue) {
                ast.Node.call( this );

                if ( arguments.length < 3 ) {
                    displayValue = value + '';
                }
                if ( arguments.length < 4 ) {
                    jsValue = displayValue;
                }

                this.jsValue  = jsValue;
                this.value    = value

                this.
                        addClass( 'touch-ast-literal' ).
                        addClass( klass ).
                        dom.appendChild( astHTML(displayValue) );
            }).
            proto( ast.Node ).
            override({
                validate: function() {
                    return true;
                },

                toJS: function() {
                    return this.jsValue;
                },

                evaluate: function() {
                    return this.value;
                }
            } )

    ast.NullLiteral = ast.Literal.
            curry( null, 'touch-ast-null', 'null' ).
            sub(function() {
                this.onClick( function() {
                    this.replace( new ast.UndefinedLiteral() );
                } );
            });
    ast.UndefinedLiteral = ast.Literal.
            curry( undefined, 'touch-ast-undefined', 'undefined' ).
            sub(function() {
                this.onClick( function() {
                    this.replace( new ast.NullLiteral() );
                } );
            });

    ast.TrueLiteral = ast.Literal.
            curry( true, 'touch-ast-boolean' ).
            sub(function() {
                this.onClick( function() {
                    this.replace( new ast.FalseLiteral() );
                })
            });

    ast.FalseLiteral = ast.Literal.
            curry( false, 'touch-ast-boolean' ).
            sub(function() {
                this.onClick( function() {
                    this.replace( new ast.TrueLiteral() );
                })
            });

    /**
     * Used for things like Pi
     */
    ast.NumLiteral = (function(str, value, toJSValue) {
                ast.Literal.call( this,
                        value,
                        'touch-ast-num-literal',
                        str,
                        toJSValue || value
                )
            }).
            extend( ast.Literal )
            
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
    ast.DoubleOp = (function( meta, metas ) {
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
                
                this.preText = astText( '', 'touch-ast-op-text' );
                this.text = astText( '', 'touch-ast-op-text' );
                this.postText = astText( '', 'touch-ast-op-text' );
                this.add(
                        astText('(', 'touch-ast-left-paren'),
                        this.preText,
                        this.left,
                        this.text,
                        this.right,
                        this.postText,
                        astText(')', 'touch-ast-right-paren')
                );

                this.meta = null;
                this.setMeta( meta );

                this.onClick( function() {
                    if ( this.meta.altMeta ) {
                        this.setMeta( this.meta.altMeta );
                    }
                });
            }).
            extend( ast.Node ).
            override({
                validate: function(onError) {
                    if ( this.left.isEmpty() ) {
                        return this.left.validate( onError );
                    } else if ( this.right.isEmpty() ) {
                        return this.right.validate( onError );
                    } else {
                        if ( this.meta.validate ) {
                            return this.meta.validate( onError, this.left, this.right )
                        } else {
                            return this.left.validate( onError ) &&
                                   this.right.validate( onError );
                        }
                    }
                },

                isAssignable: function() {
                    if ( this.meta.isAssignable !== undefined ) {
                        if ( slate.util.isFunction(this.meta.isAssignable) ) {
                            return this.meta.isAssignable( this.left, this.right );
                        } else {
                            return this.meta.isAssignable;
                        }
                    } else {
                        return false;
                    }
                },

                isCommandable: function() {
                    if ( this.meta.isCommandable !== undefined ) {
                        if ( slate.util.isFunction(this.meta.isCommandable) ) {
                            return this.meta.isCommandable( this.left, this.right );
                        } else {
                            return this.meta.isCommandable;
                        }
                    } else {
                        return false;
                    }
                },

                isPipeReceiver: function() {
                    return this.meta.isPipeReceiver && this.right.isPipeReceiver();
                },

                findPipeReceiver: function( callback ) {
                    if ( this.meta.isPipeReceiver ) {
                        return this.right.findPipeReceiver( callback );
                    } else {
                        return false;
                    }
                },

                toJS: function() {
                    return this.meta.toJS( this.left, this.right );
                },

                evaluate: function() {
                    return this.meta.evaluate( this.left, this.right );
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
                 *
                 * @param other The other node to swap with.
                 * @param swapMeta Optional, and defaults to true. When true, this will only swap the 'descriptors', when given an ast.DoubleOp.
                 */
                replace: function( other, swapMeta ) {
                    if ( ! this.replaceLock ) {
                        if (
                                swapMeta !== false &&
                                other instanceof ast.DoubleOp
                        ) {
                            this.setMeta( other.getMeta() );
                        } else {
                            ast.Node.prototype.replace.call( this, other );
                        }
                    }
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

                /**
                 * Returns the empties from the child nodes.
                 *
                 * However it favours,
                 *
                 *  - if just an insertion, the opposite direction is favoured,
                 *  - required empties over optional empties
                 *  - left over right
                 *
                 * In regards to the first rule, imagine we have:
                 *
                 *      f( _ )
                 *
                 * And then insert into a doubleOp, like so:
                 *
                 *      f( _ ) * _
                 *
                 * Of the two underscores I could jump to,
                 * I will favour the one on the right,
                 * because I am building in that direction.
                 *
                 * @param Optional. True to favour the left side, false for the right, undefined for neither.
                 */
                getEmpty: function( favourLeft ) {
                    var leftEmpty = this.left.getEmpty();

                    if ( leftEmpty !== null && favourLeft === true ) {
                        return leftEmpty;
                    } else {
                        var rightEmpty = this.right.getEmpty();

                        if ( rightEmpty !== null && favourLeft === false ) {
                            return rightEmpty;
                        }
                    }

                    if ( this.left.allowsEmpties() ) {
                        return rightEmpty || leftEmpty;
                    } else {
                        return  leftEmpty || rightEmpty;
                    }
                }
            }).
            extend({
                replaceLeft: function( node ) {
                    this.left.replace( node );
                },

                replaceRight: function( node ) {
                    this.right.replace( node );
                }
            }).
            extend({
                toJSParam: function( arg ) {
                    return this.right.toJSParam( this.left.toJS(), arg );
                },

                toJSObjParam: function( obj, arg ) {
                    return this.right.toJSObjParam( this.left.toJSObj(obj), arg );
                },

                toJSArguments: function() {
                    return this.right.toJSArguments( this.left.toJS() );
                },

                toJSObjParams: function( obj, args ) {
                    return this.right.toJSObjParams( this.left.toJSObj(obj), args );
                },

                toJSPipeReceive: function( pipe ) {
                    return this.meta.toJSPipeReceive( this.left, this.right, pipe );
                },

                toJSAssignment: function( expr ) {
                    return this.meta.toJSAssignment( this.left, this.right, expr );
                }
            }).
            extend({
                evaluateParam: function( arg ) {
                    return this.right.evaluateParam( this.left.evaluate(), arg );
                },

                evaluateObjParam: function( obj, arg ) {
                    return this.right.evaluateObjParam( this.left.evaluateObj(obj), arg );
                },

                evaluateParams: function( args ) {
                    return this.right.evaluateParams( this.left.evaluate(), args );
                },

                evaluateObjParams: function( obj, args ) {
                    return this.right.evaluateObjParams( this.left.evaluateObj(obj), args );
                },

                evaluatePipeReceive: function( pipe ) {
                    return this.meta.evaluatePipeReceive( this.left, this.right, pipe );
                },

                evaluateAssignment: function( expr ) {
                    return this.meta.evaluateAssignment( this.left, this.right, expr );
                },

                getMeta: function() {
                    return this.meta;
                },

                setMeta: function( meta ) {
                    if ( this.meta !== null ) {
                        if ( this.meta.css ) {
                            this.dom.classList.remove( this.meta.css );
                        }
                    }

                    this.preText .innerHTML = meta.preHtml  || '' ;
                    this.text    .innerHTML = meta.html           ;
                    this.postText.innerHTML = meta.postHtml || '' ;

                    if ( meta.css ) {
                        this.dom.classList.add.callLater( meta.css );
                    }
                    
                    this.meta = meta;

                    this.validateLeft();
                    this.validateRight();
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
                }
            } );

    var descriptors = (function() {
        var newOps = function( name, alt, sym, print, fun ) {
            return {
                    name    : name,
                    alt     : alt,
                    html    : sym,
                    evaluate: function(left, right) {
                        var l = left.evaluate(),
                            r = right.evaluate();

                        return fun( l, r );
                    },
                    toJS    : function( left, right ) {
                        return '(' + left.toJS() + ' ' + print + ' ' + right.toJS() + ')';
                    }
            }
        }

        var newOpsEval = function( name, alt, sym, print, fun ) {
            return {
                    name    : name,
                    alt     : alt,
                    html    : sym,
                    evaluate: fun,
                    toJS    : function( left, right ) {
                        return '(' + left.toJS() + ' ' + print + ' ' + right.toJS() + ')';
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

                        validate: function( onError, left, right ) {
                            if ( ! left.isAssignable() ) {
                                onError( left, "illegal assignment" );
                                return false;
                            } else {
                                return left.validate( onError ) &&
                                       right.validate( onError );
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
                        evaluate: function( left, right ) {
                            var rightR = right.evaluate();
                            left.evaluateAssignment( rightR );

                            return rightR;
                        },

                        toJS: function( left, right ) {
                            return left.toJS() + ' = ' + right.toJS();
                        }
                },

                /*
                 *      foo[ bar ]
                 */
                {
                    name: 'array access',
                    alt: 'property access',
                     
                    html: '[',
                    postHtml: ']',

                    toJS: function( left, right ) {
                        return '(' + left.toJS() + ')[' + right.toJS() + '] ';
                    },

                    toJSAssignment: function( left, right, expr ) {
                        return '(' + left.toJS() + ')[' + right.toJS() + '] = ' + expr;
                    },

                    evaluate: function( left, right ) {
                        var index = right.evaluate();
                        return readHelper( left.evaluate(), index );
                    },

                    evaluateAssignment: function( left, right, expr ) {
                        var index = right.evaluate();
                        var obj = left.evaluate();

                        assignHelper( obj, index, expr );

                        return expr;
                    },

                    isAssignable: function() {
                        return true;
                    }
                },

                /*
                 *      foo.bar
                 */
                {
                    name: 'property access',
                    alt: 'array access',
                    html: '.',

                    validate: function( onError, left, right ) {
                        if (
                                ! (right instanceof ast.VariableInput) &&
                                ! (right instanceof ast.Command)
                        ) {
                            return onError( right, "invalid construct for property/method access" );
                        } else {
                            return left.validate( onError ) && right.validate( onError );
                        }
                    },

                    isPipeReceiver: true,

                    isCommandable: function( left, right ) {
                        return right.isCommandable();
                    },

                    isAssignable: function( left, right ) {
                        return right.isAssignable();
                    },

                    toJS: function( left, right ) {
                        return '(' + left.toJS() + ').' + right.toJS() + ' ';
                    },

                    toJSPipeReceive: function( left, right, pipe ) {
                        return right.toJSObjPipeReceive( left.toJS(), pipe );
                    },

                    toJSAssignment: function( left, right, expr ) {
                        return right.toJSObjAssignment( left.toJS(), expr );
                    },

                    evaluate: function( left, right ) {
                        return right.evaluateObj( left.evaluate() );
                    },

                    evaluatePipeReceive: function( left, right, pipe ) {
                        return right.evaluateObjPipeReceive( left.evaluate(), pipe );
                    },

                    evaluateAssignment: function( left, right, expr ) {
                        return right.evaluateObjAssignment( left.evaluate(), expr );
                    }
                },

                {
                    name: 'pipe',
                    html: '|>',

                    validateRight: function( right ) {
                        return right.isCommandable();
                    },

                    validate: function( onError, left, right ) {
                        if ( ! right.isCommandable() ) {
                            return onError( right, "right node cannot accept expressions being piped in" );
                        } else {
                            return left.validate( onError ) && right.validate( onError );
                        }
                    },

                    /*
                     * If left is a command
                     *      -> push this as a function into the left, for it to pipe into
                     * otherwise ...
                     *      -> echo whatever is on the left, into this
                     */
                    /*
                    toJS: function( left, right ) {
                        var leftStr = left.findPipeReceiver( function(cmd) {
                            return cmd.toJS( '(function() { ' + right.toJS() + ' })' );
                        } )

                        if ( leftStr ) {
                            return leftStr;
                        } else {
                            return 'echo( ' + left.toJS() + ', (function() { ' + right.toJS() + ' }) )';
                        }
                    },
                    */

                    toJS: function( left, right ) {
                        if ( left.isPipeReceiver() ) {
                            return left.toJSPipeReceive( pipeJSWrapper(right) );
                        } else {
                            return right.toJSParam( left.toJS() );
                        }
                    },

                    evaluate: function( left, right ) {
                        if ( left.isPipeReceiver() ) {
                            return left.evaluatePipeReceive( pipeWrapper(right) );
                        } else {
                            return right.evaluateParam( left.evaluate() );
                        }
                    }
                },

                newOps( 'add'               , 'subtract'            , '+'       , '+'  , function(l, r) { return l + r } ),
                newOps( 'subtract'          , 'add'                 , '-'       , '-'  , function(l, r) { return l - r } ),
                newOps( 'multiply'          , 'divide'              , '&times;' , '*'  , function(l, r) { return l * r } ),
                newOps( 'divide'            , 'multiply'            , '&#xf7;'  , '/'  , function(l, r) { return l / r } ),

                newOps( 'equal'             , 'not equal'           , '&equiv;' , '===', function(l, r) { return l === r } ),
                newOps( 'not equal'         , 'equal'               , '&ne;'    , '!==', function(l, r) { return l !== r } ),
                newOps( 'greater than equal', 'greater than'        , '&ge;'    , '>=' , function(l, r) { return l >=  r } ),
                newOps( 'less than equal'   , 'less than'           , '&le;'    , '<=' , function(l, r) { return l <=  r } ),
                newOps( 'greater than'      , 'greater than equal'  , '&gt;'    , '>'  , function(l, r) { return l >   r } ),
                newOps( 'less than'         , 'less than equal'     , '&lt;'    , '<'  , function(l, r) { return l <   r } ),

                newOpsEval( 'and'               , 'or'                  , 'and'     , '&&' , function(l, r) { return l && r } ),
                newOpsEval( 'or'                , 'add'                 , 'or'      , '||' , function(l, r) { return l || r } ),

                newOps( 'bitwise and'       , 'bitwise or'          , '&amp;'   , '&'  , function(l, r) { return l & r  } ),
                newOps( 'bitwise or'        , 'bitwise and'         , '|'       , '|'  , function(l, r) { return l | r  } ),

                newOps( 'left shift'        , 'right shift'         , '&#x226a;', '<<' , function(l, r) { return l << r } ),
                newOps( 'right shift'       , 'left shift'          , '&#x226b;', '>>' , function(l, r) { return l >> r } )
        ]
    })();

    /**
     * Convert the Description Array into a mapping of name => description,
     * and perform some assertions to ensure none are missing,
     * and stuff like that.
     */
    var descMappings = (function( descriptors ) {
        var descMappings = {}

        descriptors.forEach( function(desc) {
            assert(
                    ! descMappings.hasOwnProperty(desc.name),
                    "duplicate desciption mapping name: " + desc.name
            );

            assertString( desc.html, "html display is missing" );
            assertFun( desc.evaluate, "evaluation function is missing" );
            assert(
                    (desc.isPipeReceiver === true) === slate.util.isFunction(desc.evaluatePipeReceive),
                    "descriptor '" + desc.name + "' is a pipe receiver, but does not have an 'evaluatePipeReceive' method."
            );
            assert(
                    (desc.isPipeReceiver === true) === slate.util.isFunction(desc.toJSPipeReceive),
                    "descriptor '" + desc.name + "' is a pipe receiver, but does not have an 'toJSPipeReceive' method."
            );

            assert(
                    !!( desc.isAssignable === true || slate.util.isFunction(desc.isAssignable) ) ===
                            slate.util.isFunction( desc.evaluateAssignment ),
                    "descriptor '" + desc.name + "' is assignable, but does not have an 'evaluateAssignment' method."
            );
            assert(
                    !!( desc.isAssignable === true || slate.util.isFunction(desc.isAssignable) ) ===
                            slate.util.isFunction( desc.toJSAssignment ),
                    "descriptor '" + desc.name + "' is assignable, but does not have an 'toJSAssignment' method."
            );

            descMappings[ desc.name ] = desc;
        } );

        descriptors.forEach( function(desc) {
            assert(
                    desc.alt === undefined || descMappings.hasOwnProperty( desc.alt ),
                    "alternative double op description not found: " + desc.alt
            )

            desc.altMeta = descMappings[ desc.alt ];
        } )

        return descMappings;
    })( descriptors );

    /**
     * Returns the width of the text given,
     * for a 'touch-ast-input > input' node.
     *
     * @param text The text to measure the width of.
     * @return The width, in pixels, but as an int. i.e. '400' not '400px'.
     */
    var textWidth = (function() {
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
    ast.Input =
            (function( type, cssKlass, defaultVal, emptyAllowed ) {
                ast.Node.call( this );

                var inputDom = document.createElement( 'input' );
                inputDom.setAttribute( 'type', type );

                inputDom.setAttribute( 'autocapitalize', "off" );
                inputDom.setAttribute( 'autocorrect'   , "off" );

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

                this.onInput = new Events( this );

                var self = this;
                this.input.addEventListener( 'keyup', function(ev) {
                    // enter key
                    if ( ev.which === 13 ) {
                        self.input.blur();
                        self.getView().execute();
                    }
                } );
                this.input.addEventListener( 'input', function(ev) {
                    self.resizeInput();
                    self.onInput.run();

                    self.getView().hideError();
                } );

                this.resizeInput();

                this.onClick(function() {
                    self.input.focus();
                });
            }).
            extend( ast.Node ).
            override({
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
                        this.resizeInput();
                        this.input.focus();
                    },

                    /**
                     * This is overridden,
                     * because when it gets inserted,
                     * the view will try to find a new empty node.
                     *
                     * Overriding this allows this to stay selected.
                     *
                     * Note that we don't override 'getEmpty',
                     * so that if other elements are doing the finding,
                     * they can move on to a different node.
                     * 
                     * @return This input node.
                     */
                    findEmpty: function() {
                        return this;
                    },

                    replace: function( other ) {
                        ast.Node.prototype.replace.call( this, other );

                        // copy this value across
                        if ( other.setInputValue !== undefined ) {
                            other.setInputValue( this.getInputValue() );
                        }
                    }
            }).
            after({
                    onUnselect: function() {
                        this.input.classList.remove( 'multi-change' );
                    },
            }).
            extend({
                    resizeInput: function() {
                        (function() {
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

                            this.input.style.width = INPUT_WIDTH_PADDING + textWidth( this.input.value ) + 'px';
                        }).later( this );
                    },

                    getInputDom: function() {
                        return this.input;
                    },

                    setInputValue: function( val ) {
                        this.input.value = val;

                        this.resizeInput();

                        return this;
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
            } )

    ast.RegExpInput = ast.Input.
            curry(
                    'text',
                    'touch-ast-regexp',
                    undefined,
                    true
            ).
            sub(function() {
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
            }).
            override({
                    validate: function() {
                        return this.isRegExpValid();
                    },
                    evaluate: function() {
                        return new RegExp( this.getInputValue() );
                    },
                    toJS: function() {
                        return "new RegExp( \"" + addSlashes(this.getInputValue()) + "\" )";
                    } 
            }).
            extend({
                    isRegExpValid: function() {
                        try {
                            new RegExp( this.getInputValue() );
                            return true;
                        } catch ( err ) {
                            return false;
                        }
                    }
            })

    ast.StringInput = ast.Input.
            curry(
                    'text',
                    'touch-ast-string',
                    undefined,
                    true
            ).
            sub( function() {
                /*
                 * This is here to wrap the constructor,
                 * so we can inject two extra text nodes,
                 * around the input element.
                 */
                var dom = this.getDom();

                dom.insertBefore( astText('"'), this.getInputDom() );
                dom.appendChild( astText('"') );
            }).
            override( ast.Input, {
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

    ast.NumberInput = ast.Input.
            curry(
                    'number',
                    'touch-ast-number',
                    '',
                    false
            ).
            override({
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

    ast.VariableInput = ast.Input.
            curry(
                    'text',
                    'touch-ast-variable',
                    '',
                    false
            ).
            sub(function() {
                this.onInput( function() {
                    if ( isValidIdentifier(this.getInputValue()) ) {
                        this.removeError()
                    } else {
                        this.setError()
                    }
                } )
            }).
            override( ast.Input, {
                    validate: function( onError ) {
                        var str = this.getInputValue()

                        if ( str.length === 0 ) {
                            return onError( this, "no variable name provided" )
                        } else if ( ! isValidIdentifier(str) ) {
                            return onError( this, "invalid variable name given" )
                        } else {
                            return true
                        }
                    },

                    toJS: function() {
                        return this.getInputValue()
                    },

                    evaluate: function() {
                        return window[ this.getInputValue() ]
                    },

                    isAssignable: function() {
                        return true
                    }
            }).
            extend({
                    toJSObj: function( obj ) {
                        return obj + '.' + this.getInputValue()
                    },

                    toJSAssignment: function( obj, expr ) {
                        return this.getInputValue() + ' = ' + expr;
                    },

                    toJSObjAssignment: function( obj, expr ) {
                        return obj + '.' + this.getInputValue() + ' = ' + expr;
                    },

                    evaluateObj: function( obj ) {
                        return obj[ this.getInputValue() ];
                    },

                    evaluateAssignment: function( expr ) {
                        window[ this.getInputValue() ] = expr
                    },

                    evaluateObjAssignment: function( obj, expr ) {
                        assignHelper( obj, this.getInputValue(), expr );
                    }
            })

    ast.Command = ast.VariableInput.
            sub(function(name, display) {
                name = name || '';
                
                if ( display !== undefined ) {
                    var div = document.createElement( 'div' );
                    div.innerHTML = display;
                    display = div.textContent;
                } else {
                    display = name;
                }

                this.setInputValue( display );

/*
                if ( name !== '' ) {
                    (function() {
                        this.getInputDom().blur();
                    }).later( this );
                }
*/

                this.params = new Array();
                
                this.
                        removeClass( 'touch-ast-variable' ).
                        addClass( 'touch-ast-command' );

                this.insertBefore(
                        astText( '(', 'touch-ast-left-paren' ),
                        this.getInputDom()
                )

                this.rightParen = astText(')', 'touch-ast-right-paren'),
                this.add( this.rightParen )

                this.insertNewEmpty();
            }).
            override({
                    getInputValue: function() {
                        var val = ast.Input.prototype.getInputValue.call( this );
                        var alt = SYMBOL_TO_COMMAND[val];

                        if ( alt ) {
                            return alt;
                        } else {
                            return val;
                        }
                    }
            }).
            override({
                    findPipeReceiver: function( callback ) {
                        return callback( this );
                    },

                    isPipeReceiver: function() {
                        return true;
                    },

                    isCommandable: function() {
                        return true;
                    },

                    allowsEmpties: function() {
                        return true;
                    },

                    toJS: function() {
                        var strParams = this.getNonEmptyParams().map( 'toJS' );
                        for ( var i = 0; i < arguments.length; i++ ) {
                            strParams.push( arguments[i] );
                        }

                        return this.getInputValue() +
                                '( ' +
                                    strParams.join( ', ' ) +
                                ' )'
                    },

                    toJSObj: function( obj ) {
                        var args = new Array( arguments.length-1 );
                        for ( var i = 0; i < args.length; i++ ) {
                            args[i] = arguments[i+1];
                        }

                        return obj + '.' + this.toJS.apply( this, args )
                    },

                    validate: function( onError ) {
                        return this.params.inject( true, function(sum, p) {
                            return p.validate( onError ) && sum
                        } )
                    },

                    evaluate: function() {
                        return evaluateHelper(
                                'function',
                                window, 
                                this.getInputValue(),
                                this.getNonEmptyParams().map( 'evaluate' )
                        )
                    },

                    evaluateObj: function( obj ) {
                        return evaluateHelper(
                                'method',
                                obj, 
                                this.getInputValue(),
                                this.getNonEmptyParams().map( 'evaluate' )
                        )
                    }
            }).
            extend((function() {
                var replaceLeftRight = function( node ) {
                    for ( var i = 0; i < this.params.length; i++ ) {
                        if ( this.params[i].isEmpty() ) {
                            return this.replaceChild( this.params[i], node );
                        }
                    }
                }

                return {
                        replaceLeft : replaceLeftRight,
                        replaceRight: replaceLeftRight
                }
            })()).
            extend({
                    toJSParam: function( arg ) {
                        var params = this.getNonEmptyParams().map( 'toJS' );
                        params.push( arg );

                        return toJSHelper(
                                null, 
                                this.getInputValue(),
                                params
                        )
                    },

                    toJSArguments: function() {
                        var params = this.getNonEmptyParams().map( 'toJS' );

                        return toJSHelper(
                                null, 
                                this.getInputValue(),
                                params,
                                true
                        )
                    },

                    /**
                     * toJS, but with a arguments provided,
                     * already turned into JavaScript.
                     *
                     * @param args The arguments to attach on top of this function call.
                     */
                    toJSObjParams: function( obj, args ) {
                        var params = this.getNonEmptyParams().map( 'toJS' );
                        for ( var i = 0; i < args.length; i++ ) {
                            params.push( args[i] );
                        }

                        return toJSHelper(
                                obj, 
                                this.getInputValue(),
                                params
                        )
                    },

                    toJSPipeReceive: function( pipe ) {
                        var params = this.getNonEmptyParams().map( 'toJS' );
                        params.push( pipe );

                        return toJSHelper(
                                null, 
                                this.getInputValue(),
                                params
                        )
                    },

                    toJSObjPipeReceive: function( obj, pipe ) {
                        var params = this.getNonEmptyParams().map( 'toJS' );
                        params.push( pipe );

                        return toJSHelper(
                                obj, 
                                this.getInputValue(),
                                params
                        )
                    }
            }).
            extend({
                    /**
                     * Run as a function, with extra arguments provided, already evaluated.
                     */
                    evaluateParam: function( arg ) {
                        var params = this.getNonEmptyParams().map( 'evaluate' );
                        params.push( arg );

                        return evaluateHelper(
                                'function',
                                window, 
                                this.getInputValue(),
                                params
                        )
                    },

                    evaluateParams: function( args ) {
                        var params = this.getNonEmptyParams().map( 'evaluate' );
                        for ( var i = 0; i < args.length; i++ ) {
                            params.push( args[i] );
                        }

                        return evaluateHelper(
                                'function',
                                window, 
                                this.getInputValue(),
                                params
                        )
                    },

                    evaluateObjParams: function( obj, args ) {
                        var params = this.getNonEmptyParams().map( 'evaluate' );
                        for ( var i = 0; i < args.length; i++ ) {
                            params.push( args[i] );
                        }

                        return evaluateHelper(
                                'function',
                                obj, 
                                this.getInputValue(),
                                params
                        )
                    },

                    evaluatePipeReceive: function( pipe ) {
                        var params = this.getNonEmptyParams().map( 'evaluate' );
                        params.push( pipe );

                        return evaluateHelper(
                                'function',
                                window, 
                                this.getInputValue(),
                                params
                        )
                    },

                    evaluateObjPipeReceive: function( obj, pipe ) {
                        var params = this.getNonEmptyParams().map( 'evaluate' );
                        params.push( pipe );

                        return evaluateHelper(
                                'method',
                                obj, 
                                this.getInputValue(),
                                params
                        )
                    }
            }).
            override({
                findEmpty: function() {
                    if ( this.getInputValue() === '' ) {
                        return this;
                    } else {
                        var empty = this.getEmpty();

                        if ( empty !== null ) {
                            return empty;
                        } else if ( this.hasParent() ) {
                            return this.getParent().findEmpty();
                        }
                    }
                },

                getEmpty: function() {
                    var params = this.params;
                    var firstEmpty  = -1,
                        hasSelected = false;

                    /*
                     * There are two types of empties we are looking for:
                     *  - The first empty after the selected parameter
                     *  - the earliest non-empty parameter
                     *
                     * We chose in those two orders,
                     * where the first has a higher priority.
                     */
                    for ( var i = 0; i < params.length; i++ ) {
                        var param = params[i];

                        if ( param.isSelected() && ! param.isEmpty() ) {
                            hasSelected = true;
                        } else if ( param.isEmpty() ) {
                            if ( hasSelected ) {
                                firstEmpty = i;
                                break;
                            } else if ( firstEmpty === -1 ) {
                                firstEmpty = i;
                            }
                        }
                    }

                    if ( firstEmpty !== -1 ) {
                        return params[firstEmpty];
                    } else {
                        return null;
                    }
                }
            }).
            override({
                replace: function( newCommand ) {
                    if ( newCommand instanceof ast.Command ) {
                        this.setInputValue( newCommand.getInputValue() );

                        // todo, animate out old text, animate in new text

                        (function() {
                            this.getView().setCurrent( this.getEmpty() )
                        }).later( this );
                    } else {
                        ast.Node.prototype.replace.call( this, newCommand )
                    }
                },

                replaceChild: function( old, newAst ) {
                    var params = this.params;
                    var replaceNode = true;

                    /**
                     * We search for the index of the last non-empty node.
                     *
                     * This is a part of a larger feature;
                     * we want to remove any trailing empty nodes.
                     *
                     * This is so over time, a command doesn't end up
                     * with 10 empty parameters.
                     */
                    var lastNonEmpty = -1;
                    var newAstI = -1;

                    for ( var i = 0; i < params.length; i++ ) {
                        var param = params[i];
                        
                        if ( replaceNode && param === old ) {
                            param = params[i] = newAst;
                            newAstI = i;

                            old.replace( newAst );
                            newAst.setParent( this );

                            replaceNode = false;
                        }
                        
                        if ( ! param.isEmpty() ) {
                            lastNonEmpty = i;
                        }
                    }

                    /*
                     * Remove the trailing empty parameters.
                     * This is up till, the last trailing empty.
                     *
                     * Add one to convert from last non-empty,
                     * to just last empty.
                     */
                    var lastEmpty = lastNonEmpty + 1;
                    if ( lastEmpty < params.length-1 ) {
                        for ( var i = lastEmpty; i < params.length-1; i++ ) {
                            this.getDom().removeChild( params[i].getDom() );
                        }

                        /*
                         * Resize, and ensure the resulting size is correct.
                         */
                        params.splice( lastEmpty, (params.length-1) - lastEmpty );
                        assert( params.length === lastEmpty+1, "incorrect number of empties following resize" );

                        /*
                         * If we delete the AST node we just added,
                         * becuase it's an empty,
                         * then select a new one.
                         */
                        this.getView().setCurrent( this.getEmpty() );
                    } else if ( lastNonEmpty === params.length-1 ) {
                        this.insertNewEmpty();
                    }

                    if ( ! replaceNode ) {
                        return this;
                    /*
                     * The node being replaced was never found.
                     *
                     * In practice this should never happen,
                     * because nodes should always be away who their
                     * parents are, and which node they are within.
                     */
                    } else {
                        assertUnreachable( "old AST node not found" );
                    }
                }
            }).
            extend({
                getNonEmptyParams: function() {
                    return this.params.filterOutMethod( 'isEmpty' );
                },

                insertNewEmpty: function() {
                    var empty = new ast.Empty();

                    this.params.push( empty );
                    this.insertBefore( empty, this.rightParen );
                },

                getFunction: function() {
                    return window[ this.getInputValue() ];
                }
            })

    /**
     * A horizontal row of options to select.
     * It's essentially a row of buttons,
     * that can be hidden and shown.
     */
    var TouchRow = function( upperDom, isDouble ) {
        this.dom    = slate.util.newElement( 'div', 'touch-bar-row-inner' );

        this.scroll = slate.util.newElement( 'div', 'touch-bar-row-inner-scroll' );
        this.dom.appendChild( this.scroll );

        if ( isDouble ) {
            this.isDouble = true;
        }

        upperDom.appendChild( this.dom );
    }

    TouchRow.prototype.show = function() {
        this.dom.classList.add( 'show' );

        return this;
    }

    TouchRow.prototype.hide = function() {
        this.dom.classList.remove( 'show' );

        return this;
    }

    var newTouchRowButton = function( item, callback ) {
        assert( item !== undefined, "'item' is undefined" );

        var dom = slate.util.newElement( 'a', 'touch-bar-button' )

        if ( window.slate.util.isString(item) ) {
            dom.innerHTML = item
        } else {
            dom.appendChild( item )
        }

        slate.util.click( dom, callback )

        return dom;
    }

    TouchRow.prototype.appendSeperator = function() {
        this.scroll.appendChild(
                slate.util.newElement( 'div', 'touch-bar-button-seperator' )
        )
        
        return this;
    }

    TouchRow.prototype.append = function( item, callback ) {
        var dom;

        if ( arguments.length > 2 ) {
            dom = slate.util.newElement( 'div', 'touch-bar-button-column' );

            for ( var i = 0; i < arguments.length; i++ ) {
                var item = arguments[i],
                    callback;

                if ( item === null ) {
                    item = '&nbsp;';
                    callback = function(ev) { /* do nothing */ };
                } else {
                    callback = arguments[i+1]

                    i++;
                }

                dom.appendChild( newTouchRowButton(item, callback) );
            }
        } else {
            dom = newTouchRowButton( item, callback );
        }

        this.scroll.appendChild( dom );

        return this;
    }
    
    /**
     * The area that displays the AST.
     */
    var TouchView = function( touchBar ) {
        var bar = slate.util.newElement( 'div', 'touch-bar-view-ast-bar' );
        this.bar = bar;

        var viewArea = slate.util.newElement( 'div', 'touch-bar-view' )
        viewArea.appendChild( bar );
        this.dom = viewArea

        this.errorDomContent = slate.util.newElement( 'div', 'touch-bar-view-error-content' );

        var errInnerDom = slate.util.newElement( 'div', 'touch-bar-view-error-inner' );
        errInnerDom.appendChild( this.errorDomContent );
        errInnerDom.appendChild( slate.util.newElement('div', 'touch-bar-view-error-tail' ) );

        this.errorDom = slate.util.newElement( 'div', 'touch-bar-view-error' );
        this.errorDom.appendChild( errInnerDom );

        viewArea.appendChild( this.errorDom );

        this.current = null

        this.selectLater = null;

        this.setAST( new ast.Empty() )

        this.touchBar = touchBar;
    }

    TouchView.prototype = {
            execute: function() {
                if ( this.touchBar ) {
                    this.touchBar.execute();
                }
            },

            touchBar: function( touchBar ) {
                if ( arguments.length === 0 ) {
                    return this.touchBar;
                } else {
                    this.touchBar = touchBar;
                }
            },

            getDom: function() {
                return this.dom;
            },

            showError: function( node, msg ) {
                if ( ! this.errorDom.classList.contains('show') ) {
                    slate.util.getDomLocation(
                            node.getDom(),
                            this.dom,

                            (function(left, top) {
                                var bottom = this.dom.clientHeight - top;
                                left += node.getDom().clientWidth/2;

                                this.errorDom.style.left   = left   + 'px';
                                this.errorDom.style.bottom = bottom + 'px';
                            }).bind(this)
                    );

                    this.errorDomContent.textContent = msg;
                    this.errorDom.classList.add( 'show' );
                }
            },
            hideError: function() {
                this.errorDom.classList.remove( 'show' );
            },

            clear: function() {
                this.setAST( new ast.Empty() );
            },

            validate: function( callback ) {
                var self = this;
                var success = this.getRootAST().validate(function(node, errMsg) {
                    self.showError( node, errMsg );

                    // todo, display the error
                    
                    return false
                } );

                console.log( success );

                if ( success ) {
                    callback.later();
                }
            },

            toJS: function() {
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

                if ( this.selectLater !== null ) {
                    clearTimeout( this.selectLater );
                }

                this.current.onEverySelect()

                return this;
            },

            getRootAST: function() {
                var root = null;
                for (
                        var current = this.current;
                        current !== null;
                        current = current.getParent()
                ) {
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
                    this.bar.removeChild( this.getRootAST().getDom() );
                    this.current = null;
                }

                this.bar.appendChild( ast.getDom() );
                this.setCurrent( ast );
            },

            /**
             * insertLeft and insertRight are identical,
             * except for a single line.
             *
             * So the implementations are here,
             * with a boolean flag used to differentiate
             * between them.
             */
            insertLeftRight: function( node, isLeft ) {
                var current = this.getCurrent();

                if ( current.isEmpty() && current.hasParent() ) {
                    current = current.getParent();
                }

                current.replace( node, false );
                node.setView( this );
                
                if ( !current.isEmpty() && node.replaceRight !== undefined ) {
                    /*
                     * Yes I know, these are the wrong way round.
                     *
                     *   isLeft -> replaceRight
                     *  !isLeft -> replaceLeft
                     */
                    if ( isLeft ) {
                        node.replaceRight( current );
                    } else {
                        node.replaceLeft( current );
                    }
                }

                /*
                 * isLeft param here is to say we
                 * favour the one on the left,
                 * when it searches for an empty node.
                 */
                this.selectEmpty( node, isLeft );
            },

            insertLeft: function( node ) {
                return this.insertLeftRight( node, true );
            },

            insertRight: function( node ) {
                return this.insertLeftRight( node, false );
            },

            /**
             * Inserts a node into the currently empty space.
             */
            insert: function( node ) {
                this.current.replace( node );
                this.current.setView( this );
                this.selectEmpty( this.current );
            },

            selectEmpty: function( node, findEmptyVal ) {
                node = ( node || this.current );
                this.setCurrent( node.findEmpty(findEmptyVal) || node );
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

    var newShiftButton = function( fun, key ) {
        var dom  = slate.util.newElement( 'a', 'touch-shift-button' );

        var onDownFun = function() {
            dom.classList.toggle( 'highlight' )
            fun( dom.classList.contains('highlight') )
        }

        var isDown = false;
        document.getElementsByTagName('body')[0].addEventListener( 'keydown', function( ev ) {
            if ( ev.which === key ) {
                if ( ! isDown ) {
                    onDownFun();
                    isDown = true;
                }
            }
        })

        document.getElementsByTagName('body')[0].addEventListener( 'keyup', function( ev ) {
            if ( ev.which === key ) {
                if ( isDown ) {
                    onDownFun();
                    isDown = false;
                }
            }
        })

        slate.util.press( dom, onDownFun, onDownFun );

        return dom;
    }

    var ShiftButtons = function() {
        var self = this;

        var left = newShiftButton(function(isDown) {
            self.hasLeft = isDown;
        }, 81)
        var right = newShiftButton(function(isDown) {
            self.hasRight = isDown;
        }, 87)

        this.hasLeft  = false;
        this.hasRight = false;

        this.dom = slate.util.newElement( 'div', 'touch-shift', left, right );
    }

    ShiftButtons.prototype = {
            isLeft: function() {
                return this.hasLeft;
            },

            isRight: function() {
                return this.hasRight;
            },

            getDom: function() {
                return this.dom;
            }
    }

    /**
     * The actual bar it's self.
     *
     * This is the top component, and the public facing API.
     */
    var TouchBar = function( parentDom, execute, commands ) {
        this.executeFun = execute;

        var upper  = slate.util.newElement( 'div', 'touch-bar-row upper' );
        var lower  = slate.util.newElement( 'div', 'touch-bar-row lower' );
        this.buttons = new ShiftButtons();

        var barDom = slate.util.newElement( 'div', 'touch-bar',
                upper,
                lower,
                this.buttons.getDom()
        )

        this.lower = lower;
        this.upper = upper;

        this.bar   = barDom;
        this.row   = null;
        this.view  = null;

        parentDom.appendChild(
                slate.util.newElement( 'div', 'touch-bar-wrap',
                        barDom,
                        this.newControls()
                )
        )

        this.newTouchView();

        /**
         * Add the initial commands
         */

        var insert = this.insert.bind( this );

        var commandsRow = new TouchRow( this.upper, true );
        commandsRow.append(
                SMALL_EMPTY,
                function() {
                    insert( new ast.Command() )
                },

                null
        )

        commands = commands.sort();
        for ( var i = 0; i < commands.length; i += 2 ) {
            if ( i === commands.length-1 ) {
                (function(cmd) {
                    var cmdAlt = COMMAND_TO_SYMBOL[cmd];

                    commandsRow.append(
                            ( cmdAlt ? cmdAlt : cmd ),
                            function() {
                                insert( new ast.Command(cmd, cmdAlt) );
                            },
                            
                            null
                    );
                })( commands[i] );
            } else {
                (function(top, bottom) {
                    var topAlt    = COMMAND_TO_SYMBOL[top];
                    var bottomAlt = COMMAND_TO_SYMBOL[bottom];

                    commandsRow.append(
                            ( topAlt ? topAlt : top ),
                            function() {
                                insert( new ast.Command(top, topAlt) );
                            },

                            ( bottomAlt ? bottomAlt : bottom ),
                            function() {
                                insert( new ast.Command(bottom, bottomAlt) );
                            }
                    )
                })( commands[i], commands[i+1] );
            }
        }

        /**
         * Add the values and literals
         */

        var valuesRow = new TouchRow( this.upper, true );

        valuesRow.append(
                'var', function() {
                    insert( new ast.VariableInput() );
                },

                null
        )

/*
        valuesRow.append(
                '[ &hellip; ]',
                function() { insert( new ast.ArrayLiteral() ); }
        )
*/

        valuesRow.append(
                '123',
                function() { insert( new ast.NumberInput() ); },

                '"text"',
                function() { insert( new ast.StringInput() ); }
        )

        valuesRow.append(
                'true',
                function() { insert( new ast.TrueLiteral() ); },

                'false',
                function() { insert( new ast.FalseLiteral() ); }
        )

        valuesRow.append(
                'null',
                function() { insert( new ast.NullLiteral() ); },

                'undefined',
                function() { insert( new ast.UndefinedLiteral() ); }
        )

        valuesRow.append(
                '&pi;',
                function() { insert( new ast.NumLiteral('&pi;', Math.PI, 'Math.PI') ); },

                null
        )

/*
        valuesRow.append(
                '[ ' + SMALL_EMPTY + ' &hellip; ' + SMALL_EMPTY + ' )',
                function() {
                    // todo new *exlusive* range
                },

                '[ ' + SMALL_EMPTY + ' &hellip; ' + SMALL_EMPTY + ' ]',
                function() {
                    // todo new *inclusive* range
                }
        )
*/

        valuesRow.append(
                null,

                '/ ' + SMALL_EMPTY + ' /', function() {
                    insert( new ast.RegExpInput() );
                }
        )

        /*
         * Structural commands, like operators.
         */

        var opsRow = new TouchRow( this.upper, true );

        var descriptorHTML = function( d ) {
            assert( d.html, "descriptor is missing HTML display value, " + d.name );

            var html = '';

            if ( d.preHtml !== undefined ) {
                html = d.preHtml + ' ';
            }

            html += SMALL_EMPTY + ' ' + d.html + ' ' + SMALL_EMPTY;

            if ( d.postHtml !== undefined ) {
                html += ' ' + d.postHtml;
            }

            return html;
        }

        var appendDescriptor = function( topName, bottomName ) {
            var    top =    topName !== null ? descMappings[   topName] : null ;
            var bottom = bottomName !== null ? descMappings[bottomName] : null ;

            assert(    topName === null || top   , "top descriptor not found " + topName );
            assert( bottomName === null || bottom, "bottom descriptor not found " + bottomName );

            if ( top !== null && bottom !== null ) {
                opsRow.append( 
                        descriptorHTML( top ),
                        function() { insert( new ast.DoubleOp(top   , descriptors) ); },

                        descriptorHTML( bottom ),
                        function() { insert( new ast.DoubleOp(bottom, descriptors) ); }
                )
            } else if ( top !== null ) {
                opsRow.append( 
                        descriptorHTML( top ),
                        function() { insert( new ast.DoubleOp(top   , descriptors) ); },

                        null
                )
            } else if ( bottom !== null ) {
                opsRow.append( 
                        null,

                        descriptorHTML( bottom ),
                        function() { insert( new ast.DoubleOp(bottom, descriptors) ); }
                )
            }
        }

        appendDescriptor( 'assignment'          , null              );
        appendDescriptor( 'property access'     , 'array access'    );

        appendDescriptor( 'pipe'                , null              );

        opsRow.appendSeperator();

        appendDescriptor( 'add'                 , 'subtract'        );
        appendDescriptor( 'multiply'            , 'divide'          );

        opsRow.appendSeperator();

        appendDescriptor( 'equal'               , 'not equal'       );
        appendDescriptor( 'less than equal'     , 'less than'       );
        appendDescriptor( 'greater than equal'  , 'greater than'    );

        opsRow.appendSeperator();

        appendDescriptor( 'and'                 , 'or'              );
        appendDescriptor( 'bitwise and'         , 'bitwise or'      );
        appendDescriptor( 'left shift'          , 'right shift'     );

        /*
         * Lower Row
         */

        var touchBar = this;
        var sectionButtons = new TouchRow( this.lower ).
                append( 'command', function() {
                    touchBar.showRow( commandsRow );
                } ).
                append( 'values', function() {
                    touchBar.showRow( valuesRow );
                } ).
                append( 'operators', function() {
                    touchBar.showRow( opsRow );
                } ).
                show();

        this.showRow( commandsRow );
    }

    TouchBar.prototype = {
            newControls: function() {
                var self = this;

                return newButtons( 'touch-controls', {
                        'touch-controls-run'   : function() {
                            self.execute();
                        },
                        'touch-controls-redo disabled'  : function() {
                            /* todo: perform a redo */
                        },
                        'touch-controls-undo disabled'  : function() {
                            /* todo: perform an undo */
                        },
                        'touch-controls-clear' : function() {
                            this.view.clear();
                        }
                } )
            },

            insert: function( node ) {
                var buttons = this.buttons,
                    view = this.view;

                if ( buttons.isLeft() && buttons.isRight() ) {
                    view.insert( node );
                } else if ( buttons.isLeft() ) {
                    view.insertLeft( node );
                } else if ( buttons.isRight() ) {
                    view.insertRight( node );
                } else {
                    view.insert( node );
                }
            },

            execute: function() {
                var self = this;
                this.view.validate( function() {
                    if ( false ) {
                        self.view.evaluate( function(r) {
                            self.newTouchView();
                        } );
                    } else {
                        self.executeFun( 'touch-js', self.view, function() {
                            self.newTouchView();
                        } );
                    }
                } );
            },

            newTouchView: function() {
                if ( this.view !== null ) {
                    if ( this.view.getDom().parentNode === this.bar ) {
                        this.removeChild( this.view.getDom() );
                        this.view.touchBar( null );
                    }
                }

                this.view = new TouchView( this );
                this.bar.appendChild( this.view.getDom() );
            },

            showRow: function( row ) {
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
    }

    return TouchBar;
})();
