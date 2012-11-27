
chrome.webRequest.onHeadersReceived.addListener(
    function( details ) {
        for (var i = 0; i < details.responseHeaders.length; ++i) {
            if ( details.responseHeaders[i].name === 'X-Frame-Options' ) {
                details.responseHeaders.splice( i, 1 );
                break;
            }
        }

        return {
                responseHeaders: details.responseHeaders
        };
    }, 

    {
        urls: ["<all_urls>"]
    },

    ['responseHeaders', 'blocking']
); 

