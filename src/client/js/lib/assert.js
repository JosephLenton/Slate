"use strict";

/*
 * Assert.js.
 * 
 * A small assertion library,
 * which contains common assertion functions.
 */

/**
 * An Error type, specific for assertions.
 */
function AssertionError( msg ) {
    if ( ! msg ) {
        msg = "assertion failed";
    }

    Error.call( this, msg );

    this.name = "AssertionError";
    this.message = msg;

    console.log( 'Assertion Error, ' + msg );
    for ( var i = 1; i < arguments.length; i++ ) {
        console.log( arguments[i] );
    }
}
AssertionError.prototype = new Error();
AssertionError.prototype.constructor = AssertionError;

/**
 * Throws a new Error object,
 * which displays the message given.
 *
 * What is unique about this function,
 * is that it will also print out all of the
 * arguments given, before it throws the error.
 *
 * This allows you to have console.log +
 * throw new Error, built together, as one.
 *
 * @param msg The message to display in the error.
 */
function logError( msg ) {
    for ( var i = 0; i < arguments.length; i++ ) {
        console.log( arguments[i] );
    }

    throw new Error( msg );
}

/**
 * Note that 0 and empty strings, will not cause failure.
 */
function assert( foo, msg ) {
    if ( foo === undefined || foo === null || foo === false ) {
        throw new AssertionError( msg, foo );
    }
}

function assertUnreachable( msg ) {
    assert( false, msg || "this section of code should never be reached" );
}

function assertObj( obj, msg ) {
    if ( typeof obj !== 'object' && !(obj instanceof Object) ) {
        throw new AssertionError( msg, obj );
    }
}

function assertFun( f, msg ) {
    if ( typeof f !== 'function' && !(f instanceof Function) ) {
        throw new AssertionError( msg, f );
    }
}

function assertBool( f, msg ) {
    if ( f !== true && f !== false ) {
        throw new AssertionError( msg, f );
    }
}

function assertArray( arr, msg ) {
    if ( ! (arr instanceof Array) && (arr.length === undefined) ) {
        throw new AssertionError( msg, arr );
    }
}

function assertString( str, msg ) {
    if ( typeof str !== 'string' && !(str instanceof String) ) {
        throw new AssertionError( msg, str );
    }
}

function assertNum( n, msg ) {
    if ( typeof n !== 'number' && !(n instanceof Number) ) {
        throw new AssertionError( msg, n );
    }
}
