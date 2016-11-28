const ratatoskr = require("./ratatoskr")();

function startServer() {
    ratatoskr.start();
}

function handleShutdown() {
    ratatoskr.stop().then(() => process.exit(0));
}

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

startServer();