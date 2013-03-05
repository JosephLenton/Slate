
# check.js.

Standard safety checking, for any project.
From a jQuery plugin, to a big web project.

This includes
 - assertions
 - object type checks


    var objPrototype   = ({}).__proto__;
    var objConstructor = objPrototype.constructor;
    
    var argsConstructor = (function() {
        return arguments.constructor;
    })();


-------------------------------------------------------------------------------

## isObject

Tests for a JSON object literal.

```
    isObject( {} ) // -> true
    isObject( new FooBar() ) // -> false

Specifically it *only* does object literals, and not regular objects.

For regular objects do ...

```
    obj instanceof Object

@param obj The object to test.
@return True if it is an object, false if not.

-------------------------------------------------------------------------------

    window['isObject'] = function( obj ) {
        if ( obj !== undefined && obj !== null ) {
            var proto = obj.__proto__;

            if ( proto !== undefined && proto !== null ) {
                return proto             === objPrototype   &&
                       proto.constructor === objConstructor ;
            }
        }

        return false;
    }

    window['isNumber'] = function( n ) {
        return ( typeof n === 'number'   ) || ( n instanceof Number );
    }

    window['isFunction'] = function( f ) {
        return ( typeof f === 'function' ) || ( f instanceof Function );
    }

-------------------------------------------------------------------------------

## isNumeric

Returns true if the value is like a number.
This is either an actual number, or a string which represents one.

@param str The string to test.
@return True, if given a number, or if it looks like a number, otherwise false.

-------------------------------------------------------------------------------

    window['isNumeric'] = function( str ) {
        return ( typeof str === 'number' ) ||
               ( str instanceof Number   ) ||
               ( String(str).search( /^\s*(\+|-)?((\d+(\.\d+)?)|(\.\d+))\s*$/ ) !== -1 )
    }

-------------------------------------------------------------------------------

-------------------------------------------------------------------------------

    window['isString'] = function( str ) {
        return ( typeof str === 'string' ) || ( str instanceof String );
    }

    window['isLiteral'] = function(obj) {
        return isString(obj) ||
                isNumber(obj) ||
                obj === undefined ||
                obj === null ||
                obj === true ||
                obj === false
    }

    window['isArrayArguments'] = function( arr ) {
        return ( arr instanceof Array ) ||
               (
                       arr !== undefined &&
                       arr !== null &&
                       arr.constructor === argsConstructor &&
                       arr.length !== undefined
               )
    }

    window['isArray'] = function( arr ) {
        return ( arr instanceof Array );
    }


# Assertions.

-------------------------------------------------------------------------------
## Assertion Error

An Error type, specific for assertions.

-------------------------------------------------------------------------------

    window["AssertionError"] = function( msg ) {
        if ( ! msg ) {
            msg = "assertion failed";
        }

        Error.call( this, msg );

        this.name = "AssertionError";
        this.message = msg;

        var errStr = '';
        var scriptLine;
        try {
            var thisStack;
            if ( this.stack ) {
                thisStack = this.stack;

                scriptLine = thisStack.split( "\n" )[1];
                if ( scriptLine ) {
                    scriptLine = scriptLine.replace( /:[0-9]+:[0-9]+$/, '' );
                    scriptLine = scriptLine.replace( /^.* /, '' );
                    throw new Error();
                }
            }
        } catch ( err ) {
            var errStack = err.stack.split("\n");

            for ( var i = 1; i < errStack.length; i++ ) {
                if ( errStack[i].indexOf( scriptLine ) === -1 ) {
                    errStr = errStack.slice(i).join( "\n" );
                    break;
                }
            }

            if ( errStr === '' ) {
                errStr = errStack.join( "\n" );
            }
        }

        console.error( 'Assertion Error, ' + msg );
        for ( var i = 1; i < arguments.length; i++ ) {
            console.log( arguments[i] );
        }
        if ( errStr !== '' ) {
            console.error( "\n" + errStr );
        }
    }
    AssertionError.prototype = new Error();
    AssertionError.prototype.constructor = AssertionError;

-------------------------------------------------------------------------------

## logError

A shorthand alternative to performing

```
    throw new Error( "whatever" )

Throws a new Error object,
which displays the message given.

What is unique about this function,
is that it will also print out all of the
arguments given, before it throws the error.

```
    logError( "some-error", a, b, c )
    
    // equivalent to ...
    
    console.log( a );
    console.log( b );
    console.log( c );
    throw new Error( "some-error" );

This allows you to have console.log +
throw new Error, built together, as one.

@param msg The message to display in the error.

-------------------------------------------------------------------------------

    window["logError"] = function( msg ) {
        var err = Object.create( AssertionError.prototype );
        AssertionError.apply( err, arguments );
        throw err;
    }

-------------------------------------------------------------------------------

## assert

Note that 0 and empty strings, will not cause failure.

@param foo
@param msg

-------------------------------------------------------------------------------

    window["assert"] = function( foo, msg ) {
        if ( foo === undefined || foo === null || foo === false ) {
            throw new AssertionError( msg, foo );
        }
    }

-------------------------------------------------------------------------------

## assertNot

Throws an assertion error, if what is given if truthy.

Note that 0 and empty strings, will cause failure.

@param foo
@param msg

-------------------------------------------------------------------------------

    window["assertNot"] = function( foo, msg ) {
        if (
                foo !== false &&
                foo !== null &&
                foo !== undefined
        ) {
            throw new AssertionError( msg, foo );
        }
    }

-------------------------------------------------------------------------------

## assert unreachable

Displays a generic error message, that the current location in code, is meant
to be unreachable. So something has gone wrong.

This always throws an assertion error.

-------------------------------------------------------------------------------

    window["assertUnreachable"] = function( msg ) {
        assert( false, msg || "this section of code should never be reached" );
    }

    window["assertObject"] = function( obj, msg ) {
        if ( ! isObject(obj) ) {
            throw new AssertionError( msg || "code expected a JSON object literal", obj );
        }
    }

-------------------------------------------------------------------------------

## assert literal

Throws an AssertionError if the value given is not
a literal value.

@param obj
@param msg

-------------------------------------------------------------------------------

    window["assertLiteral"] = function( obj, msg ) {
        if ( ! isLiteral(obj) ) {
            throw new AssertionError( msg || "code expected a JSON object literal", obj );
        }
    }

-------------------------------------------------------------------------------

## assert function

@param f A function object to test.
@param msg The message to display if the test fails.

-------------------------------------------------------------------------------

    window["assertFunction"] = function( f, msg ) {
        if ( typeof f !== 'function' && !(f instanceof Function) ) {
            throw new AssertionError( msg, f );
        }
    }

-------------------------------------------------------------------------------

## assert bool

@param f The boolean value to test.
@param msg The error message on failure.

-------------------------------------------------------------------------------

    window["assertBool"] = function( f, msg ) {
        if ( f !== true && f !== false ) {
            throw new AssertionError( msg, f );
        }
    }

    window["assertArray"] = function( arr, msg ) {
        if ( ! (arr instanceof Array) && (arr.length === undefined) ) {
            throw new AssertionError( msg, arr );
        }
    }

    window["assertString"] = function( str, msg ) {
        if ( typeof str !== 'string' && !(str instanceof String) ) {
            throw new AssertionError( msg, str );
        }
    }

    window["assertNum"] = function( n, msg ) {
        if ( typeof n !== 'number' && !(n instanceof Number) ) {
            throw new AssertionError( msg, n );
        }
    }
