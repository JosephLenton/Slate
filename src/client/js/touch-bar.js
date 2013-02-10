"use strict";

window.slate = window.slate || {};
window.slate.TouchBar = (function() {
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
                    ev.stopPropagation();

                    if ( self.isSelected() ) {
                        self.onClick.run();
                    } else {
                        self.getView().setCurrent( self );
                    }
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
                }
            }).

            extend({
                onTransitionEnd: function( tEnd ) {
                    var dom = this.getDom();

                    var self = this;
                    var fun = function() {
                        tEnd.call( this );

                        dom.removeEventListener( 'transitionend', fun );
                        dom.removeEventListener( 'webkitTransitionEnd', fun );
                    }

                    dom.addEventListener( 'transitionend', fun );
                    dom.addEventListener( 'webkitTransitionEnd', fun );
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

                        if ( this.isSelected() ) {
                            this.getView().setCurrent( ast );
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
                            }).bind( this ).later()
                        }
                        
                        this.replaceLock = false;

                        return this;
                    }
                },

                evaluateCallback: function( onSuccess ) {
                    onSuccess.callLater( null, this.evaluate() );
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
            })

    ast.Empty = ast.Node.
            sub(function() {
                this.addClass( 'touch-ast-empty' );
                this.dom.innerHTML = '&#x25cf;';
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
                        if ( this.getParent().allowsEmpties() ) {
                            return true;
                        } else {
                            onError( this, "empty node still present" );

                            return false;
                        }
                    },

                    getEmpty: function() {
                        return this;
                    }
            } )

    ast.Command = ast.Node.
            sub(function(name) {
                var text = astText( name );
                this.name = name;

                this.text = text;

                this.params = new Array();
                
                this.addClass( 'touch-ast-command' );
                this.add( text );
                this.insertNewEmpty();
            }).
            override({
                    allowsEmpties: function() {
                        return true;
                    },

                    toJS: function() {
                        return this.name +
                                '( ' +
                                this.getNonEmptyParams().
                                        map( 'toJS' ).
                                        join( ', ' ) +
                                ' )'
                    },

                    evaluate: function() {
                        return this.getFunction().apply(
                                null,
                                this.getNonEmptyParams().map( 'evaluate' )
                        )
                    },

                    validate: function( onError ) {
                        return this.params.inject( true, function(sum, p) {
                            return p.validate( onError ) && sum
                        } )
                    }
            }).
            override({
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

                        if ( param.isSelected() ) {
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
                        this.text.textContent = newCommand.getName();
                        // todo, animate out old text, animate in new text

                        (function() {
                            this.getView().setCurrent( this.getEmpty() );
                        }).bind(this).later();
                    } else {
                        ast.Node.prototype.replace.call( this, newCommand );
                    }
                },

                replaceChild: function( old, newAst ) {
                    var params = this.params;

                    for ( var i = 0; i < params.length; i++ ) {
                        if ( params[i] === old ) {
                            params[i] = newAst;
                            old.replace( newAst );
                            old.setParent( this );

                            if ( i === params.length-1 ) {
                                this.insertNewEmpty();
                            }

                            return this;
                        }
                    }

                    assertUnreachable( "old AST node not found" );
                }
            }).
            extend({
                getNonEmptyParams: function() {
                    return this.params.filterOutMethod( 'isEmpty' );
                },

                getName: function() {
                    return this.name;
                },

                insertNewEmpty: function() {
                    var empty = new ast.Empty();

                    this.params.push( empty );
                    this.add( empty );
                },

                getFunction: function() {
                    return window[ this.name ];
                }
            })

    ast.Literal = (function(value, klass) {
                ast.Node.call( this );

                this.value = value;

                this.
                        addClass( 'touch-ast-literal' ).
                        addClass( klass ).
                        dom.appendChild( astText(value) );
            }).
            proto( ast.Node ).
            override({
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
                        onError( this.left, "left node is still empty" );

                        return false;
                    } else if ( this.right.isEmpty() ) {
                        onError( this.right, "right node is still empty" );

                        return false;
                    } else {
                        if ( this.meta.validate ) {
                            return this.meta.validate( onError, this.left, this.right )
                        } else {
                            return this.left.validate( onError ) &&
                                   this.right.validate( onError );
                        }
                    }
                },

                toJS: function() {
                    return this.meta.toJS( this.left.toJS(), this.right.toJS() );
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
            }).
            extend({
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
                            console.log( !left.isAssignable() && !left.isEmpty() );

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
                            left.assign( rightR );

                            return rightR;
                        },

                        toJS: function( left, right ) {
                            return left + ' = ' + right;
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

                newOps( 'and'               , 'or'                  , 'and'     , '&&' , function(l, r) { return l && r } ),
                newOps( 'or'                , 'add'                 , 'or'      , '||' , function(l, r) { return l || r } ),

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

    var INPUT_WIDTH_PADDING = 4;

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
                this.input.addEventListener( 'input', function() {
                    self.resizeInput();
                    self.onInput.run();
                } );

                this.resizeInput();

                this.onClick(function() {
                    setTimeout( function() {
                        this.input.focus();
                    }, 0 );
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

                        var self = this;
                        setTimeout(function() {
                            self.input.focus();
                        }, 0);
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
                    },
            }).
            extend({
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

                        this.input.style.width = INPUT_WIDTH_PADDING + textWidth( this.input.value ) + 'px';
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
                    onAssignment: function( expr ) {
                        window[ this.getInputValue() ] = expr
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
    var TouchView = function( parentDom ) {
        var viewArea = slate.util.newElement( 'div', 'touch-bar-view' )

        parentDom.appendChild( viewArea )
        this.dom = viewArea

        this.current = null

        this.setAST( new ast.Empty() )
    }

    TouchView.prototype = {
            clear: function() {
                this.setAST( new ast.Empty() );
            },

            validate: function( callback ) {
                var success = this.getRootAST().validate(function(node, errMsg) {
                    console.log( errMsg );

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

                this.current.onEverySelect();

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
                'touch-controls-redo disabled'  : function() {
                    /* todo: perform a redo */
                },
                'touch-controls-undo disabled'  : function() {
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

        var commandsRow = new TouchRow( this.upper, true );
        commands = commands.sort();
        for ( var i = 0; i < commands.length; i += 2 ) {
            if ( i === commands.length-1 ) {
                (function(command) {
                    commandsRow.append(
                            command, function() {
                                view.insert( new ast.Command(command) );
                            },
                            
                            null
                    );
                })( commands[i] );
            } else {
                (function(top, bottom) {
                    commandsRow.append(
                            top, function() {
                                view.insert( new ast.Command(top) );
                            },

                            bottom, function() {
                                view.insert( new ast.Command(bottom) );
                            }
                    )
                })( commands[i], commands[i+1] );
            }
        }

        /**
         * Add the values and literals
         */

        var SMALL_EMPTY = '<span class="touch-small">&#x25cf;</span>';

        var valuesRow = new TouchRow( this.upper, true );

        valuesRow.append(
                'var', function() {
                    view.insert( new ast.VariableInput() );
                },

                null
        )

        valuesRow.append(
                SMALL_EMPTY + ' [' + SMALL_EMPTY + ']',
                function() {
                    view.insert( new ast.ArrayAssignment() );
                },

                '[ &hellip; ]',
                function() {
                    view.insert( new ast.ArrayLiteral() );
                }
        )

        valuesRow.append(
                '123',
                function() {
                    view.insert( new ast.NumberInput() );
                },

                '"text"',
                function() {
                    view.insert( new ast.StringInput() );
                }
        )

        valuesRow.append(
                'true',
                function() {
                    view.insert( new ast.TrueLiteral() );
                },

                'false',
                function() {
                    view.insert( new ast.FalseLiteral() );
                }
        )

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

        valuesRow.append(
                null,

                '/ ' + SMALL_EMPTY + ' /', function() {
                    view.insert( new ast.RegExpInput() );
                }
        )

        /*
         * Structural commands, like operators.
         */

        var opsRow = new TouchRow( this.upper, true );

        var replaceWithDoubleOp = function( op ) {
            var current = view.getCurrent();

            current.replace( op );
            view.setCurrent( op );

            if ( ! current.isEmpty() ) {
                op.left.replace( current );
            }

            view.selectEmpty();
        }

        var appendDescriptor = function( topName, bottomName ) {
            var    top =    topName !== null ? descMappings[   topName] : null ;
            var bottom = bottomName !== null ? descMappings[bottomName] : null ;

            assert(    topName === null || top   , "top descriptor not found " + topName );
            assert( bottomName === null || bottom, "bottom descriptor not found " + bottomName );

            if ( top !== null && bottom !== null ) {
                opsRow.append( 
                        SMALL_EMPTY + ' ' + top.html    + ' ' + SMALL_EMPTY,
                        function() { replaceWithDoubleOp( new ast.DoubleOp(top   , descriptors) ); },

                        SMALL_EMPTY + ' ' + bottom.html + ' ' + SMALL_EMPTY,
                        function() { replaceWithDoubleOp( new ast.DoubleOp(bottom, descriptors) ); }
                )
            } else if ( top !== null ) {
                opsRow.append( 
                        SMALL_EMPTY + ' ' + top.html    + ' ' + SMALL_EMPTY,
                        function() { replaceWithDoubleOp( new ast.DoubleOp(top   , descriptors) ); },

                        null
                )
            } else if ( bottom !== null ) {
                opsRow.append( 
                        null,

                        SMALL_EMPTY + ' ' + bottom.html    + ' ' + SMALL_EMPTY,
                        function() { replaceWithDoubleOp( new ast.DoubleOp(bottom, descriptors) ); }
                )
            }
        }

        appendDescriptor( "assignment"          , null              );

        opsRow.appendSeperator();

        appendDescriptor( "add"                 , "subtract"        );
        appendDescriptor( "multiply"            , "divide"          );

        opsRow.appendSeperator();

        appendDescriptor( "equal"               , "not equal"       );
        appendDescriptor( "less than equal"     , "less than"       );
        appendDescriptor( "greater than equal"  , "greater than"    );

        opsRow.appendSeperator();

        appendDescriptor( "and"                 , "or"              );
        appendDescriptor( "bitwise and"         , "bitwise or"      );
        appendDescriptor( "left shift"          , "right shift"     );

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
