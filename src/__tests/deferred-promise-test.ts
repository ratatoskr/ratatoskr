import "./helpers/base-test";

import DeferredPromise from "../util/deferred-promise";

test("can resolve void", (done) => {
    const deferred = new DeferredPromise();
    deferred.promise.then(() => {
        done();
    });
    deferred.resolve();
});

test("can resolve value", (done) => {
    const RESOLVE_VAL = "test123";

    const deferred = new DeferredPromise<string>();
    deferred.promise.then((result) => {
        expect(result).toBe(RESOLVE_VAL);
        done();
    });
    deferred.resolve(RESOLVE_VAL);
});

test("can reject void", (done) => {
    const deferred = new DeferredPromise();
    deferred.promise.catch(() => {
        done();
    });
    deferred.reject();
});

test("can reject value", (done) => {
    const REJECT_VAL = "test123";

    const deferred = new DeferredPromise<string>();
    deferred.promise.catch((result) => {
        expect(result).toBe(REJECT_VAL);
        done();
    });
    deferred.reject(REJECT_VAL);
});
