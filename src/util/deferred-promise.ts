class DeferredPromise<T> {
    public promise: Promise<T>;
    public resolve: (val?: T) => void;
    public reject: (reason?: any) => void;

    constructor() {
        const self = this;
        this.promise = new Promise<T>((resolve, reject) => {
            self.resolve = resolve;
            self.reject = reject;
        });
    }
}

export default DeferredPromise;
export { DeferredPromise };