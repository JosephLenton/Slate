"use strict";

window.slate = window.slate || {};
window.slate.TouchBar = (function() {
    var bb = window.bb.clone();
    bb.setup.element( 'ast', function() {
        return new ast.Empty();
    } );

    var BBGun = window.BBGun.clone( bb );
            
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

            if ( ! isFunction(fun) ) {
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
    var isIdentifier = function( str ) {
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

    var astHTML = function( html ) {
        return bb.html(
                bb.createArray( 'touch-ast-text', arguments, 1 ),
                html
        )
    }

    var astText = function( text ) {
        return bb.text(
                bb.createArray( 'touch-ast-text', arguments, 1 ),
                text
        )
    }

    var ast = {};

    var nodeClick = function() {
        if ( ! this.isSelected() ) {
            this.getView().setCurrent( this );

            return false;
        }
    }

    ast.Node = (function( desc ) {
                BBGun.call( this, 'touch-ast', {
                    click: nodeClick
                } );

                if ( arguments.length !== 0 ) {
                    bb.initBBGun( this, desc );
                }

                this.up   = null;
                this.view = null;

                this.setupDeleteButton();

                this.replace( function(newNode) {
                    var view = this.maybeView();
                    
                    if ( view ) {
                        view.storeChange();

                        if ( this.isSelected() ) {
                            view.setCurrent( newNode );
                        }
                    } else {
                        newNode.updateViewChange();
                    }

                    /*
                     * If being replaced with an empty,
                     * animate out.
                     */
                    if ( newNode.isEmpty() ) {
                        this.removeClass( 'select' );
                        newNode.add( this );

                        this.addClass('pre-remove');

                        (function() {
                            this.removeClass( 'pre-remove' ).
                                 addClass( 'remove' );

                            this.on( 'transitionend', this.remove.bind(this) );
                        }).later( this );
                    }
                } )
            }).
            extend( BBGun ).

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
                 * and to denote if it was successful or not.
                 * The return value is used to quit validation, early,
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
                /**
                 * @return Returns a function, which when called, will return a copy of the tree in it's current state.
                 */
                toRestoreFunction: function() {
                    var isSelected = this.isSelected();
                    var restoreFun = this.toRestoreImplementation();

                    if ( isSelected ) {
                        console.log( 'i am selected', this.dom().className );
                    }

                    return function( view ) {
                        console.log( ' > restore selection code' );

                        var node = restoreFun( view );

                        if ( isSelected && view ) {
                            view.setCurrent( node );
                        }

                        console.log( ' < restore selection code' );

                        return node;
                    }
                },

                toRestoreImplementation: function() {
                    var constructor = this.constructor;

                    return function(view) {
                        console.log( ' - restore ast.node' );
                        return new constructor();
                    }
                },

                selectNode: function( dir ) {
                    assert(
                            dir === 'left'  ||
                            dir === 'right' ||
                            dir === 'up'    ||
                            dir === 'down'
                    );

                    if ( dir === 'left' ) {
                        return this.getChildBefore( this, 0 );
                    } else if ( dir === 'right' ) {
                        return this.getChildAfter( this, 0 );
                    } else if ( dir === 'up' ) {
                        return this.parent( '.touch-ast' );
                    } else if ( dir === 'down' ) {
                        return this.child( '.touch-ast' );
                    }

                    return null;
                },

                getFirstChild: function() {
                    return this;
                },
                getLastChild: function() {
                    return this;
                },

                getChildBefore: function( node, count ) {
                    assert( arguments.length === 2 );

                    var parent = this.parent( '.touch-ast' );

                    if ( parent ) {
                        var r = parent.getChildBefore( this, count+1 );

                        if ( r === null || r === this ) {
                            return this.getFirstChild( count );
                        } else {
                            return r;
                        }
                    } else {
                        return this.getFirstChild( count );
                    }
                },
                getChildAfter: function( node, count ) {
                    assert( arguments.length === 2 );

                    var parent = this.parent( '.touch-ast' );

                    if ( parent ) {
                        var r = parent.getChildAfter( this, count+1 );

                        if ( r === null || r === this ) {
                            return this.getLastChild( count );
                        } else {
                            return r;
                        }
                    } else {
                        return this.getLastChild( count );
                    }
                },

                updateViewChange: function() {
                    var view = this.maybeView();

                    if ( view !== null ) {
                        view.storeChange();
                    }
                },

                parentAST: function( f ) {
                    if ( arguments.length === 1 ) {
                        return this.parent( '.touch-ast', f );
                    } else {
                        return this.parent( '.touch-ast' );
                    }
                },

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
                setupDeleteButton: function() {
                    var self = this;

                    this.add(
                            bb.a('touch-ast-delete', {
                                click: function(ev) {
                                    self.replace( new ast.Empty() );

                                    ev.stopPropagation();
                                }
                            } )
                    )
                },

                setError: function() {
                    // timeout is to ensure it fades in
                    this.addClass.callLater( this, 'error' );

                    return this;
                },

                removeError: function() {
                    return this.removeClass.callLater( this, 'error' );

                    return this;
                },

                maybeView: function( fun ) {
                    var view;

                    if ( this.view === null ) {
                        view = ( this.view = this.parentAST( function(p) {
                            return p.maybeView();
                        } ) || null );
                    } else {
                        view = this.view;
                    }

                    if ( arguments.length === 1 ) {
                        assertFunction( fun );

                        if ( view !== null ) {
                            fun.call( this, view );
                        }
                    }

                    return view;
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
                getView: function( fun ) {
                    var view = ( arguments.length > 1 ) ?
                            this.maybeView( fun )   :
                            this.maybeView()        ;

                    return view || logError("getView called when node is not within a view");
                },

                setView: function( view ) {
                    assert( view, "falsy view given" );
                    this.view = view;

                    return this;
                },

                isSelected: BBGun.prototype.hasClass.params( 'select' ),

                onSelect: function() {
                    this.addClass( 'select' );
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
                    this.parentAST( function(p) {
                        p.addClass( 'select-parent' );
                    } );
                },

                onUnselect: function() {
                    this.removeClass( 'select' );

                    this.parentAST( function(p) {
                        p.removeClass( 'select-parent' );
                    } );
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
                    return this.getEmpty( value ) ||
                           this.parentAST( function(p) {
                               return p.findEmpty();
                           } );
                }
            })

    var newEmpty = function() {
        return new ast.Empty();
    }

    ast.Empty = ast.Node.
            sub(function() {
                this.addClass( 'touch-ast-empty' );

/**
 * Disabled, because the switching just doesn't work right,
 * when on the iPad.
 */
/*
                var emptyInput = bb.input();
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
                        return this.parentAST( function(p) {
                                    return p.allowsEmpties()
                                }) || onError( this, "node is empty" )
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
                this.displayValue = displayValue;

                this.
                        addClass( 'touch-ast-literal' ).
                        addClass( klass ).
                        add( astHTML(displayValue) );
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
            params( null, 'touch-ast-null', 'null' ).
            sub(function() {
                this.click( function() {
                    this.replace( new ast.UndefinedLiteral() );
                } );
            });

    ast.UndefinedLiteral = ast.Literal.
            params( undefined, 'touch-ast-undefined', 'undefined' ).
            sub(function() {
                this.click( function() {
                    this.replace( new ast.NullLiteral() );
                } );
            });

    ast.TrueLiteral = ast.Literal.
            params( true, 'touch-ast-boolean' ).
            sub(function() {
                this.click( function() {
                    this.replace( new ast.FalseLiteral() );
                })
            });

    ast.FalseLiteral = ast.Literal.
            params( false, 'touch-ast-boolean' ).
            sub(function() {
                this.click( function() {
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
            extend( ast.Literal ).
            override({
                toRestoreImplementation: function() {
                    var str = this.displayValue,
                        value = this.value,
                        jsValue = this.jsValue;

                    return function(view) {
                        return new ast.NumLiteral( str, value, jsValue );
                    }
                }
            });
            
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

                this.left  = null;
                this.right = null;

                this.setLeft( new ast.Empty() );
                this.setRight( new ast.Empty() );

                /*
                 * Convert the meta items we have,
                 * into an array of meta items for the menu.
                 */
                var menuItems = [];
                var metaIndex = 0,
                    countIndex = true;

                this.metas = metas;

                if ( metas && metas.length > 0 ) {
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
                    //this.text.dom().classList.add( 'touch-ast-text' );
                }
                
                this.preText  = astText( '', 'touch-ast-op-text' );
                this.text     = astText( '', 'touch-ast-op-text' );
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

                this.click( function() {
                    if ( this.meta.altMeta ) {
                        this.setMeta( this.meta.altMeta );
                    }
                });

                this.beforeReplace( function( newCommand, force ) {
                    if (
                            ! force &&
                            ( newCommand instanceof ast.DoubleOp )
                    ) {
                        this.setMeta( newCommand.getMeta() );

                        this.updateViewChange();

                        return false;
                    }
                } )
            }).
            extend( ast.Node ).
            override({
                getFirstChild: function( count ) {
                    if ( count <= 0 ) {
                        return this.left;
                    } else {
                        return this.left.getFirstChild( count-1 );
                    }
                },
                getLastChild: function( count ) {
                    if ( count <= 0 ) {
                        return this.right;
                    } else {
                        return this.right.getLastChild( count-1 );
                    }
                },

                getChildBefore: function( exclude, count ) {
                    if ( exclude !== this ) {
                        if ( count <= 0 ) {
                            if ( this.right === exclude ) {
                                return this.left;
                            }
                        } else {
                            if ( this.right === exclude ) {
                                return this.left.getLastChild( count-1 );
                            }
                        }
                    }

                    return ast.Node.prototype.getChildBefore.call( this, this, count );
                },
                getChildAfter: function( exclude, count ) {
                    if ( exclude !== this ) {
                        if ( count <= 0 ) {
                            if ( this.left === exclude ) {
                                return this.right;
                            }
                        } else {
                            if ( this.left === exclude ) {
                                return this.right.getFirstChild( count-1 );
                            }
                        }
                    }

                    return ast.Node.prototype.getChildAfter.call( this, this, count );
                },

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
                        if ( isFunction(this.meta.isAssignable) ) {
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
                        if ( isFunction(this.meta.isCommandable) ) {
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
                },

                toRestoreImplementation: function() {
                    var meta  = this.meta,
                        metas = this.metas;

                    var left  = this.left.toRestoreFunction(),
                        right = this.right.toRestoreFunction();

                    return function(view) {
                        console.log( ' > restore ast.doubleOp' );

                        var node = new ast.DoubleOp( meta, metas );

                        node.setLeft( left(view) );
                        node.setRight( right(view) );

                        console.log( ' < restore ast.doubleOp' );

                        return node;
                    }
                }
            }).
            extend({
                setLeft: function( left ) {
                    var self = this;

                    left.once( 'replace', function( newLeft ) {
                        self.setLeft( newLeft );
                    } )

                    this.left = left;
                    return this;
                },

                setRight: function( right ) {
                    var self = this;

                    right.once( 'replace', function( newRight ) {
                        self.setRight( newRight );
                    } )

                    this.right = right;
                    return this;
                },

                replaceLeft: function( node ) {
                    var old = this.left;
                    this.left.replace( node );

                    return old;
                },

                replaceRight: function( node ) {
                    var old = this.right;
                    this.right.replace( node );

                    return old;
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
                            this.removeClass( this.meta.css );
                        }
                    }

                    this.preText .innerHTML = meta.preHtml  || '' ;
                    this.text    .innerHTML = meta.html           ;
                    this.postText.innerHTML = meta.postHtml || '' ;

                    if ( meta.css ) {
                        (function() {
                            this.addClass( meta.css );
                        }).later( this );
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

    ast.Range = ast.DoubleOp.
            params({
                    name    : 'range',
                    alt     : 'range',
                     
                    preHtml : '[',
                    html    : ', ',
                    postHtml: ')',

                    toJS: function( left, right ) {
                        return 'new slate.Range(' + left.toJS() + ', ' + right.toJS() + ') ';
                    },

                    evaluate: function( left, right ) {
                        return new slate.Range( left.evaluate(), right.evaluate() );
                    },

                    isAssignable: function() {
                        return false;
                    }
            });

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
                        return '(' + left.toJS() + ').getProp(' + right.toJS() + ') ';
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
                        if ( right.toJSObj === undefined ) {
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
                        var rightStr = right.toJS();

                        if ( isIdentifier(right) ) {
                            return '(' + left.toJS() + ').' + rightStr + ' ';
                        } else {
                            return '(' + left.toJS() + ').getProp(' + rightStr + ') ';
                        }
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
            assertFunction( desc.evaluate, "evaluation function is missing" );
            assert(
                    (desc.isPipeReceiver === true) === isFunction(desc.evaluatePipeReceive),
                    "descriptor '" + desc.name + "' is a pipe receiver, but does not have an 'evaluatePipeReceive' method."
            );
            assert(
                    (desc.isPipeReceiver === true) === isFunction(desc.toJSPipeReceive),
                    "descriptor '" + desc.name + "' is a pipe receiver, but does not have an 'toJSPipeReceive' method."
            );

            assert(
                    !!( desc.isAssignable === true || isFunction(desc.isAssignable) ) ===
                            isFunction( desc.evaluateAssignment ),
                    "descriptor '" + desc.name + "' is assignable, but does not have an 'evaluateAssignment' method."
            );
            assert(
                    !!( desc.isAssignable === true || isFunction(desc.isAssignable) ) ===
                            isFunction( desc.toJSAssignment ),
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

    /**
     * Returns the width of the text given,
     * for a 'touch-ast-input > input' node.
     *
     * @param text The text to measure the width of.
     * @return The width, in pixels, but as an int. i.e. '400' not '400px'.
     */
    var textWidth = (function() {
        var isMeasureSet = false;

        var div = bb( 'touch-input-measure-div' );

        return function( text ) {
            if ( ! isMeasureSet ) {
                isMeasureSet = true;

                bb.add( 'body', {
                        className: 'touch-input-measure',
                        html: div
                } )
            }

            div.textContent = text;
            return div.clientWidth;
        }
    })();

    ast.GenericCommand =
            (function(desc) {
                assert( desc.visual );

                ast.Node.call( this, desc.visual );
                this.addClass( 'touch-ast-generic' );

                this.commandName = desc.name;
            }).
            extend( ast.Node ).
            override({
                validate: function( onError ) {
                    throw new Error( "todo, implement validate" );

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

                onSelect: function() {
                    // todo
                },

                getEmpty: function() {
                    return this.child( 'touch-ast-empty' ) || null ;
                }
            }).
            extend({
                getName: function() {
                    return this.commandName;
                }
            });

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
                var self = this;

                this.
                        addClass( 'touch-ast-input' ).
                        addClass( cssKlass );

                this.emptyAllowed = emptyAllowed;
                this.timeout = null;
                this.lastInput = '';
                this.onInput = new Events( this );

                this.input = bb.input( {
                        readonly: 'true',

                        type: type,

                        autocapitalize: 'off',
                        autocorrect   : 'off',

                        value: defaultVal,

                        focus: function(ev) {
                            ev.preventDefault();
                        },

                        keyup: function(ev) {
                            // enter key
                            if ( ev.which === 13 ) {
                                self.input.blur();
                                self.getView().execute();
                            }
                        },

                        input: function(ev) {
                            self.resizeInput();
                            self.onInput.run();

                            self.getView().hideError();
                        }
                }) 

                this.add( this.input )

                this.resizeInput();

/*
                this.dom().addEventListener( 'focus', function(ev) {
                    ev.stopPropagation();
                    ev.preventDefault();

                    setTimeout( function() {
                        self.input.focus();
                    } );
                }, true );
*/

                this.click(function(ev) {
                    setTimeout( function() {
                        self.input.focus();
                    } );
                })

                this.replace( function(other) {
                    if (
                            other.setInputValue !== undefined &&
                            ( this instanceof ast.Command) === (other instanceof ast.Command)
                    ) {
                        other.setInputValue( this.getInputValue() );
                        this.updateViewChange();
                    }
                } )
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
                        var self = this;

                        setTimeout( function() {
                            self.input.focus();
                        }, 0 );
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
                    }
            }).
            after({
                    onUnselect: function() {
                        this.input.classList.remove( 'multi-change' );
                        this.getInputDom().blur();
                    }
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

                    // todo, animate out old text, animate in new text
                    setInputValue: function( val ) {
                        this.input.value = val;

                        this.resizeInput();

                        return this;
                    },

                    getInputValue: function() {
                        return this.input.value;
                    }
            } )

    ast.RegExpInput = ast.Input.
            params(
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
                this.
                        before( this.getInputDom(), astText('/') ).
                        add( astText('/') )
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
            params(
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
                this.before( this.getInputDom(), astText('"') ).
                        add( astText('"') )
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
            params(
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

    var emptyToJS = function( str ) {
        return str;
    }

    var emptyToJSObj = function( obj, str ) {
        return obj + '.getProp(' + str + ')' ;
    }

    var newValidation = function( css, isAssignable, test, toJS, toJSObj ) {
        var testStr = test;
        if ( isString(test) ) {
            if ( test.charAt(0) !== '^' ) {
                test = '^' + test;
            }
            if ( test.charAt(test.length-1) !== '$' ) {
                test = test + '$';
            }

            test = new RegExp( test );
        }

        if ( test instanceof RegExp ) {
            var testRegexp = test;

            test = function( str ) {
                return ( str.search(testRegexp) === 0 );
            }
        }

        return {
                css             : css,
                isAssignable    : isAssignable,
                test            : test,
                toJS            : toJS      || emptyToJS,
                toJSObj         : toJSObj   || emptyToJSObj
        }
    }


    var inputValidations = [
            newValidation( 'variable', true , isIdentifier,
                    null,
                    function( obj, str ) {
                        return obj + '.' + str;
                    }
            ),
            newValidation( 'number'  , false, '[0-9]+(\.[0-9]+)?',
                    null,
                    null
            ),
            newValidation( 'regex'   , false, '\/.*\/',
                    null,
                    null
            ),
            newValidation( 'string'  , false, function() { return true },

                    /*
                     * The value returned includes quotes on either side of the value,
                     * and it also escapes any quotes used inside.
                     *
                     * The result uses double quotes, so \n, will be an end of line.
                     *
                     * @return The value of this input, as a JavaScript string.
                     */

                    function( val ) {
                        if ( val.charAt(0) === ' ' && val.length > 1 ) {
                            val = val.substring( 1 );
                        }

                        return '"' + val.replace('"', '\\"') + '"';
                    },

                    function( obj, str ) {
                        return obj + '.getProp(' + this.toJS(str) + ')';
                    }
            )
    ];

    ast.DynamicInput = ast.Input.
            params(
                    'text',
                    '',
                    '',
                    false
            ).
            sub(function(value) {
                this.lastValidation = null;

                this.setDynamicValidation( inputValidations[0] );

                this.onInput( function() {
                    var val = this.getInputValue();

                    if ( val === '' ) {
                        this.replace( new ast.Empty() );
                    } else {
                        this.updateDynamicValidation( val );
                    }
                } );

                this.setInputValue( value );
            }).
            override( ast.Input, {
                    setInputValue: function( str ) {
                        this.updateDynamicValidation( str );
                        ast.Input.prototype.setInputValue.call( this, str );
                    },
                    validate: function( onError ) {
                        var str = this.getInputValue()

                        if ( str.length === 0 ) {
                            return onError( this, "no variable name provided" )
                        } else {
                            return true
                        }
                    },

                    toJS: function() {
                        return this.lastValidation.toJS( this.getInputValue() );
                    },

                    evaluate: function() {
                        return window[ this.getInputValue() ]
                    },

                    isAssignable: function() {
                        return this.lastValidation.isAssignable;
                    },

                    toRestoreImplementation: function() {
                        var val = this.getInputValue();

                        return function(view) {
                            console.log( ' - ast.DynamicInput( ' + val + ' )' );
                            return new ast.DynamicInput( val );
                        }
                    }
            }).
            extend({
                    updateDynamicValidation: function( str ) {
                        for ( var i = 0; i < inputValidations.length; i++ ) {
                            if ( inputValidations[i].test( str ) ) {
                                this.setDynamicValidation( inputValidations[i] );
                                return;
                            }
                        }
                    },

                    setDynamicValidation: function( v ) {
                        if ( this.lastValidation !== v ) {
                            if ( this.lastValidation !== null ) {
                                this.removeClass( this.lastValidation.css );
                            }

                            this.addClass( v.css );

                            this.lastValidation = v;
                        }
                    },

                    toJSObj: function( obj ) {
                        return this.lastValidation.toJSObj( '(' + obj + ')', this.getInputValue() );
                    },

                    toJSAssignment: function( obj, expr ) {
                        return this.getInputValue() + ' = ' + expr;
                    },

                    toJSObjAssignment: function( obj, expr ) {
                        return obj + '.' + this.getInputValue() + ' = ' + expr;
                    },

                    evaluateObj: function( obj ) {
                        if ( this.isString() ) {
                            return this.getInputValue();
                        } else {
                            return obj[ this.getInputValue() ];
                        }
                    },

                    evaluateAssignment: function( expr ) {
                        window[ this.getInputValue() ] = expr
                    },

                    evaluateObjAssignment: function( obj, expr ) {
                        assignHelper( obj, this.getInputValue(), expr );
                    }
            })
       

    ast.VariableInput = ast.Input.
            params(
                    'text',
                    'variable',
                    '',
                    false
            ).
            sub(function() {
                this.onInput( function() {
                     if ( isIdentifier(val) ) {
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
                         } else if ( ! isIdentifier(str) ) {
                             return onError( this, "invalid variable name given" )
                        } else {
                            return true
                        }
                    },

                    toJS: function() {
                        return this.getInputValue();
                    },

                    evaluate: function() {
                        return window[ this.getInputValue() ]
                    },

                    isAssignable: function() {
                        return true;
                    }
            }).
            extend({
                    /**
                     * The value returned includes quotes on either side of the value,
                     * and it also escapes any quotes used inside.
                     *
                     * The result uses double quotes, so \n, will be an end of line.
                     *
                     * @return The value of this input, as a JavaScript string.
                     */

                    getJSStringValue: function() {
                        return '"' + this.toInputString() + '"';
                    },

                    toJSObj: function( obj ) {
                        return '(' + obj + ').' + this.getInputValue();
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
                    display = bb.util.htmlToText( display );
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

                this.before(
                        this.getInputDom(),
                        astText( '(', 'touch-ast-left-paren' )
                )

                this.rightParen = astText(')', 'touch-ast-right-paren'),
                this.add( this.rightParen )

                this.insertNewEmpty();

                this.beforeReplace( function(newCommand) {
                    if ( newCommand instanceof ast.Command ) {
                        this.setInputValue( newCommand.getInputValue() );

                        (function() {
                            this.getView().setCurrent( this.getEmpty() )
                        }).later( this );

                        return false;
                    }
                })
            }).
            override({
                getLastChild: function( count ) {
                    if ( count === 0 ) {
                        return this.params[ this.params.length-1 ];
                    } else {
                        return this.params[ this.params.length-1 ].getLastChild( count-1 );
                    }
                },

                getChildBefore: function( exclude, count ) {
                    if ( exclude === this ) {
                        return ast.Node.prototype.getChildBefore.call( this, this, count+1 );
                    } else {
                        for ( var i = 0; i < this.params.length; i++ ) {
                            if ( exclude === this.params[i] ) {
                                if ( i === 0 ) {
                                    return this;
                                } else {
                                    if ( count === 0 ) {
                                        return this.params[i-1]
                                    } else {
                                        return this.params[i-1].getLastChild();
                                    }
                                }
                            }
                        }
                    }
                },

                getChildAfter: function( exclude, count ) {
                    if ( exclude === this ) {
                        return ast.Node.prototype.getChildAfter.call( this, this, count+1 );
                    } else {
                        for ( var i = 0; i < this.params.length; i++ ) {
                            if ( exclude === this.params[i] ) {
                                if ( i === this.params.length-1 ) {
                                    return ast.Node.prototype.getChildAfter.call( this, this, count+1 );
                                } else {
                                    if ( count === 0 ) {
                                        return this.params[i+1]
                                    } else {
                                        return this.params[i+1].getLastChild();
                                    }
                                }
                            }
                        }
                    }
                }
            }).
            override({
                    toRestoreImplementation: function() {
                        var value = this.getInputValue();
                        var paramRestores = new Array( this.params.length );

                        for ( var i = 0; i < paramRestores.length; i++ ) {
                            paramRestores[i] = this.params[i].toRestoreFunction();
                        }

                        return function( view ) {
                            var node = new ast.Command( value );
                            var newParams = new Array( paramRestores.length );

                            for ( var i = 0; i < paramRestores.length; i++ ) {
                                newParams[i] = paramRestores[i]( view );
                            }

                            node.setParams( newParams );

                            return node;
                        }
                    },

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

                        return '(' + obj + ').' + this.toJS.apply( this, args )
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
                        return this.getEmpty() ||
                               this.parentAST( function(p) {
                                   return p.findEmpty();
                               } );
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
            extend({
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

                            var self = this;
                            newAst.once('replace', function(newNode) {
                                self.replaceChild( this, newNode );
                            } );

                            newAstI = i;

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
                            this.remove( param[i] );
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
                },

                getNonEmptyParams: function() {
                    return this.params.filterOutMethod( 'isEmpty' );
                },

                insertNewEmpty: function() {
                    var empty = new ast.Empty();

                    var self = this;
                    empty.once( 'replace', function(newNode) {
                        self.replaceChild( this, newNode );
                    } );

                    this.params.push( empty );
                    this.before( this.rightParen, empty );
                },

                setParams: function( newParams ) {
                    var oldParams = this.params;

                    this.params = newParams;

                    var self = this;
                    for ( var i = 0; i < newParams.length; i++ ) {
                        var newParam = newParams[i];

                        newParam.once( 'replace', function(newNode) {
                            self.replaceChild( this, newNode );
                        } );

                        this.add( newParam );
                    }

                    for ( var i = 0; i < oldParams.length; i++ ) {
                        var oldParam = oldParams[i];

                        this.remove( oldParam );
                    }
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
    var TouchRow = 
            (function( isDouble ) {
                this.scroll = bb( 'touch-bar-row-inner-scroll' )

                BBGun.call( this, 'touch-bar-row-inner', this.scroll )

                if ( isDouble ) {
                    this.isDouble = true;
                }

                var self = this;
                this.callCallback = function() {
                    self.callback.call( self, this.textContent, self );
                }
            }).extend( BBGun, {
                show: function() {
                    this.dom().classList.add( 'show' )

                    return this;
                },

                hide: function() {
                    this.dom().classList.remove( 'show' )

                    return this;
                },

                appendSeperator: function() {
                    this.scroll.appendChild(
                            bb('touch-bar-button-seperator')
                    )
                    
                    return this;
                },

                append: function( item, callback ) {
                    var dom;

                    if ( arguments.length > 2 ) {
                        dom = bb( 'touch-bar-button-column' );

                        for ( var i = 0; i < arguments.length; i++ ) {
                            var item = arguments[i],
                                callback;

                            if ( item === null ) {
                                item = '&nbsp;';
                                callback = function(ev) { /* do nothing */ };
                            } else if ( item.has('html') && item.has('fun') ) {
                                callback = item.fun;
                                item = item.html;
                            } else {
                                callback = arguments[i+1]

                                i++;
                            }

                            dom.appendChild( TouchRow.newTouchRowButton(item, callback) );
                        }
                    } else {
                        dom = TouchRow.newTouchRowButton( item, callback );
                    }

                    this.scroll.appendChild( dom );

                    return this;
                }
            })
    
    TouchRow.newTouchRowButton = function( item, callback ) {
        assert( item !== undefined, "'item' is undefined" );

        return bb.a( 'touch-bar-button', { html: item, click: callback } );
    }

var viewCount = 1;
    /**
     * The area that displays the AST.
     */
    var TouchView = BBGun.
            params( 'touch-bar-view' ).
            sub(function( touchBar ) {
                this.viewCounter = viewCount++;

                this.isLeftDown    = false;
                this.isReplaceDown = false;

                this.touchBar    = touchBar;
                this.current     = null;
                this.selectLater = null;
                this.insertionFun = null;

                this.ignoreChangesFlag = false;
                this.changeDelay = null;

                /* the bar where the AST nodes are shown */
                this.bar = new BBGun( 'touch-bar-view-ast-bar' );

                /* the error overlay component */
                this.errorDomContent = bb( 'touch-bar-view-error-content' );

                var errInnerDom = bb( 'touch-bar-view-error-inner' );
                errInnerDom.appendChild( this.errorDomContent );
                errInnerDom.appendChild( bb( 'touch-bar-view-error-tail' ) );

                this.errorDom = bb( 'touch-bar-view-error' );
                this.errorDom.appendChild( errInnerDom );

                /* finally, setup! */
                this.add( this.bar, this.errorDom ).
                         setAST( new ast.Empty() );

                this.commandsMap = {};

                var self = this;
                this.viewInput = bb('text', {
                    input: function(ev) {
                        ev.preventDefault();

                        var val = this.value;
                        this.value = '';
                        self.insert( new ast.DynamicInput(val) );
                    }
                })
            }).
            extend({
                    undoRestore: function( state ) {
                        console.log( ' BEGIN #################' );
                        this.ignoreChanges();

                        /*
                         * Track if the current node changes,
                         * and if so, we need to ensure it is kept,
                         * after we have called 'setAST'.
                         */

                        var oldCurrent = this.current;
                        var node = state( this );

                        var newCurrent = null;
                        if ( this.current !== oldCurrent ) {
                            console.log( 'state changed' );
                            newCurrent = this.current;
                        }

console.log( node );
                        this.setAST( node );

                        if ( newCurrent ) {
                            this.setCurrent( newCurrent );
                        }

                        console.log( ' END ----------------------' );
                    },
                    
                    onChange: function( fun ) {
                        assertFunction( fun );

                        this.insertionFun = fun;

                        return this;
                    },

                    ignoreChanges: function() {
                        this.ignoreChangesFlag = true;

                        var self = this;
                        clearTimeout( this.changeDelay )
                        this.changeDelay = setTimeout( function() {
                            self.ignoreChangesFlag = false;
                            console.log( '@@ ignore reset' );
                        }, 0 );
                    },

                    storeChange: function() {
                        console.log( '@@ store change', this.ignoreChangesFlag );
                        if ( ! this.ignoreChangesFlag ) {
                            console.log( '~~ RECORD' );
                            this.ignoreChanges();

                            assert( this.insertionFun !== null, "no insertion fun set" );
                            this.insertionFun( this.getAST().toRestoreFunction() );
                        }

                        return this;
                    },

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

                    showError: function( node, msg ) {
                        if ( ! this.errorDom.classList.contains('show') ) {
                            slate.util.getDomLocation(
                                    node.dom(),
                                    this.dom(),

                                    (function(left, top) {
                                        var bottom = this.dom().clientHeight - top;
                                        left += node.dom().clientWidth/2;

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
                        console.log( '~~ CLEAR' );
                        this.setAST( new ast.Empty() );
                    },

                    validate: function( callback ) {
                        var self = this;
                        var success = this.getAST().validate(function(node, errMsg) {
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
                        return this.getAST().toJS();
                    },

                    evaluate: function( callback ) {
                        this.getAST().evaluateCallback( callback );
                    },

                    getCurrent: function() {
                        return this.current;
                    },

                    maybeSetCurrent: function( ast, isSelected ) {
                        if ( isSelected ) {
                            this.setCurrent( ast );
                        }

                        return ast;
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

                        clearTimeout( this.selectLater );
                        this.selectLater = this.runOnSetCurrent.later( this )

                        this.current.onEverySelect()

                        this.hideError();

                        return this;
                    },

                    onSetCurrent: function( f ) {
                        assertFunction( f );

                        this.onSetCurrentFun = f;

                        return this;
                    },

                    runOnSetCurrent: function() {
                        if ( this.onSetCurrentFun ) {
                            this.onSetCurrentFun.call( this,
                                    this.current.getInputDom !== undefined ?
                                            this.current.getInputDom() :
                                            this.viewInput
                            )
                        }
                    },

                    getAST: function() {
                        assert( this.current !== null, "current should never be set to null" );
                        return this.bar.child( '.touch-ast' );
                    },

                    /**
                     * Replaces the entire AST in the view,
                     * with the ast node given.
                     */
                    setAST: function( ast ) {
                        console.log( '~~ SET AST' );
                        if ( this.current ) {
                            this.storeChange();

                            this.bar.remove( this.getAST() );
                            this.current = null;
                        }

                        this.bar.add( ast );
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
                        this.storeChange();
                        var current = this.getCurrent();

                        current.isEmpty() && node.replaceRight !== undefined && current.parentAST( function(p) {
                            current = p
                        } );

                        current.replaceWith( node, true ); // true -> force the replacement, no matter what
                        node.setView( this );
                        
                        if ( !current.isEmpty() && node.replaceRight !== undefined ) {
                            /*
                             * Yes I know, these are the wrong way round.
                             *
                             *   isLeft -> replaceRight
                             *  !isLeft -> replaceLeft
                             */
                            if ( isLeft ) {
                                var empty = node.replaceRight( current );
                            } else {
                                var empty = node.replaceLeft( current );
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
                     * Replaces the current node,
                     * with the one given.
                     */
                    replaceCurrent: function( node ) {
                        this.storeChange();

                        this.current.replace( node );
                        this.current.setView( this );
                        this.selectEmpty( node );
                    },

                    setLeftDown: function( down ) {
                        this.isLeftDown = down;
                    },
                    setReplaceDown: function( down ) {
                        this.isReplaceDown = down;
                    },

                    insert: function( node ) {
                        if ( this.isLeftDown === this.isReplaceDown ) {
                            this.insertRight( node );
                        } else if ( this.isLeftDown ) {
                            this.insertLeft( node );
                        } else if ( this.isReplaceDown ) {
                            this.replaceCurrent( node );
                        }
                    },

                    selectEmpty: function( node, findEmptyVal ) {
                        node = ( node || this.current );
                        this.setCurrent( node.findEmpty(findEmptyVal) || node );
                    },

                    /*
                     * Node movement controls,
                     * for selecting nodes around the current node.
                     */

                    selectNodeMove: function( dir ) {
                        var node = this.current.selectNode( dir );

                        if ( node ) {
                            this.setCurrent( node );
                        }
                    }
            } )

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
        var dom = bb.div( cssKlass );

        for ( var k in obj ) {
            if ( obj.hasOwnProperty(k) ) {
                dom.appendChild( bb.a( k, {
                        click: obj[k]
                }) )
            }
        }

        return dom;
    }

    var newShiftButton = function( fun, key ) {
        var button = bb.a( 'touch-shift-button', {
                hold: function( ev, isPress ) {
                    if ( isPress ) {
                        this.classList.add( 'highlight' )
                        fun( true )
                    } else if ( !isPress ) {
                        this.classList.remove( 'highlight' )
                        fun( false )
                    }
                }
        } )

        document.getElementsByTagName('body')[0].addEventListener( 'keydown', function( ev ) {
            if ( ev.which === key ) {
                ev.preventDefault();

                button.classList.add( 'highlight' )
                fun( true );
            }
        })

        document.getElementsByTagName('body')[0].addEventListener( 'keyup', function( ev ) {
            if ( ev.which === key ) {
                ev.preventDefault();

                button.classList.remove( 'highlight' )
                fun( false )
            }
        })

        return button;
    }

    var ShiftButtons =
            (function() {
                var self = this;

                this.leftFun = null;
                this.replaceFun = null;

                BBGun.call( this,
                        'touch-shift',
                        newShiftButton( function(isDown) {
                                    self.leftFun( isDown );
                                }, 112),
                        newShiftButton( function(isDown) {
                                    self.replaceFun( isDown );
                                }, 113)
                )
            }).
            extend( BBGun, {
                onLeft: function(fun) {
                    this.leftFun = fun;

                    return this;
                },
                onReplace: function(fun) {
                    this.replaceFun = fun;

                    return this;
                }
            } );

    /**
     * The actual bar it's self.
     *
     * This is the top component, and the public facing API.
     */
    var TouchBar = function( parentDom, execute, commands, wrapKlass ) {
        var self = this;

        var types = {};
        var allCommands = [];

        for ( var i = 0; i < commands.length; i++ ) {
            var cmd = commands[i];

            if ( cmd.has('type') ) {
                var type = cmd.type;

                if ( type === 'all' ) {
                    allCommands.push( types );
                } else if ( types.has(type) ) {
                    types[type].push( cmd );
                } else {
                    types[type] = [ cmd ];
                }
            } else {
                allCommands.push( cmd );
            }
        }

        this.executeFun = execute;

        this.row   = null;
        this.view  = null;

        var closeThis = this.method('close');

        this.undo = new slate.UndoStack();
        this.keyboard = new Clavier({
                onClose: closeThis
        });

        this.upper  = bb( 'touch-bar-row right' );
        this.lower  = bb( 'touch-bar-row left'  );

        this.buttons = new ShiftButtons();

        var barDom = bb( 'touch-bar',
                this.upper,
                this.lower,
                this.buttons
        )

        this.bar = barDom;
        this.newTouchView();

        this.barWrap = bb( 'touch-bar-wrap',
                wrapKlass,
                barDom,
                this.newControls( this.undo ),
                this.keyboard.getDom()
        )

        parentDom.appendChild( this.barWrap );

        /*
         * Setup opening / closing this pane.
         */

        document.body.addEventListener( 'click', closeThis, false );
        document.body.addEventListener( 'touchend', closeThis, false );

        this.isOpen = false;
        var openThis = function( ev ) {
            ev.stopPropagation();
            ev.preventDefault();

            if ( ! self.isOpen ) {
                self.open();
            }
        }

        this.barWrap.addEventListener( 'mouseup', openThis, false );
        this.barWrap.addEventListener( 'focus', openThis, false );
        this.barWrap.addEventListener( 'dblclick', openThis, false );
        this.barWrap.addEventListener( 'touchend', openThis, false );
        this.barWrap.addEventListener( 'click', openThis, false );

        var commandDescriptionToButton = function( cmd, fun ) {
            if ( cmd ) {
                return {
                        html: cmd.symbol || cmd.name,
                        fun: function() { fun(cmd) }
                }
            } else {
                return null;
            }
        }

        var multiAddToRow = function( cs, row, fun ) {
            for ( var i = 0; i < cs.length; i += 3 ) {
                row.append(
                        commandDescriptionToButton( cs[i]  , fun ),
                        commandDescriptionToButton( cs[i+1], fun ),
                        commandDescriptionToButton( cs[i+2], fun )
                )
            }
        }

        var descriptorNameToNode = function( arg ) {
            if ( arg !== null ) {
                var desc = descMappings[arg];
                assert( desc, "descriptor not found, " + arg );

                return {
                    html: descriptorHTML(desc),
                    fun: (function(desc) {
                        return (function() {
                            insert(new ast.DoubleOp(desc, descriptors));
                        });
                    })(desc)
                };
            } else {
                return null;
            }
        }

        var appendDescriptor = function(row) {
            var ds = [];

            for ( var i = 1; i < arguments.length; i++ ) {
                ds.push( descriptorNameToNode(arguments[i]) );
            }

            row.append.apply( opsRow, ds );
        }

        var insert = this.insert.bind( this );

        var sectionsRow = new TouchRow();

        /**
         * @param sectionsRow This is the row that shows the buttons, to display the row made.
         * @param rowParent This is the element the row will be added to.
         */
        var addTypeRow = function( sectionsRow, rowParent, k, commands ) {
            var row = new TouchRow( true );

            multiAddToRow( commands, row, function(e) {
                if ( e.has('visual') ) {
                    insert( new ast.GenericCommand(e) );
                } else {
                    insert( new ast.Command(e.name) );
                }
            });

            sectionsRow.append( k, function() { self.showRow(row) } );
            bb.add( rowParent, row )

            return row;
        }

        /**
         * Add the initial commands
         */

        var commandsRow = addTypeRow( sectionsRow, this.upper, 'commands', allCommands );
        var pipeDescriptor = descMappings['pipe']
        commandsRow.append(
                {
                    html: SMALL_EMPTY,
                    fun: function() {
                        insert( new ast.Command() )
                    }
                },

                {
                    html: descriptorHTML( pipeDescriptor ),
                    fun: function() {
                        insert( new ast.DoubleOp(pipeDescriptor, descriptors) );
                    }
                },

                null
        );

        commandsRow.show();

        for ( var k in types ) {
            if ( types.has(k) ) {
                addTypeRow( sectionsRow, this.upper, k, types[k] )
            }
        }

        /**
         * Add the values and literals
         */

        var valuesRow = new TouchRow( true );
        sectionsRow.append( 'values', this.method('showRow', valuesRow) );
        bb.add( this.upper, valuesRow );

        valuesRow.append(
                'val',
                function() { insert( new ast.VariableInput() ); },

                '123',
                function() { insert( new ast.NumberInput() ); }
        )

/*
        valuesRow.append(
                '[ &hellip; ]',
                function() { insert( new ast.ArrayLiteral() ); }
        )
*/

        valuesRow.append(
                'true',
                function() { insert( new ast.TrueLiteral() ); },

                'false',
                function() { insert( new ast.FalseLiteral() ); },

                null
        );

        valuesRow.append(
                'null',
                function() { insert( new ast.NullLiteral() ); },

                'undefined',
                function() { insert( new ast.UndefinedLiteral() ); },

                null
        );

        valuesRow.append(
                '/ ' + SMALL_EMPTY + ' /',
                function() { insert( new ast.RegExpInput() ); },

                '[ ' + SMALL_EMPTY + ', ' + SMALL_EMPTY + ' )',
                function() { insert( new ast.Range() ); },

                null
        );

        valuesRow.append(
                '&pi;',
                function() { insert( new ast.NumLiteral('&pi;', Math.PI, 'Math.PI') ); },

                null,
                null
        );

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

        /*
         * Structural commands, like operators.
         */

        var opsRow = new TouchRow( true );

        appendDescriptor( opsRow, 'assignment'          , 'property access'     , 'array access' );

        opsRow.appendSeperator();

        appendDescriptor( opsRow, 'add'                 , 'subtract'    , null );
        appendDescriptor( opsRow, 'multiply'            , 'divide'      , null );

        opsRow.appendSeperator();

        appendDescriptor( opsRow, 'equal'               , 'less than equal'     , 'less than'   );
        appendDescriptor( opsRow, 'not equal'           , 'greater than equal'  , 'greater than');

        opsRow.appendSeperator();

        appendDescriptor( opsRow, 'and'                 , 'or'          , null );
        appendDescriptor( opsRow, 'bitwise and'         , 'bitwise or'  , null );
        appendDescriptor( opsRow, 'left shift'          , 'right shift' , null );

        sectionsRow.append( 'operators', this.method('showRow', opsRow) );
        bb.add( this.upper, opsRow );

        /*
         * Lower Row
         */

        bb.add( this.lower, sectionsRow );
        sectionsRow.show();

        this.showRow( commandsRow );
    }

    TouchBar.prototype = {
            open: function() {
                if ( ! this.isOpen ) {
                    this.isOpen = true;
                    this.barWrap.classList.add( 'open' );

                    var style = this.barWrap.style;
                    style.webkitTransform =
                            style.MozTransform =
                            style.transform = 'translate3d( 0, -20px, 0 )' ;
                }
            },

            close: function(ev) {
                if ( this.isOpen ) {
                    this.isOpen = false;
                    this.barWrap.classList.remove('open');

                    var style = this.barWrap.style;
                    style.webkitTransform =
                    style.MozTransform =
                    style.transform = 'translate3d( 0, 390px, 0 )' ;
                }

                return false;
            },

            newControls: function( undo ) {
                var self = this;

                return bb( 'touch-controls', {
                        'a.touch-controls-run' : {
                            click: self.method( 'execute' )
                        },

                        'a.touch-controls-redo disabled'  : {
                            self: function() {
                                var self = this;

                                undo.onRedoChange( function(hasRedo) {
                                    bb.toggleClass( self, !hasRedo, 'disabled' )
                                } );
                            },

                            click: undo.method( 'redo' )
                        },

                        'a.touch-controls-undo disabled'  : {
                            self: function() {
                                var self = this;

                                undo.onUndoChange( function(hasUndo) {
                                    bb.toggleClass( self, !hasUndo, 'disabled' )
                                } );
                            },

                            click: undo.method( 'undo' )
                        },

                        'a.touch-controls-clear' : {
                            click: self.view.method( 'clear' )
                        }
                } )
            },

            /**
             * This inserts the node given,
             * and does based on the current state of the button.
             *
             * default -> insert towards the right
             * replace -> replace current node
             * left    -> insert towards the left
             */
            insert: function( node ) {
                this.view.insert( node );
            },

            execute: function() {
                var self = this;

                /*
                 * Store that the AST has changed, after the evaluation/execution.
                 * That is for the undo/redo.
                 */
                this.view.validate( function() {
                    if ( false ) {
                        self.view.evaluate( function(r) {
                            self.view.storeChange();
                            self.newTouchView();
                        } );
                    } else {
                        self.executeFun( 'touch-js', self.view, function() {
                            self.view.storeChange();
                            self.newTouchView();
                        } );
                    }
                } );
            },

            newTouchView: function() {
                if ( this.view !== null ) {
                    if ( this.view.dom().parentNode === this.bar ) {
                        this.removeChild( this.view.dom() );
                        this.view.touchBar( null );
                    }
                }

                this.view = new TouchView( this ).
                        onChange( this.undo.method('add') ).
                        onSetCurrent( this.keyboard.method('setInput') );

                this.bar.appendChild( this.view.dom() );

                this.keyboard.controlMove( this.view.method('selectNodeMove') );

                var viewUndoRedo = this.view.method('undoRestore');
                this.undo.
                        clearUndos().
                        clearRedos().
                        onUndo( viewUndoRedo ).
                        onRedo( viewUndoRedo );

                this.buttons.
                        onLeft( this.view.method('setLeftDown') ).
                        onReplace( this.view.method('setReplaceDown') );

                return this.view;
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
