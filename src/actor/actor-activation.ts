import * as async from "async";
import { Time } from "../util/time";
import { DeferredPromise } from "../util/deferred-promise";
import { RatatoskrAPI } from "../api/ratatoskr-api";
import { ActorType, ActorId } from "./actor-types";

export type ActivationMessageResult = Promise<{ rejected: boolean, promise?: Promise<any> }>;

type CallContext = {
    api: RatatoskrAPI,
    actorId: ActorId,
    actorType: ActorType
}

type ActivationTask = {
    contents?: any,
    deferred: DeferredPromise<any>,
    methodToCall: string;
};

class ActorActivation {
    private actorType: ActorType;
    private actorId: ActorId;
    private actorInstance: any;
    private api: RatatoskrAPI;
    private queue: AsyncQueue<any>;
    private expireTime: number;
    private acceptingWork: boolean;

    constructor(actorType: ActorType, actorId: ActorId, actorCtr: () => void, api: RatatoskrAPI) {
        this.actorType = actorType;
        this.actorId = actorId;
        this.api = api;
        this.actorInstance = actorCtr();
        this.queue = async.queue(this.jobTask.bind(this), 1);
        this.expireTime = Time.currentTime();

        this.queue.pause();
        this.acceptingWork = true;
    }

    public async activate() {
        const task: ActivationTask = {
            contents: null,
            deferred: new DeferredPromise(),
            methodToCall: "onActivate"
        };

        this.queue.push(task);
        this.queue.resume();
        return task.deferred.promise;
    }

    public async onMessage(contents: any, expireInSecs: number): ActivationMessageResult {
        if (this.acceptingWork) {
            this.expireTime = Time.currentTime() + expireInSecs;

            const task: ActivationTask = {
                contents: contents,
                deferred: new DeferredPromise(),
                methodToCall: "onMessage"
            };

            this.queue.push(task);

            return { rejected: false, promise: task.deferred.promise };
        }

        return { rejected: true };
    }

    public async deactivate() {
        this.acceptingWork = false;

        const task: ActivationTask = {
            contents: null,
            deferred: new DeferredPromise(),
            methodToCall: "onDeactivate"
        };

        this.queue.push(task);
        const result = await task.deferred.promise;
        this.queue.pause();
        return result;
    }

    private generateContext() : CallContext
    {
        return {
            actorType: this.actorType,
            actorId: this.actorId,
            api: this.api
        };
    }

    private jobTask(task: ActivationTask, callback: any) {
        try {
            let result: any = undefined;

            let methodToCall = this.actorInstance[task.methodToCall];
            if (methodToCall && typeof methodToCall == "function") {
                methodToCall = methodToCall.bind(this.actorInstance);

                if (methodToCall.length > 1) {
                    result = methodToCall(task.contents, this.generateContext());
                } else if (methodToCall.length == 1) {
                    if (task.contents) {
                        result = methodToCall(task.contents);
                    } else {
                        result = methodToCall(this.generateContext());
                    }
                } else {
                    result = methodToCall();
                }
            }

            if (result == undefined) {
                task.deferred.resolve();
                callback();
            }
            else if (typeof result["then"] == "function") {
                result.then((output: any) => {
                    task.deferred.resolve(output);
                    callback();
                }, (output: any) => {
                    task.deferred.reject(output);
                    callback();
                })
            }
            else {
                task.deferred.resolve(result);
                callback();
            }
        }
        catch (e) {
            task.deferred.reject(e);
            callback();
        }
    }
}

export default ActorActivation;
export { ActorActivation };