import { inject, injectable } from "inversify";
import { Types } from "../types";
import { ActorFactory } from "./actor-factory";
import { ActorMessaging } from "./actor-messaging";
import { ActorId, ActorRequestType, ActorType } from "./actor-types";

const REMINDER_ACTOR_TYPE = "__reminderActor";
const REMINDER_ACTOR_ID = "global";

export enum ReminderMessageType {
    REGISTER,
    UNREGISTER,
    PING
}

export type ReminderMessage = {
    messageType: ReminderMessageType,
    actorType?: ActorType,
    actorId?: ActorId,
    reminderName?: string,
    delaySecs?: number
};

@injectable()
class ActorReminders {
    private actorFactory: ActorFactory;
    private actorMessaging: ActorMessaging;
    private config: any;

    constructor(
        @inject(Types.Actor.ActorFactory) actorFactory: ActorFactory,
        @inject(Types.Actor.ActorMessaging) actorMessaging: ActorMessaging,
        @inject(Types.FullConfig) config: any
    ) {
        this.actorFactory = actorFactory;
        this.actorMessaging = actorMessaging;
        this.config = config;
    }

    public initReminderActor() {
        const reminderActor = require("../" + this.config.systems.reminderActor);
        this.actorFactory.push(REMINDER_ACTOR_TYPE, () => {
            return reminderActor.default;
        });
    }

    public async registerReminder(
        actorType: ActorType, actorId: ActorId, reminderName: string, delaySecs: number
    ): Promise<void> {
        const message: ReminderMessage = {
            messageType: ReminderMessageType.REGISTER,
            actorType,
            actorId,
            reminderName,
            delaySecs
        };

        return this.actorMessaging.sendActorRequest(REMINDER_ACTOR_TYPE, REMINDER_ACTOR_ID, message);
    }

    public async unregisterReminder(actorType: ActorType, actorId: ActorId, reminderName: string): Promise<void> {
        const message: ReminderMessage = {
            messageType: ReminderMessageType.UNREGISTER,
            actorType,
            actorId,
            reminderName
        };

        return this.actorMessaging.sendActorRequest(REMINDER_ACTOR_TYPE, REMINDER_ACTOR_ID, message);
    }

    public async pingReminders(): Promise<void> {
        const message: ReminderMessage = {
            messageType: ReminderMessageType.PING
        };

        return this.actorMessaging.sendActorRequest(REMINDER_ACTOR_TYPE, REMINDER_ACTOR_ID, message);
    }

    public async triggerReminder(actorType: ActorType, actorId: ActorId, reminderName: string): Promise<void> {

        return this.actorMessaging.sendActorRequest(actorType, actorId, reminderName, false, ActorRequestType.REMINDER);
    }
}

export default ActorReminders;
export { ActorReminders };
