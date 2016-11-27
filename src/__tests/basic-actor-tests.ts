import "./helpers/base-test";

test('id actor basic message', () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName: clusterName });

    server.actor("user", () => {
        return class {
            onMessage(username: string, context: any) {
                return "Hello, " + username + " your id is" + context.actorId;
            }
        }
    });

    return server.start().then(() => {
        return server.send("user", 123, "Joe").then((result: string) => {
            return expect(result).toBe("Hello, Joe your id is" + 123);
        });
    }
    );
});

test('actor basic message', () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName: clusterName });

    server.actor("user", () => {
        return class {
            onMessage(username: string, context: any) {
                return "Hello, " + username;
            }
        }
    });

    return server.start().then(() => {
        return server.send("user", "Joe").then((result: string) => {
            return expect(result).toBe("Hello, Joe");
        });
    }
    );
});

test('singleton actor to actor messages', () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName: clusterName });

    server.actor("uppercaseActor", () => {
        return class {
            onMessage(message: string) {
                return message.toUpperCase();
            }
        }
    })

    server.actor("helloUppercaseActor", () => {
        return class {
            onMessage(username: string, context: any) {
                return context.api.send("uppercaseActor", username).then((result: string) => {
                    return "Hello, " + result;
                });
            }
        }
    });

    return server.start().then(() => {
        return server.send("helloUppercaseActor", "Joe").then((result: string) => {
            return expect(result).toBe("Hello, JOE");
        });
    }
    );
});

test('onactivate test', () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName: clusterName });

    server.actor("onActivateTestActor", () => {
        return class {
            private didActivate: boolean;

            constructor() {
                this.didActivate = false;
            }

            onActivate() {
                this.didActivate = true;
            }

            onMessage(question: string) {
                if (question == "didActivate") {
                    return this.didActivate;
                    
                }
            }
        }
    });

    return server.start().then(() => {
        return server.send("onActivateTestActor", "didActivate").then((result: boolean) => {
            return expect(result).toBe(true);
        });
    }
    );
});