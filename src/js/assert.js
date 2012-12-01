"use strict";

/*
 * Assert.js.
 * 
 * A small assertion library,
 * which contains common assertion functions.
 */

/**
 * Note that 0 and empty strings, will not cause failure.
 */
function assert( foo, msg ) {
    if ( foo === undefined || foo === null || foo === false ) {
        throw new Error( msg );
    }
}

function assertFun( f, msg ) {
    if ( typeof f !== 'function' && !(f instanceof Function) ) {
        throw new Error( msg );
    }
}

function assertBool( f, msg ) {
    if ( f !== true && f !== false ) {
        throw new Error( msg );
    }
}

function assertArray( arr, msg ) {
    if ( ! (arr instanceof Array) ) {
        throw new Error( msg );
    }
}

function assertString( str, msg ) {
    if ( typeof str !== 'string' && !(str instanceof String) ) {
        throw new Error( msg );
    }
}

function assertNum( n, msg ) {
    if ( typeof n !== 'number' && !(n instanceof Number) ) {
        throw new Error( msg );
    }
}
