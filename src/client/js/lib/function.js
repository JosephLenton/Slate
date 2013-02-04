"use static";

(function() {
    /**
     * Sets the prototype property of the 'dest' function,
     * to that of the 'src' function.
     *
     * Might seem too trivial to build a function for,
     * but it actually makes the other functions simpler
     * and more elegant.
     */
    var copyProto = function( dest, src ) {
        dest.prototype = src.prototype;

        return dest;
    }

    Function.prototype.extend = function() {
        var proto = this.prototype;
        var obj = {};

        for ( var k in proto ) {
            if ( proto.hasOwnProperty(k) ) {
                obj[k] = proto[k];
            }
        }

        for ( var i = 0; i < arguments.length; i++ ) {
            var srcObj = arguments[i];

            if ( (typeof srcObj === 'function') || (srcObj instanceof Function) ) {
                srcObj = srcObj.prototype;
            }

            for ( var k in srcObj ) {
                if ( srcObj.hasOwnProperty(k) ) {
                    obj[k] = srcObj[k];
                }
            }
        }

        return obj;
    }

    Function.prototype.curry = function() {
        var args = arguments,
            self = this;

        return copyProto( this, function() {
            return self.apply( this, args );
        })
    }

    Function.prototype.then = function( post ) {
        var self = this;
        return copyProto( this, function() {
            self.call( this, arguments );
            return post.call( this, arguments );
        })
    }
    Function.prototype.after = Function.prototype.then;

    Function.prototype.before = function( pre ) {
        var self = this;
        return copyProto( this, function() {
            post.call( this, arguments );
            return self.call( this, arguments );
        })
    }

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
