"use strict";

(function(slate) {
    function Property( obj, name ) {
        name = '' + name;

        this.name    = name;
        this.value   = obj[ name ];

        this.isProto = obj.hasOwnProperty( name );
        this.isFun   = slate.util.isFunction( obj[name] );
    }

    Property.prototype.toString = function() {
        return this.name;
    }

    slate.obj.Property = Property;

    slate.addFormatHandler({
            type: Property,

            fun: function(obj) {
                var isProto = this.isProto,
                    isFun   = this.isFun;

                var css =
                        isProto &&  isFun ? 'slate-prototype-function' :
                        isProto && !isFun ? 'slate-prototype-property' :
                       !isProto &&  isFun ? 'slate-object-function'    :
                       !isProto && !isFun ? 'slate-object-property'    :
                                            ''                         ;

                return '<div class="' + css + '">' + obj.name + '</div>';
            }
    });
})(window.slate);
