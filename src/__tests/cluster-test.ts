import "./helpers/base-test";

import { Container } from "inversify";
import { Types } from "../types";
import { RatatoskrAPI } from "../api/ratatoskr-api";

test('multi member cluster', () => {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));
    const ratatoskr = require("../ratatoskr");
    let server1: RatatoskrAPI = ratatoskr({ clusterName: clusterName });
    let server2: RatatoskrAPI = ratatoskr({ clusterName: clusterName });
    return server1.start().then(() => {
        return server2.start();
    }).then(() => {
        return expect(server2.clusterInfo().nodeCount()).toBe(2);
    });
});