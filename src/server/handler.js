"use static";

exports.Handler = (function() {
    var Handler = function( handles ) {
        this.handleObj = {};

        if ( handles ) {
            this.handles( handles );
        }
    }

    Handler.newHandlerPrototype = function( handlers ) {
        var Klass = function() {
            Handler.call( this, handlers )
        }

        Klass.prototype = new Handler();

        return Klass;
    }

    Handler.prototype.handleNotFound = function() {
        /* do nothing */
    }

    Handler.prototype.handles = function( name, action ) {
        if ( arguments.length === 1 ) {
            for ( var k in name ) {
                if ( name.hasOwnProperty(k) ) {
                    this.handles( k, name[k] )
                }
            }
        } else {
            this.handleObj[name] = action;
        }
    }

    Handler.prototype.handle = function( type ) {
        var args = new Array( arguments.length-1 );
        for ( var i = 1; i < arguments.length; i++ ) {
            args[i-1] = arguments[i];
        }

        if ( this.handleObj.hasOwnProperty(type) ) {
            return this.handleObj[type].apply( this, args );
        } else {
            return this.handleNotFound.apply( this, args );
        }
    }

    return Handler;
})();
