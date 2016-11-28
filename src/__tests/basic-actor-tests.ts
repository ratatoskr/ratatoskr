import "./helpers/base-test";

test("id actor basic", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName });

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

test("actor basic response", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName });

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

test("actor basic promise", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName });

    server.actor("user", () => {
        return class {
            public onMessage(username: string, context: any) {
                return new Promise<string>((resolve, reject) => {
                    resolve("Hello, " + username);
                });
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

test("actor basic exception", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName });

    server.actor("user", () => {
        return class {
            public onMessage(username: string, context: any) {
                throw `Could not find user ${username}`;
            }
        };
    });

    return server.start().then(() => {
        return server.send("user", "Joe").catch((result: string) => {
            return expect(result).toBe("Could not find user Joe");
        });
    }
    );
});

test("actor promise exception", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName });

    server.actor("user", () => {
        return class {
            public onMessage(username: string, context: any) {
                return new Promise<string>((resolve, reject) => {
                    reject(`Could not find user ${username}`);
                });
            }
        };
    });

    return server.start().then(() => {
        return server.send("user", "Joe").catch((result: string) => {
            return expect(result).toBe("Could not find user Joe");
        });
    }
    );
});

test("singleton actor to actor messages", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../ratatoskr")({ clusterName });

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

test("onactivate trigger", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));
    let server = require("../ratatoskr")({ clusterName });

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
