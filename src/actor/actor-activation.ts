import * as async from "async";
import { RatatoskrAPI } from "../api/ratatoskr-api";
import { DeferredPromise } from "../util/deferred-promise";
import { Time } from "../util/time";
import { ActorContext } from "./actor-context";
import { ActorId, ActorType } from "./actor-types";

export type ActivationMessageResult = Promise<{ rejected: boolean, promise?: Promise<any> }>;

type ActivationJob = {
    contents?: any,
    methodTarget?: (...args: any[]) => void
    deferred: DeferredPromise<any>,
    jobType: JobType
};

enum JobType {
    MESSAGE,
    ACTIVATED,
    DEACTIVATED,
    TIMER
};

class ActorActivation {
    private internalActorType: ActorType;
    private internalActorId: ActorId;
    private internalExpireTime: number;
    private actorInstance: any;
    private queue: AsyncQueue<any>;
    private actorContext: ActorContext;
    private timers: {[key: string]: NodeJS.Timer};

    private acceptingWork: boolean;

    constructor(actorType: ActorType, actorId: ActorId, actorCtr: () => void, api: RatatoskrAPI) {
        this.internalActorType = actorType;
        this.internalActorId = actorId;
        this.actorInstance = actorCtr();
        this.queue = async.queue(this.jobTask.bind(this), 1);
        this.internalExpireTime = Time.currentTime() + 5;
        this.actorContext = new ActorContext(actorType, actorId, api, this);

        this.queue.pause();
        this.acceptingWork = true;
        this.timers = {};
    }

    public async onActivate() {
        const task: ActivationJob = {
            deferred: new DeferredPromise(),
            jobType: JobType.ACTIVATED
        };

        this.queue.push(task);
        this.queue.resume();
        return task.deferred.promise;
    }

    public async onMessage(contents: any): ActivationMessageResult {
        if (this.acceptingWork) {
            const task: ActivationJob = {
                contents,
                deferred: new DeferredPromise(),
                jobType: JobType.MESSAGE
            };

            this.queue.push(task);

            return { rejected: false, promise: task.deferred.promise };
        }

        return { rejected: true };
    }

    public async onDeactivate() {
        this.acceptingWork = false;

        this.stopAllTimers();

        const task: ActivationJob = {
            deferred: new DeferredPromise(),
            jobType: JobType.DEACTIVATED
        };

        this.queue.push(task);
        const result = await task.deferred.promise;
        this.queue.pause();
        return result;
    }

    public registerTimer(name: string, intervalMs: number, recurring: boolean, callback: (...args: any[]) => void) {

        const jobCallback = (job: ActivationJob) => {
            this.queue.push(job);
        };

        const realJob: ActivationJob = {
            jobType: JobType.TIMER,
            methodTarget: callback,
            deferred: new DeferredPromise()
        };

        let timerHandle: NodeJS.Timer;

        if (this.timers[name]) {
            throw `Timer '${name}' already exists`;
        }

        if (recurring) {
            timerHandle = setInterval(jobCallback, intervalMs, realJob);
        } else {
            timerHandle = setTimeout(jobCallback, intervalMs, realJob);
        }

        this.timers[name] = timerHandle;
    }

    public removeTimer(name: string) {
        if (this.timers[name]) {
            clearInterval(this.timers[name]);
            delete this.timers[name];
        }
    }

    private stopAllTimers() {
        for (const timer in this.timers) {
            clearInterval(this.timers[timer]);
            delete this.timers[timer];
        }
    }

    private jobTask(task: ActivationJob, callback: any) {
        try {
            let result: any = undefined;

            switch (task.jobType) {
                case JobType.MESSAGE:
                    if (this.actorInstance.onMessage) {
                        result = this.actorInstance.onMessage(task.contents, this.actorContext);
                    }
                    break;

                case JobType.ACTIVATED:
                    if (this.actorInstance.onActivate) {
                        result = this.actorInstance.onActivate(this.actorContext);
                    }
                    break;

                case JobType.DEACTIVATED:
                    if (this.actorInstance.onDeactivate) {
                        result = this.actorInstance.onDeactivate(this.actorContext);
                    }
                    break;

                case JobType.TIMER:
                    if (task.methodTarget) {
                        task.methodTarget();
                    }
                    break;

                default:
                    break;
            }

            if (result === undefined) {
                task.deferred.resolve();
                callback();
                // tslint:disable-next-line
            } else if (typeof result["then"] === "function") {
                result.then((output: any) => {
                    task.deferred.resolve(output);
                    callback();
                }, (output: any) => {
                    task.deferred.reject(output);
                    callback();
                });
            } else {
                task.deferred.resolve(result);
                callback();
            }
        } catch (e) {
            task.deferred.reject(e);
            callback();
        }
    }

    public get actorType(): ActorType {
        return this.internalActorType;
    }

    public get actorId(): ActorId {
        return this.internalActorId;
    }

    public get expireTime(): number {
        return this.internalExpireTime;
    }

    public set expireTime(val: number) {
        this.internalExpireTime = val;
    }
}

export default ActorActivation;
export { ActorActivation };
