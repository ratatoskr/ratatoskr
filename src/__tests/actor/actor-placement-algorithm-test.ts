import "../__helpers/base-test";

import { ActorPlacement } from "../../actor/actor-placement";
import { ClusterInfo, NodeInfo, NodeStatus } from "../../net/cluster-state";

function shallowCopy(item: any) {
    const output: any = {};
    for (let i in item) {
        output[i] = item[i];
    }
    return output;
}

test("placement node status", () => {
    const NUM_PASSES = 100;
    const clusterInfo = new ClusterInfo("placement-test", new NodeInfo("placement-test"));
    const actorPlacement = new ActorPlacement(clusterInfo);

    let newNode: NodeInfo = null;

    // Idle node
    newNode = shallowCopy(clusterInfo.localNode);
    newNode.nodeId = "idleNode";
    newNode.nodeStatus = NodeStatus.IDLE;
    clusterInfo.cluster[newNode.nodeId] = newNode;

    // Starting node
    newNode = shallowCopy(clusterInfo.localNode);
    newNode.nodeId = "startingNode";
    newNode.nodeStatus = NodeStatus.STARTING;
    clusterInfo.cluster[newNode.nodeId] = newNode;

    // Running node
    newNode = shallowCopy(clusterInfo.localNode);

    newNode.nodeId = "runningNode";
    newNode.nodeStatus = NodeStatus.RUNNING;
    clusterInfo.cluster[newNode.nodeId] = newNode;

    // Stopping node
    newNode = shallowCopy(clusterInfo.localNode);
    newNode.nodeId = "stoppingNode";
    newNode.nodeStatus = NodeStatus.STOPPING;
    clusterInfo.cluster[newNode.nodeId] = newNode;

    // We try many times and make sure we only ever get the one valid node
    for (let i = 0; i < NUM_PASSES; ++i) {
        const selectedNode = actorPlacement.placeActor("someType", "someId");
        expect(selectedNode).toBe("runningNode");
    }
});

test("placement no node", () => {
    const clusterInfo = new ClusterInfo("placement-test", new NodeInfo("placement-test"));
    const actorPlacement = new ActorPlacement(clusterInfo);

    expect(() => {
        // Try and place even though we know it can't be handled
        actorPlacement.placeActor("someType", "someId");
    }).toThrow();
});
