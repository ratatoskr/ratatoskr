import "../__helpers/base-test";

test("actor basic response", () => {
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

test("actor basic promise", () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));

    let server = require("../../ratatoskr")({ clusterName });

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

    let server = require("../../ratatoskr")({ clusterName });

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

    let server = require("../../ratatoskr")({ clusterName });

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
