export default abstract class FunctionUtil {

    /** [callback, wrapped timeout] tuples */
    private static readonly delayedCallbacks:[VoidFunction, NodeJS.Timeout][] = [];

    public static setDelayedCallback(callback:VoidFunction, delay:number):void {

        // remove old timeout
        const oldCallbackIndex = this.delayedCallbacks.findIndex(dc => dc[0] === callback);
        if (oldCallbackIndex !== -1) {
            clearTimeout(this.delayedCallbacks[oldCallbackIndex][1]);
            this.delayedCallbacks.splice(oldCallbackIndex, 1);
        }

        // set new timeout
        const timeout = setTimeout(() => {
            callback();
            
            // ran callback, remove entry from array
            const ind = this.delayedCallbacks.findIndex(dc => dc[0] === callback);
            this.delayedCallbacks.splice(ind, 1);
        }, delay);
        this.delayedCallbacks.push([callback, timeout]); // add to array
    }

}