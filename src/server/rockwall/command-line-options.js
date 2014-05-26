"use static";

/**
 * A Command Line Options parser.
 */
(function() {


    var startOption = function( currentOption, options, key, errors ) {
        var nextOption = options[key];

        if ( nextOption === undefined ) {
            errors.push( "unknown option given " + key );

            return options['default'];
        } else {
            // deal with the old result
            if ( currentOption.longName !== 'default' && !currentOption.hasOwnProperty('result') ) {
                if ( currentOption.value === false ) {
                    currentOption.result = true;

                } else {
                    errors.push( "value missing for option '" + currentOption.longName + "'" );
                }

                if ( currentOption.hasOwnProperty('default') ) {
                    currentOption.result = currentOption['default'];
                }
            }

            if ( nextOption.hasOwnProperty('result') ) {
                errors.push( "duplicate option seen" );
            }

            return nextOption;
        }
    }

    var addToOption = function( currentOption, defaultOption, val, errors ) {

        // foo.js,bar.js,foobar.js
        if ( val.indexOf(',') !== -1 ) {
            var valParts = val.split( ',' );
            
            for ( var i = 0; i < valParts.length; i++ ) {
                currentOption = addToOption( currentOption, defaultOption, valParts[i], errors );
            }

            return currentOption;

        // foo.js
        } else {
            if ( currentOption.check ) {
                var newVal = check( val );

                if ( newVal !== undefined ) {
                    val = newVal;
                }
            }

            if ( ! currentOption.multipleValues ) {
                if ( currentOption.hasOwnProperty('result') ) {
                    errors.push( "more than 1 value given for option '" + currentOption.longName + "'" );
                } else {
                    currentOption.result = val;
                }

                return defaultOption;
            } else {
                if ( ! currentOption.hasOwnProperty('result') ) {
                    currentOption.result = [ val ];
                } else {
                    currentOption.result.push( val );
                }

                return currentOption;
            }
        }
    }

    /**
     * Ensures the string has at least a given number of hyphens at the start,
     * and if not, adds some.
     *
     * A resulting string with at least the number of hyphens asked for, is
     * returned.
     *
     * If the string has more hyphens than asked for, they are ignored.
     *
     * @param str The string to check.
     * @param num The minimum number of hyphens asked for.
     * @return A string which has the minimum number of hyphens asked for.
     */
    var ensureHyphens = function( str, num ) {
        for ( var i = 0; i < num; i++ ) {
            if ( str.charAt(i) !== '-' ) {
                num -= i;
                break;
            }
        }

        for ( var i = 0; i < num; i++ ) {
            str = '-' + str;
        }

        return str;
    }



    /**
     * @param str The string to test.
     * @return True if the given string is in the form '--option'
     */
    var isOption = function( str ) {
        return str.length > 2 && 
               str.charAt(0) === '-' && 
               str.charAt(0) === '-'
    }

    /**
     * @param str The string to test.
     * @return True if the given string is in the form '-o'
     */
    var isShortOption = function( str ) {
        return str.length > 1 &&
               str.charAt(0) === '-';
    }



    /**
     * This is essentially the 'main loop' which does the actual parsing of the
     * options available.
     *
     * The result returned is in the form:
     *
     *      { results: { [key:str]: any }, errors: str[] }
     */
    var parseOptions = function( setup, arr, startI ) {
        var shortOptions   = {},
            longOptions    = {},
            errors         = [];

        for ( var k in setup ) {
            if ( setup.hasOwnProperty(k) ) {
                var option = setup[k];
                var clone = {
                        name            : k,
                        longName        : ensureHyphens(k, 2),
                        check           : option.check          || null,
                        value           : option.takesValue     || false,
                        multipleValues  : option.multipleValues || false
                }

                if ( option.hasOwnProperty('default') ) {
                    clone['default'] = option['default'];
                }

                if ( option.hasOwnProperty('short') ) {
                    clone['short'] = ensureHyphens( option['short'], 1 );
                    shortOptions[ clone['short'] ] = clone;
                }

                longOptions[ clone.longName ] = clone;
            }
        }

        var defaultOption = {
                check           : null,
                name            : 'default',
                short           : 'default',
                longName        : 'default',
                takesVal        : true,
                multipleValues  : true
        };

        var currentOption = defaultOption;

         longOptions[ 'default' ]  = defaultOption;
        shortOptions[ 'default' ] = defaultOption;

        // Set to process args if array not supplied.
        // Params at 0 and 1 are 'node' and the name of the script. So skip
        // them to get to the actual args.
        if ( arr === undefined ) {
            arr = process.argv;
            startI = 2;

        // give startI a default if not supplied
        } else if ( startI === undefined ) {
            if ( arr === process.argv ) {
                startI = 2;

            } else {
                startI = 0;

            }
        }

      
        
        // now do the actual processing
        for ( var i = startI; i < arr.length; i++ ) {
            var key = arr[ i ];

            // --option
            if ( key.charAt(0) === '-' ) {
                var optionsGroup = isOption(key) ?
                        longOptions  :
                        shortOptions ;

                // --option=value
                //  -o=value
                var equalI = key.indexOf('=');

                if ( equalI !== -1 ) {
                    var val = key.substring( equalI+1 );
                    key = key.substring( 0, equalI );

                    currentOption = startOption( currentOption, optionsGroup, key, errors );
                    currentOption = addToOption( currentOption, defaultOption, val, errors );
                } else {
                    currentOption = startOption( currentOption, optionsGroup, key, errors );
                }

            // it is not an option, so just add it to our current one
            } else {
                currentOption = addToOption( currentOption, defaultOption, key, errors );
            }
        }

        
        
        // finally compile the results into a pretty object to return
        var results = {};
        for ( var k in longOptions ) {
            if ( longOptions.hasOwnProperty(k) ) {
                var option = longOptions[k];

                if ( option.hasOwnProperty('result') ) {
                    results[option.name] = option.result;
                }
            }
        }



        return {
                params: results,
                errors: errors
        };
    }



    exports.parse = parseOptions;
})();
