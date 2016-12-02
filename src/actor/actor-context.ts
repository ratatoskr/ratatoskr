import { RatatoskrAPI } from "../api/ratatoskr-api";
import { Types } from "../types";
import { ActorActivation } from "./actor-activation";
import { ActorReminders } from "./actor-reminders";
import { ActorId, ActorType } from "./actor-types";

class ActorContext {
    public actorType: ActorType;
    public actorId: ActorId;
    public api: RatatoskrAPI;
    private activation: ActorActivation;

    constructor(actorType: ActorType, actorId: ActorId, api: RatatoskrAPI, activation: ActorActivation) {
        this.api = api;
        this.actorId = actorId;
        this.actorType = actorType;
        this.activation = activation;
    }

    public registerTimer(name: string, delayMs: number, recurring: boolean, callback: (...args: any[]) => void) {
        this.activation.registerTimer(name, delayMs, recurring, callback);
    }

    public unregisterTimer(name: string) {
        this.activation.unregisterTimer(name);
    }

    public registerReminder(name: string, delaySecs: number) {
        return this.api.getContainer().get<ActorReminders>(Types.Actor.ActorReminders)
            .registerReminder(this.actorType, this.actorId, name, delaySecs);
    }

    public unregisterReminder(name: string) {
        return this.api.getContainer().get<ActorReminders>(Types.Actor.ActorReminders)
            .unregisterReminder(this.actorType, this.actorId, name);
    }
}

export { ActorContext };
