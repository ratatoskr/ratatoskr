import * as Winston from "winston";

Winston.cli();

const logger: Winston.LoggerInstance = new (Winston.Logger)({
    transports:
    [
        new (Winston.transports.Console)({ level: "info" })
    ]
});

export default logger;
export {logger as Logger};