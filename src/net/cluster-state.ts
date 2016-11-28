import { injectable, inject } from "inversify";
import Types from "../types";
import UUID from "../util/uuid";

export type NodeId = string;

export type NodeCollection = { [key: string]: NodeInfo };

export enum NodeStatus {
    IDLE,
    STARTING,
    RUNNING,
    STOPPING
}

@injectable()
export class NodeInfo {
    public nodeName: string;
    public nodeId: NodeId;
    public nodeStatus: NodeStatus;

    constructor(
        @inject(Types.Config("nodeName")) nodeName: string,
    ) {
        this.nodeName = nodeName !== undefined ? nodeName : null;
        this.nodeId = UUID.generate();
        this.nodeStatus = NodeStatus.IDLE;
    }
}

@injectable()
export class ClusterInfo {
    public clusterName: string;
    public cluster: NodeCollection;
    public localNode: NodeInfo;

    constructor(
        @inject(Types.Config("clusterName")) clusterName: string,
        @inject(Types.Cluster.LocalNode) localNode: NodeInfo
    ) {

        // Set properties
        this.cluster = {};
        this.clusterName = clusterName;

        // Setup local node
        this.localNode = localNode;
    }

    public nodeCount(): number {
        let nodeCount = 0;
        for (const node in this.cluster) {
            ++nodeCount;
        }
        return nodeCount;
    }

}