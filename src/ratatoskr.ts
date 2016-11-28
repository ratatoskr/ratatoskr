import API from "./api/ratatoskr-api";
import Server from "./server";

const Ratatoskr = (opts: any) => {
    const server = new Server(opts);
    return server.getAPI();
};

module.exports = Ratatoskr;
