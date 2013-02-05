"use static";

/**
 * Function.js
 *
 * A Function utility library. Helps with building
 * classes, with aspects-related constructs.
 *
 * Also includes some helper functions, to make
 * working with functions easier.
 */

(function() {
    var wrapFun = function( inner, givenPres, givenPosts ) {
        var pres, posts;

        if ( givenPres !== undefined ) {
            pres = new Array( givenPres.length );

            for ( var i = 0; i < givenPres.length; i++ ) {
                pres[i] = givenPres[i];
            }
        }

        if ( givenPosts !== undefined ) {
            posts = new Array( givenPosts.length );

            for ( var i = 0; i < givenPosts.length; i++ ) {
                posts[i] = givenPosts[i];
            }
        }

        var fun = function() {
            // constructor call!
            if ( this && (this instanceof fun) && (this.isWrapped !== true) ) {
                var obj,
                    argsLen = arguments.length;

                if ( argsLen === 0 ) {
                    obj = new inner();
                } else if ( argsLen === 1 ) {
                    obj = new inner( arguments[0] );
                } else if ( argsLen === 2 ) {
                    obj = new inner( arguments[0], arguments[1] );
                } else if ( argsLen === 3 ) {
                    obj = new inner( arguments[0], arguments[1], arguments[2] );
                } else if ( argsLen === 4 ) {
                    obj = new inner( arguments[0], arguments[1], arguments[2], arguments[3] );
                } else if ( argsLen === 5 ) {
                    obj = new inner( arguments[0], arguments[1], arguments[2], arguments[3], arguments[4] );
                } else if ( argsLen === 6 ) {
                    obj = new inner( arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5] );
                } else {
                    var TempFun = function() { };
                    TempFun.prototype = inner.prototype;

                    var obj = new TempFun();
                    var altObj = inner.apply( obj, arguments );

                    if ( Object(altObj) === altObj ) {
                        obj = altObj;
                    }
                }

                // handle the prototype stuff
                var proto = this.__proto__;
                for ( var k in proto ) {
                    if ( proto.hasOwnProperty(k) ) {
                        var meth = proto[k];

                        if ( (typeof meth === 'function') || (meth instanceof Function) ) {
                            obj[k] = wrapFun( meth );
                        } else {
                            obj[k] = meth;
                        }
                    }
                }

                return obj;
            // regular function call
            } else {
                var hasArgs = arguments.length > 0;
                var returnVal = undefined;

                if ( pres !== undefined ) {
                    for ( var i = 0; i < pres.length; i++ ) {
                        if ( hasArgs ) {
                            returnVal = pres[i].apply( this, arguments );
                        } else {
                            returnVal = pres[i].call( this );
                        }
                    }
                }

                if ( hasArgs ) {
                    returnVal = inner.apply( this, arguments );
                } else {
                    returnVal = inner.call( this );
                }

                if ( posts !== undefined ) {
                    for ( var i = 0; i < posts.length; i++ ) {
                        if ( hasArgs ) {
                            returnVal = posts[i].apply( this, arguments );
                        } else {
                            returnVal = posts[i].call( this );
                        }
                    }
                }

                return returnVal;
            }
        }

        fun.isWrapped = true;

        var argumentFunsToArray = function( args, arr ) {
            var argsLength = args.length;

            if ( arr === undefined ) {
                arr = new Array( argsLength );

                for ( var i = 0; i < argsLength; i++ ) {
                    var fun = args[i];

                    assertFun( fun, "none function given" );

                    arr[i] = fun;
                }
            } else {
                for ( var i = 0; i < argsLength; i++ ) {
                    var fun = args[i];

                    assertFun( fun, "none function given" );

                    arr.push( fun );
                }
            }

            return arr;
        }

        fun.preAdd = function() {
            pres = argumentFunsToArray( arguments, pres );

            return fun;
        }

        fun.add = function() {
            posts = argumentFunsToArray( arguments, posts );

            return fun;
        }

        /**
         * The instance form of clone,
         * tacks on it's own behaviour to ensure
         * that pre/posts get cloned too.
         *
         * @return A shallow clone of this function.
         */
        fun.clone = function() {
            return wrapFun( inner, pres, posts ).
                    proto( this.prototype );
        }

        return fun;
    }

    Function.prototype.eventFields = function( field ) {
        for ( var i = 0; i < arguments.length; i++ ) {
            var field = arguments[i];

            assert( this[field] === undefined, "overriding existing field with new event stack" );

            this[field] = Function.eventField( this );
        }

        return this;
    }

    /**
     *
     */
    var newPrototypeArray = function( src, arr, check ) {
        var hasCheck = ( arguments.length >= 3 );
        var proto = src.prototype;

        var obj = {};
        for ( var k in proto ) {
            if ( proto.hasOwnProperty(k) ) {
                obj[k] = proto[k];
            }
        }

        for ( var i = 0; i < arr.length; i++ ) {
            var srcObj = arr[i];

            if ( srcObj instanceof Array ) {
                for ( var j = 0; j < srcObj.length; j++ ) {
                    var k = srcObj[j];

                    assert( hasCheck, "Function implementation missing for " + k );

                    var alt = check( obj, k, undefined );

                    assert( alt !== undefined, "Function implementation missing for " + k );

                    obj[k] = alt;
                }
            } else {
                while ( (typeof srcObj === 'function') || (srcObj instanceof Function) ) {
                    srcObj = srcObj.prototype;
                }

                for ( var k in srcObj ) {
                    if ( srcObj.hasOwnProperty(k) ) {
                        if ( hasCheck ) {
                            var alt = check( obj, k, srcObj[k] );

                            if ( alt !== undefined ) {
                                obj[k] = alt;
                            } else {
                                obj[k] = srcObj[k];
                            }
                        } else {
                            obj[k] = srcObj[k];
                        }
                    }
                }
            }
        }

        return obj;
    }

    /**
     * @return A function with the same properties set as this function, like a shallow copy.
     */
    /*
     * If this is being called, then it cannot be a wrapped fun,
     * because it replaces the clone method.
     *
     * However we still have to check, incase it was called manually.
     */
    Function.prototype.clone = function() {
        if ( false && this.isWrapped && this.hasOwnProperty('clone') ) {
            return this.clone();
        } else {
            var self = this;
            var fun = function() {
                self.apply( this, arguments );
            }

            fun.prototype = this.prototype;

            return this;
        }
    }

    /**
     * Duplicates this function, and sets a new prototype for it.
     *
     * @param The new prototype.
     */
    Function.prototype.proto = function( newProto ) {
        while ( (typeof newProto === 'function') || (newProto instanceof Function) ) {
            newProto = newProto.prototype;
        }

        this.prototype = newProto;

        return this;
    }

    /**
     * This creates a new prototype,
     * with the methods provided extending it.
     *
     * it's the same as 'extend', but returns an object for use
     * as a prototype instead of a funtion.
     */
    Function.prototype.newPrototype = function() {
        return newPrototypeArray( this, arguments );
    }

    /**
     * Used to generate the Function extension methods.
     */
    var newFunctionExtend = function( errMsg, isOkCallback ) {
        return function() {
            var errors = null;

            var proto = newPrototypeArray( this, arguments, function(dest, k, val) {
                var val = isOkCallback(dest, k, val);

                if (
                        val !== undefined &&
                        val !== null &&
                        val !== false &&
                        val !== true
                ) {
                    return val;
                } else if ( val !== true ) {
                    if ( errors === null ) {
                        errors = [ k ];
                    } else {
                        errors.push( k );
                    }
                } else {
                    return undefined;
                }
            } )
             
            if ( errors !== null ) {
                throw new Error( errMsg + "\n    " + errors.join(', ') );
            }

            return this.clone().proto( proto );
        }
    }

    /**
     * Same as append, but the methods it overrides *must* exist.
     *
     * This allows you to have a sanity check.
     */
    Function.prototype.override = newFunctionExtend(
            "Methods overriding but do not exist,",
            function(dest, k, val) {
                return ( dest[k] !== undefined )
            }
    )

    Function.prototype.before = newFunctionExtend(
            "Pre-Adding method behaviour, but original method not found,",
            function(dest, k, val) {
                if ( dest[k] === undefined ) {
                    return undefined;
                } else {
                    return dest[k].preSub( val );
                }
            }
    )

    Function.prototype.after = newFunctionExtend(
            "Adding method behaviour, but original method not found,",
            function(dest, k, val) {
                if ( dest[k] === undefined ) {
                    return undefined;
                } else {
                    return dest[k].sub( val );
                }
            }
    )

    /**
     * Adds on extra methods, but none of them are allowed 
     * to override any others.
     *
     * This is used as a sanity check.
     */
    Function.prototype.extend = newFunctionExtend(
            "Methods extending but do not exist,",
            function(dest, k, val) {
                return ( dest[k] === undefined )
            }
    )

    Function.prototype.require = newFunctionExtend(
            "Pre-Adding method behaviour, but original method not found,",
            function(dest, k, val) {
                if ( dest[k] !== undefined ) {
                    return dest[k];
                } else {
                    return function() {
                        throw new Error( "Function not implemented " + k );
                    }
                }
            }
    )

    /**
     * Copies this function, and returns a new one,
     * with the parameters given tacked on.
     */ 
    Function.prototype.curry = function() {
        return curryAndRice( this, arguments, true );
    }

    Function.prototype.rice = function() {
        return curryAndRice( this, arguments, false );
    }

    var curryAndRice = function( self, args, prePend ) {
        return (function() {
                    /*
                     * Concat the old and new arguments together,
                     * into one.
                     *
                     * The first check allows us to skip this process,
                     * if arguments were not supplied for the second call.
                     */
                    var fullArgs;
                    if ( arguments.length === 0 ) {
                        fullArgs = args;
                    } else {
                        if ( prePend ) {
                            var argsLen = args.length;
                            fullArgs = new Array( argsLen + arguments.length );

                            for ( var i = 0; i < argsLen; i++ ) {
                                fullArgs[i] = args[i];
                            }

                            for ( var i = 0; i < arguments.length; i++ ) {
                                fullArgs[i + argsLen] = arguments[i];
                            }
                        } else {
                            var argsLen = arguments.length;
                            fullArgs = new Array( args.length + argsLen );

                            for ( var i = 0; i < argsLen; i++ ) {
                                fullArgs[i] = arguments[i];
                            }

                            for ( var i = 0; i < arguments.length; i++ ) {
                                fullArgs[i + argsLen] = args[i];
                            }
                        }
                    }

                    return self.apply( this, fullArgs );
                }).
                proto( self );
    }

    /**
     * Copies this function, tacking on the 'pre' function given.
     *
     * That is because the after behaviour does *not* modify this function,
     * but makes a copy first.
     *
     * @param pre A function to call.
     * @return A new function, with the pre behaviour tacked on, to run before it.
     */
    Function.prototype.preSub = function( pre ) {
        var self = this;
        return (function() {
                    pre.apply( this, arguments );
                    return self.apply( this, arguments );
                }).
                proto( this );
    }

    /**
     * This allows you to wrap around this function,
     * with new functionality.
     *
     * Note that with the given 'wrap' function,
     * the first parameter is always the function being wrapped.
     * So parameters start from index 1, not 0.
     *
     * i.e.
     *
     *      foo.wrap( function(fooCaller, param1, param2, param3) {
     *          param1 *= 2;
     *          var fooResult = fooCaller( param1, param2 );
     *          return param3 + fooResult;
     *      } );
     *
     * @param wrap The variable to wrap functionality with.
     */
    Function.prototype.wrap = function( wrap ) {
        assertFun( wrap, "function not provided for wrap parameter" );

        var self = this;
        return (function() {
                    var args = new Array( arguments.length+1 );
                    for ( var i = 0; i < arguments.length; i++ ) {
                        args[i+1] = arguments[i];
                    }

                    args[0] = self.bind( this );

                    return wrap.call( this, arguments );
                }).
                proto( this );
    }

    /**
     * Copies this function, tacking on the 'post' function given.
     *
     * This is intended for sub-classing,
     * hence the name, 'sub'.
     *
     * That is because the after behaviour does *not* modify this function,
     * but makes a copy first.
     *
     * @param post A function to call.
     * @return A new function, with the post behaviour tacked on.
     */
    Function.prototype.sub = function( post ) {
        var self = this;
        return (function() {
                    self.apply( this, arguments );
                    return post.apply( this, arguments );
                }).
                proto( this );
    }

    /**
     * When called, a copy of this function is returned,
     * with the given 'pre' function tacked on before it.
     */
    Function.prototype.subBefore = function( pre ) {
        return (function() {
                    post.call( this, arguments );
                    return self.call( this, arguments );
                }).
                proto( this );
    }

    /*
     *  ### Time Functions ###
     */

    Function.prototype.callLater = function( target ) {
        var argsLen = arguments.length;
        var self = this;

        if ( argsLen <= 1 ) {
            return setTimeout( function() {
                this.call( target );
            }, 0 );
        } else if ( argsLen === 2 ) {
            var param1 = arguments[1];

            return setTimeout( function() {
                this.call( target, param1 );
            }, 0 );
        } else if ( argsLen === 3 ) {
            var param1 = arguments[1];
            var param2 = arguments[2];

            return setTimeout( function() {
                this.call( target, param1, param2 );
            }, 0 );
        } else if ( argsLen === 4 ) {
            var param1 = arguments[1];
            var param2 = arguments[2];
            var param3 = arguments[3];

            return setTimeout( function() {
                this.call( target, param1, param2, param3 );
            }, 0 );
        } else {
            return this.applyLater( target, arguments );
        }
    }

    Function.prototype.applyLater = function( target, args ) {
        if ( arguments.length <= 1 ) {
            args = new Array(0);
        }

        var self = this;

        return setTimeout( function() {
            self.apply( target, args );
        }, 0 );
    }

    /**
     * Sets this function to be called later.
     * If a timeout is given, then that is how long it
     * will wait for.
     *
     * If no timeout is given, it defaults to 0.
     *
     * Cancelling the timeout can be done using 'clearTimeout'.
     *
     * @param timeout The timeout to wait before calling this function.
     * @return The setTimeout identifier token, allowing you to cancel the timeout.
     */
    Function.prototype.later = function( timeout ) {
        if ( arguments.length === 0 ) {
            timeout = 0;
        }

        return setTimeout( this, timeout );
    }
})();
