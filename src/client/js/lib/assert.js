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
}
AssertionError.prototype = new Error();
AssertionError.prototype.constructor = AssertionError;

/**
 * Note that 0 and empty strings, will not cause failure.
 */
function assert( foo, msg ) {
    if ( foo === undefined || foo === null || foo === false ) {
        throw new AssertionError( msg );
    }
}

function assertUnreachable( msg ) {
    assert( false, msg || "this section of code should never be reached" );
}

function assertFun( f, msg ) {
    if ( typeof f !== 'function' && !(f instanceof Function) ) {
        throw new AssertionError( msg );
    }
}

function assertBool( f, msg ) {
    if ( f !== true && f !== false ) {
        throw new AssertionError( msg );
    }
}

function assertArray( arr, msg ) {
    if ( ! (arr instanceof Array) ) {
        throw new AssertionError( msg );
    }
}

function assertString( str, msg ) {
    if ( typeof str !== 'string' && !(str instanceof String) ) {
        throw new AssertionError( msg );
    }
}

function assertNum( n, msg ) {
    if ( typeof n !== 'number' && !(n instanceof Number) ) {
        throw new AssertionError( msg );
    }
}
