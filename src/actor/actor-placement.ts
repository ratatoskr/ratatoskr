import { injectable, inject } from "inversify";
import { Types } from "../types";
import Logger from "../util/logger";
import { ClusterInfo, NodeStatus, NodeInfo, NodeId } from "../net/cluster-state";
import { ActorId, ActorType } from "./actor-types";


@injectable()
class ActorPlacement {
    private clusterInfo: ClusterInfo;

    constructor(
        @inject(Types.Cluster.ClusterInfo) clusterInfo: ClusterInfo
    ) {
        this.clusterInfo = clusterInfo;
    }

    public placeActor(actorType: ActorType, actorId: ActorId) {
        const cluster = this.clusterInfo.cluster;
        const candidateNodes: NodeId[] = [];

        for (const nodeId in cluster) {
            const node = cluster[nodeId];
            if (node.nodeStatus === NodeStatus.RUNNING) {
                candidateNodes.push(nodeId);
            }
        }

        Logger.debug("Found %d nodes capable of hosting '%s'", candidateNodes.length, actorType);

        if (candidateNodes.length === 0) {
            throw "Could not find node capable of hosting '" + actorType + "'";
        }

        const targetNode = candidateNodes[Math.floor(Math.random() * candidateNodes.length)];

        return targetNode;
    }
}

export default ActorPlacement;
export {ActorPlacement};