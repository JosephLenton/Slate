"use strict";

/**
 * abc.js
 *
 * a is for assertions
 * b is for blocks
 * c is for console
 *
 * e if for eval
 * f is for print fields
 *
 * m is for method call
 *
 * p is for print
 */

/**
 * Assertion
 */
Object.prototype.a = function( block, msg ) {
    if ( block ) {
        return this;
    } else {
        if ( msg ) {
            throw new Error( msg );
        } else {
            throw new Error( "assertion error!" )
        }
    }
}

/**
 * Block
 */
Object.prototype.b = function( cmd ) {
    cmd( this );

    return this;
}

Object.prototype.c = function( msg ) {
    console.log( msg || this );

    return this;
}

Object.prototype.e = function() {
    return eval( this );
}

Object.prototype.f = function( field ) {
    console.log( this[field] );

    return this;
}

Object.prototype.m = function( method ) {
    var args = new Array( arguments.length-1 );
    for ( var i = 1; i < arguments.length; i++ ) {
        args[i-1] = arguments[i];
    }

    this[method].apply( this, args );

    return this;
}

Object.prototype.p = function( msg ) {
    if ( arguments.length === 0 ) {
        console.log( this );
    } else {
        console.log( msg, this );
    }

    return this;
}

