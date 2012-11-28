"use static";

(function(slate) {
    var bindFrameLoading = function( frame, self ) {
        frame.onload = function() {
            self.isLoaded = true ;
            self.isError  = false;

            delete frame.onload ;
            delete frame.onerror;
        }

        frame.onerror = function() {
            self.isLoaded = false;
            self.isError  = true ;

            delete frame.onload ;
            delete frame.onerror;
        }
    }

    /**
     * A HTML Page.
     */
    function Page( src ) {
        this.src = src;

        this.isLoaded = false;
        this.isError  = false;

        this.document = null;
        this.iframe   = null;
    }

    /**
     * Sets a new src for this page.
     * 
     * If it is inserted, then the src will be changed.
     */
    Page.prototype.load = function( newSrc ) {
        this.src = newSrc;

        if ( this.iframe ) {
            this.iframe.setAttribute( 'src', newSrc );

            bindFrameLoading( this.iframe, this );
        }
    }

    Page.prototype.toHTML = function() {
        if ( this.iframe ) {
            return this.iframe.parentNode;
        } else {
            var frame = document.createElement( 'iframe' );
            frame.className = 'slate-embed-html' ;
            frame.setAttribute( 'src', this.src );
            frame.setAttribute( 'frameborder', 'no' );

            bindFrameLoading( frame, this );
            
            var wrap = document.createElement( 'div' );
            wrap.className = 'slate-embed-html-wrap';
            wrap.appendChild( frame );

            this.iframe = frame;

            return wrap;
        }
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

    slate.addLoader( 'html', function(path, read) {
        return new Page( path );
    })

    slate.addFormatHandler({
            type: Page,

            fun: function( r ) {
                return r.toHTML();
            },

            format_returns: false
    })
})(window.slate);
