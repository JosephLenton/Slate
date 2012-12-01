"use static";

/**
 * These are HTML elements, that are wrapped,
 * and can be loaded in.
 *
 * For example an iframe with contents,
 * or an Image tag.
 */

(function(slate) {
    var bindLoading = function( el, dom ) {
        el.isLoaded = false;
        el.isError  = false;

        dom.onload = function() {
            el.isLoaded = true;
            el.isError  = false;

            delete dom.onload;
            delete dom.onerror;

            if ( el.onLoad ) {
                el.onLoad( dom );
            }
        }

        dom.onerror = function() {
            el.isLoaded = false;
            el.isError  = true;

            delete dom.onload;
            delete dom.onerror;

            if ( el.onError ) {
                el.onError( dom );
            }
        }
    }

    /**
     * A generic 'loadable' HTML element,
     * i.e. an image, or an iframe.
     */
    var LoadingHTML = function( dom, src ) {
        if ( arguments.length === 0 ) {
            return;
        }

        this.src = '';
        this.dom = dom;

        this.load( src );
    }

    LoadingHTML.prototype.load = function( src ) {
        if ( src ) {
            this.src = src;

            this.dom.setAttribute( 'src', src );
            bindLoading( this, this.dom );
        }
    }

    /**
     * A HTML Image, which is displayed, or wraps an existing image element.
     */
    function Image( src ) {
        this.width  = 0;
        this.height = 0;

        slate.LoadingHTML.call( this, document.createElement('img'), src );
    }

    Image.prototype = new LoadingHTML;

    Image.prototype.onLoad = function( dom ) {
        this.width  = dom.width ;
        this.height = dom.height;
    }

    Image.prototype.onError = function( dom ) {
        this.width  = 0;
        this.height = 0;
    }

    Image.prototype.toHTML = function(img) {
        var div = document.createElement( 'div' );
        div.className = 'slate-embed-img';

        div.appendChild( img.dom );

        return div;
    }

    /**
     * A HTML Page.
     */
    function Page( src ) {
        this.document = null;

        var iframe = document.createElement( 'iframe' );
        iframe.setAttribute( 'frameborder', 'no' );
        iframe.className = 'slate-embed-html';

        LoadingHTML.call( this, iframe, src );
    }

    Page.prototype = new LoadingHTML;

    Page.prototype.onLoad = function( iframe ) {
        this.document = iframe.contentDocument || contentWindow.document ;
    }

    /**
     * Adds an outline to all elements inside of the Page.
     * 
     * @param callback Optional, a callback to call into, to chaing off this method.
     */
    Page.prototype.outline = function( callback ) {
        if ( this.isLoaded ) {
            var doc = this.document;

            var RULE_TEXT = '* { outline: rgba(255, 0, 255, 0.4) solid 1px !important; }';

            /* search for the rule, and if found, remove it */
            if ( doc.styleSheets ) {
                var sheets = doc.styleSheets;

                /* search back to front */
                for ( var i = sheets.length-1; i >= 0; i-- ) {
                    var sheet = sheets[i], rules = sheet.cssRules;

                    if ( rules ) {
                        for ( var j = rules.length-1; j >= 0; j-- ) {
                            var rule = rules[j];

                            if ( rule.cssText && rule.cssText === RULE_TEXT ) {
                                sheet.deleteRule( j );

                                return;
                            }
                        }
                    }
                }
            }

            /* failed to find and remove, so just add the style, to the end */
            if ( doc.styleSheets && doc.styleSheets.length > 0 ) {
                var sheet = doc.styleSheets[ doc.styleSheets.length-1 ];
                sheet.insertRule( RULE_TEXT, sheet.rules.length-1 );
            } else {
                var style = doc.createElement( 'style' );
                style.innerHTML = RULE_TEXT;
                doc.head.appendChild( style );
            }
        }

        if ( callback ) {
            callback( this );
        }
    }

    Page.prototype.toHTML = function() {
        var parent = this.dom.parentNode;

        if ( parent ) {
            parent.parentNode.removeChild( parent );
        }

        var wrap = document.createElement( 'div' );
        wrap.className = 'slate-embed-html-wrap';
        wrap.appendChild( this.dom );

        return wrap;
    }

    /* Hook them into Slate */

    slate.addLoader([ 'png', 'jpg', 'jpeg' ], function(path, read) {
        return new Image( path );
    })

    slate.addLoader( 'html', function(path, read) {
        return new Page( path );
    })

    slate.addFormatHandler({
            type: [ Page, Image ],

            fun: function( obj ) {
                return obj.toHTML();
            },

            format_returns: false
    })
})(window.slate);
