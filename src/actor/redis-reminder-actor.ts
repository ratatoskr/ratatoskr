import { Redis } from "../net/redis";
import { Types } from "../types";
import { KeyGenerator } from "../util/key-generator";
import { Logger } from "../util/logger";
import { Time } from "../util/time";
import { ActorContext } from "./actor-context";
import { ActorReminders, ReminderMessage, ReminderMessageType } from "./actor-reminders";

class RedisReminderActor {
    private redis: Redis;
    private reminderstoConsider: { [key: string]: { data: any, triggerTime: number } };
    private actorReminders: ActorReminders;
    private reminderListKey: string;

    public onActivate(context: ActorContext) {
        this.redis = context.api.getContainer().get<Redis>(Types.Redis);
        this.actorReminders = context.api.getContainer().get<ActorReminders>(Types.Actor.ActorReminders);
        this.reminderListKey = KeyGenerator.key("reminderList", { clusterName: context.api.clusterInfo().clusterName });
        this.reminderstoConsider = {};

        context.registerTimer(
            "pumpReminders", context.api.config().reminderPumpSecs * 1000, true, this.pumpReminders.bind(this)
            );
    }

    public onMessage(message: ReminderMessage, context: ActorContext) {
        switch (message.messageType) {
            case ReminderMessageType.REGISTER:
                return this.onRegister(message, context);
            case ReminderMessageType.PING:
                return this.onPing(context);
            case ReminderMessageType.UNREGISTER:
                return this.onUnregister(message, context);
            default:
                break;
        }
    }

    private async pumpReminders() {
        const currentTime = Time.currentTime();
        for (const reminderKey in this.reminderstoConsider) {
            const reminder = this.reminderstoConsider[reminderKey];
            if (reminder.triggerTime <= currentTime) {
                try {
                    await this.actorReminders.triggerReminder(
                        reminder.data.actorType, reminder.data.actorId, reminder.data.reminderName
                    );

                    await new Promise<void>((resolve, reject) => {
                        this.redis.shared().zrem(this.reminderListKey, reminderKey, (err: any, res: any) => {
                            if (err) {
                                reject(err);
                            } else {
                                delete this.reminderstoConsider[reminderKey];
                                resolve(res);
                            }
                        });
                    });
                } catch (e) {
                    Logger.warn("Failed to process reminder: ", e);
                }
            }
        }
    }

    private async onRegister(message: ReminderMessage, context: ActorContext) {
        const score = Time.currentTime() + message.delaySecs;
        const data = JSON.stringify(
            { actorType: message.actorType, actorId: message.actorId, reminderName: message.reminderName }
        );
        await new Promise<void>((resolve, reject) => {
            this.redis.shared().zadd(this.reminderListKey, score, data, (err: any, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
        return this.onPing(context);
    }

    private async onPing(context: ActorContext) {
        const timeWindow = Time.currentTime() + context.api.config().serverPulseSecs;

        let result = await new Promise<string[]>((resolve, reject) => {
            this.redis.shared().zrangebyscore(
                this.reminderListKey, "-inf", timeWindow, "WITHSCORES", (err: any, res: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
        });

        const reminders = context.api.getContainer().get<ActorReminders>(Types.Actor.ActorReminders);
        const results: Array<{ promise: Promise<void>, data: string }> = [];
        if (result && result.length > 0) {
            for (let i = 0; i < result.length / 2; i += 2) {
                const newReminder = {
                    data: JSON.parse(result[i]),
                    triggerTime: Number.parseInt(result[i + 1])
                };
                this.reminderstoConsider[result[i]] = newReminder;
            }
        }
    }

    private async onUnregister(message: ReminderMessage, context: ActorContext) {
        const data = JSON.stringify(
            { actorType: message.actorType, actorId: message.actorId, reminderName: message.reminderName }
        );
        return new Promise<void>((resolve, reject) => {
            this.redis.shared().zrem(this.reminderListKey, data, (err: any, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }
}

export default RedisReminderActor;
export { RedisReminderActor };
