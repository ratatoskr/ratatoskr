import DeferredPromise from "../../util/deferred-promise";
import "../__helpers/base-test";

test("actor reminder", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));
    let server = require("../../ratatoskr")({ clusterName });

    server.actor("reminderTestActor", () => {
        return class {
            private reminderTriggered: boolean = false;

            public onActivate(context: any) {
                context.registerReminder("testReminder", 1);
            }

            public onReminder(reminderName: string, context: any) {
                if (reminderName === "testReminder") {
                    this.reminderTriggered = true;
                }
            }

            public onMessage(question: string) {
                if (question === "didReminderTrigger") {
                    return this.reminderTriggered;
                }
            }
        };
    });

    return server.start().then(() => {
        return server.send("reminderTestActor", "didReminderTrigger").then((result: boolean) => {
            return expect(result).toBe(false);
        }).then(() => {
            const deferred = new DeferredPromise();
            setTimeout(() => deferred.resolve(), 2000);
            return deferred.promise;
        }).then(() => {
            return server.send("reminderTestActor", "didReminderTrigger");
        }).then((result: boolean) => {
            return expect(result).toBe(true);
        });
    });
});
