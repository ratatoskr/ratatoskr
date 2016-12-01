import DeferredPromise from "../../util/deferred-promise";
import "../__helpers/base-test";

test("actor timer", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));
    let server = require("../../ratatoskr")({ clusterName });

    server.actor("timerTestActor", () => {
        return class {
            private timerTriggered: boolean = false;

            public onActivate(context: any) {
                context.registerTimer("testTimer", 100, false, () => {
                    this.timerTriggered = true;
                });
            }

            public onMessage(question: string) {
                if (question === "didTimerTrigger") {
                    return this.timerTriggered;
                }
            }
        };
    });

    return server.start().then(() => {
        return server.send("timerTestActor", "didTimerTrigger").then((result: boolean) => {
            return expect(result).toBe(false);
        }).then(() => {
            const deferred = new DeferredPromise();
            setTimeout(() => deferred.resolve(), 1000);
            return deferred.promise;
        }).then(() => {
            return server.send("timerTestActor", "didTimerTrigger");
        }).then((result: boolean) => {
            return expect(result).toBe(true);
        });
    });
});
