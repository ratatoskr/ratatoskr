// tslint:disable-next-line
const server = require("./ratatoskr")();

function startServer() {
    server.actor("user", () => {
        return class {
            public onMessage(username: string, context: any) {
                context.registerReminder("hello", 30);
                return "Hello, " + username;
            }
        };
    });

    return server.start().then(() => {
        return server.send("user", "Joe").then((result: string) => {
            // return expect(result).toBe("Hello, Joe");
        });
    });
}

function handleShutdown() {
    server.stop().then(() => process.exit(0));
}

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

startServer();
