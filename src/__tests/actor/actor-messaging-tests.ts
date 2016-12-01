import "../__helpers/base-test";

test("singleton actor basic", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../../ratatoskr")({ clusterName });

    server.actor("user", () => {
        return class {
            public onMessage(username: string, context: any) {
                return "Hello, " + username;
            }
        };
    });

    return server.start().then(() => {
        return server.send("user", "Joe").then((result: string) => {
            return expect(result).toBe("Hello, Joe");
        });
    }
    );
});

test("id actor basic", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../../ratatoskr")({ clusterName });

    server.actor("user", () => {
        return class {
            public onMessage(username: string, context: any) {
                return "Hello, " + username + " your id is" + context.actorId;
            }
        };
    });

    return server.start().then(() => {
        return server.send("user", 123, "Joe").then((result: string) => {
            return expect(result).toBe("Hello, Joe your id is" + 123);
        });
    }
    );
});

test("singleton actor to actor messages", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../../ratatoskr")({ clusterName });

    server.actor("uppercaseActor", () => {
        return class {
            public onMessage(message: string) {
                return message.toUpperCase();
            }
        };
    });

    server.actor("helloUppercaseActor", () => {
        return class {
            public onMessage(username: string, context: any) {
                return context.api.send("uppercaseActor", username).then((result: string) => {
                    return "Hello, " + result;
                });
            }
        };
    });

    return server.start().then(() => {
        return server.send("helloUppercaseActor", "Joe").then((result: string) => {
            return expect(result).toBe("Hello, JOE");
        });
    }
    );
});
