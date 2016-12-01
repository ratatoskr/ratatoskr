import "../__helpers/base-test";

test("onactivate trigger", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));
    let server = require("../../ratatoskr")({ clusterName });

    server.actor("onActivateTestActor", () => {
        return class {
            private didActivate: boolean;

            constructor() {
                this.didActivate = false;
            }

            public onActivate() {
                this.didActivate = true;
            }

            public onMessage(question: string) {
                if (question === "didActivate") {
                    return this.didActivate;
                }
            }
        };
    });

    return server.start().then(() => {
        return server.send("onActivateTestActor", "didActivate").then((result: boolean) => {
            return expect(result).toBe(true);
        });
    }
    );
});
