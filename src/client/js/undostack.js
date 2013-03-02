"use strict";

window.slate = window.slate || {};
window.slate.UndoStack = (function(window) {
    /**
     * An undo stack, which you can push undo items onto,
     * and take them out.
     *
     * It's hooked up with optional events,
     * allowing you to decide what happens when.
     */
    function UndoStack( target ) {
        this.stack = [];
        this.index = 0;

        this.undoFuns = null;
        this.redoFuns = null;

        this.undoChange = null;
        this.redoChange = null;

        this.target = target || null;
    }

    var addFun = function( funs, fun ) {
        assert( (funs === null) || (funs instanceof Array), "funs should be null, or an array" );
        assertFunction( fun );

        if ( funs === null ) {
            return [ fun ];
        } else {
            funs.push( fun );

            return funs;
        }
    }

    var callFuns = function( target, funs, arg ) {
        if ( funs !== null ) {
            for ( var i = 0; i < funs.length; i++ ) {
                funs[i].call( target, arg );
            }
        }
    }

    UndoStack.prototype.onUndo = function( fun ) {
        this.undoFuns = addFun( this.undoFuns, fun );
        return this;
    }

    UndoStack.prototype.onRedo = function( fun ) {
        this.redoFuns = addFun( this.redoFuns, fun );
        return this;
    }

    UndoStack.prototype.clearUndos = function() {
        this.undoFuns = null;
        return this;
    }

    UndoStack.prototype.clearRedos = function() {
        this.redoFuns = null;
        return this;
    }

    UndoStack.prototype.onUndoChange = function( fun ) {
        this.undoChange = addFun( this.undoChange, fun );
        return this;
    }

    UndoStack.prototype.onRedoChange = function( fun ) {
        this.redoChange = addFun( this.redoChange, fun );
        return this;
    }

    UndoStack.prototype.hasUndo = function() {
        return this.index > 0;
    }

    UndoStack.prototype.hasRedo = function() {
        return this.index < this.stack.length;
    }

    UndoStack.prototype.add = function( state ) {
        if ( this.index < this.stack.length ) {
            this.stack.splice( this.index++, 0, state );

            callFuns( this.redoChange, false );
        } else {
            this.stack[ this.index++ ] = state;
        }

        callFuns( this.undoChange, true  );
    }

    UndoStack.prototype.undo = function() {
        if ( this.hasUndo() ) {
            if ( ! this.hasRedo() ) {
                callFuns( this.redoChange, true );
            }

            this.index--;
            var temp = this.stack[ this.index ];
            
            // If we now reached the back, update the events.
            if ( ! this.hasUndo() ) {
                callFuns( this.undoChange, false );
            }

            callFuns( this.undoFuns, temp );

            return temp;
        } else {
            return null;
        }
    }

    UndoStack.prototype.redo = function() {
        if ( this.hasRedo() ) {
            // If we were at the beginning, we have now moved forward,
            // and so we will no longer be at the beginning.
            // So undo's are allowed.
            if ( ! this.hasUndo() ) {
                callFuns( this.undoChange, true );
            }

            var temp = this.stack[ this.index ];
            this.index++;

            // If we now reached the front, update the events.
            if ( ! this.hasRedo() ) {
                callFuns( this.redoChange, false );
            }

            callFuns( this.redoFuns, temp );

            return temp;
        } else {
            return null;
        }
    }

    /**
     * Moves the stack all the way,
     * to the absolute end.
     *
     * This is like calling forward enough times,
     * to move it all the way there.
     */
    UndoStack.prototype.undoEnd = function() {
        if ( this.hasRedo() ) {
            if ( ! this.hasUndo() ) {
                callFuns( this.undoChange, true );
            }

            this.index = this.stack.length;

            callFuns( this.redoChange, false );
        }
    }

    return UndoStack;
})();
