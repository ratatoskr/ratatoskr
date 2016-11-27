const server = require("..")();

server.actor("helloActor", () => {
    return class {
        onMessage(username) {
            return "Hello, " + username;
        }
    }
});

server.start().then(() => {
    return server.send("helloActor", "Joe").then((result) => {
        console.log(result);
    });
});