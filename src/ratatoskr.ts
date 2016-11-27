import Server from "./server";
import API from "./api/ratatoskr-api";

const Ratatoskr = function (opts: any) {
    const server = new Server(opts);
    return server.getAPI();
};

module.exports = Ratatoskr;