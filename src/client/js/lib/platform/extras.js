"use strict";

(function() {
    var extend = function( obj, extras ) {
        for ( var k in extras ) {
            if ( extras.hasOwnProperty(k) ) {
                obj[k] = extras[k];
            }
        }
    }

    /*
     * ### ### ### ### ### ### ### ### ### ### ### ### 
     *          String
     * ### ### ### ### ### ### ### ### ### ### ### ### 
     */

    extend( String.prototype, {
            /**
             * This is the equivalent to:
             *
             *      someString.split( str ).pop() || ''
             *
             * What it does, is find the last occurance of
             * 'str', and then returns a substring of
             * everything after that occurance.
             *
             * @param str The string to look for.
             * @return The string found, or an empty string if not found.
             */
            lastSplit: function( str ) {
                var index = this.lastIndexOf( str );

                if ( index === -1 ) {
                    return '';
                } else {
                    return this.substring( index+1 );
                }
            }
    } )

    /*
     * ### ### ### ### ### ### ### ### ### ### ### ### 
     *          Array
     * ### ### ### ### ### ### ### ### ### ### ### ### 
     */

    var oldMap = Array.prototype.map;

    /**
     * Same as 'filterMethod', however this will remove
     * all items which return 'true', rather than keep them.
     *
     * This is useful for when things return 'true',
     * and you don't want them. For example:
     *
     *  var nonEmptyNodes = nodes.filterOutMethod( 'isEmpty' )
     */
    extend( Array.prototype, {
            filterOutMethod: function( meth ) {
                var fun;
                if ( arguments.length > 1 ) {
                    var args = new Array( arguments.length-1 );
                    for ( var i = 1; i < arguments.length; i++ ) {
                        args[i-1] = arguments[i];
                    }

                    fun = function( obj ) {
                        var r = obj[meth].apply( obj, args );
                        return r === null || r === false || r === undefined;
                    }
                } else {
                    fun = function( obj ) {
                        var r = obj[meth]();
                        return r === null || r === false || r === undefined;
                    }
                }

                return this.filter( fun );
            },

            /**
             * Calls the given method against all elements in the array.
             * If it returns a non-falsy item (false, null, or undefined),
             * then it will be kept.
             *
             * Otherwise, it will be removed.
             *
             *  var emptyNodes = nodes.filterOutMethod( 'isEmpty' )
             */
            filterMethod: function( meth ) {
                var fun;
                if ( arguments.length > 1 ) {
                    var args = new Array( arguments.length-1 );
                    for ( var i = 1; i < arguments.length; i++ ) {
                        args[i-1] = arguments[i];
                    }

                    fun = function() {
                        var r = this[meth].apply( this, args );
                        return r !== null && r !== false && r !== undefined;
                    }
                } else {
                    fun = function() {
                        var r = this[meth]();
                        return r !== null && r !== false && r !== undefined;
                    }
                }

                return this.filter( fun );
            },

            /**
             * This is shorthand for using filterType,
             * where 'keepProto' is set to false.
             */
            filterOutType: function( proto, thisObj ) {
                if ( arguments.length > 1 ) {
                    return this.filterType( proto, thisObj, false );
                } else {
                    return this.filterType( proto, false );
                }
            },

            /**
             * Filters object based on the prototype given.
             * This can work in two ways:
             *
             *  - keepProto = true - keep only object, of that type
             *  - keepProto = true - keep all objects, except for that type
             *
             * By default, keepProto is true, and so will keep only items
             * which match the proto constructor given.
             */
            filterType: function( proto, thisObj, keepProto ) {
                var hasThis = false;
                var argsLen = arguments.length;

                if ( argsLen === 0 ) {
                    throw new Error( "not enough parameters given, no prototype!" );
                } else if ( argsLen === 1 ) {
                    keepProto = true;
                } else if ( argsLen === 2 ) {
                    if ( thisObj === true || thisObj === false ) {
                        keepProto = thisObj;
                        hasThis = false;
                    } else {
                        keepProto = true;
                        hasThis = true;
                    }
                } else {
                    hasThis = true;
                }

                var fun = keepProto ?
                        function() { return  (this instanceof proto) } :
                        function() { return !(this instanceof proto) } ;

                /*
                 * If a this object is provided,
                 * ensure it's not a common falsy value,
                 * often used for no object.
                 */
                if ( hasThis &&
                        (
                                thisObj === undefined ||
                                thisObj === null ||
                                thisObj === false
                        )
                ) {
                    throw new Error( "invalid 'thisObj' given" );
                }

                if ( hasThis ) {
                    return this.filter( fun, thisObj );
                } else {
                    return this.filter( fun );
                }
            },

            map: function( fun ) {
                if ( typeof fun === 'string' || (fun instanceof String) ) {
                    var args = new Array( arguments.length-1 );
                    for ( var i = 0; i < args.length; i++ ) {
                        args[i] = arguments[i-1];
                    }

                    return oldMap.call( this, function(obj) {
                        return obj[fun].apply( obj, args );
                    } );
                } else {
                    return oldMap.apply( this, arguments );
                }
            },

            inject: function( sum, fun ) {
                if ( arguments.length === 1 ) {
                    assertFunction( sum, "no inject function provided" );
                    return this.reduce( sum );
                } else {
                    assertFunction( fun, "no inject function provided" );
                    return this.reduce( fun, sum );
                }
            }
    })
})();

