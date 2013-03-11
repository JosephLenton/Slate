
Range
=====

===============================================================================

    window['slate'] = window['slate'] || {};

-------------------------------------------------------------------------------

## Range Class

-------------------------------------------------------------------------------

    var Range = function( lower, upper ) {
        if ( isString(lower) ) {
            lower = lower|0;
        }

        if ( isString(upper) ) {
            upper = upper|0;
        }

        if ( lower !== lower || !isNumber(lower) ) {
            throw new Error( "lower value for range is not a number" );
        }

        if ( upper !== upper || !isNumber(upper) ) {
            throw new Error( "lower value for range is not a number" );
        }

        this.lowerVal = lower;
        this.upperVal = upper;
    }

    Range.prototype.each = function( block ) {
        var upper = this.upperVal;

        for ( var i = this.lowerVal; i < upper; i++ ) {
            block( i );
        }

        return this;
    }

    Range.prototype.map = function( block ) {
        var upper = this.upperVal;
        var rs = new Array( upper-this.lowerVal );
        var index = 0;

        for ( var i = this.lowerVal; i < upper; i++ ) {
            rs[index++] = block( i );
        }

        return rs;
    }

    window['slate']['Range'] = Range;

