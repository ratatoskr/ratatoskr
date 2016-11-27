import { injectable, inject } from "inversify";
import { Types } from "../types";
import { KeyGenerator } from "../util/key-generator";
import { Logger } from "../util/logger";
import { ClusterDirectory } from "./cluster-directory";
import { NodeInfo, NodeCollection, ClusterInfo } from "./cluster-state";
import { Redis } from "./redis";

@injectable()
class RedisClusterDirectory implements ClusterDirectory {

    private clusterInfo: ClusterInfo;
    private redis: Redis;
    private nodeEntrySecs: number;

    constructor(
        @inject(Types.Cluster.ClusterInfo) clusterInfo: ClusterInfo,
        @inject(Types.Redis) redis: Redis,
        @inject(Types.Config("nodeEntrySecs")) nodeEntrySecs: number
    ) {
        this.clusterInfo = clusterInfo;
        this.redis = redis;
        this.nodeEntrySecs = nodeEntrySecs;
    }

    public async updateCluster(): Promise<void> {
        await this.updateNodeEntry();
        await this.syncNodeDirectory();
    }

    public async syncNodeDirectory(): Promise<void> {
        const newCluster: NodeCollection = {};
        // TODO: This may be too expensive
        const lookupKey = KeyGenerator.nodeKey(this.clusterInfo.clusterName, "*");

        let nodeKeys = await new Promise<string[]>((resolve, reject) => {
            this.redis.shared().keys(lookupKey, (err: any, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }

            });
        });

        for (const nodeKey of nodeKeys) {
            const nodeInfoStr = await new Promise<string>((resolve, reject) => {
                this.redis.shared().get(nodeKey, (err: any, res: string) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            if (nodeInfoStr) {
                const nodeInfo: NodeInfo = JSON.parse(nodeInfoStr);
                newCluster[nodeInfo.nodeId] = nodeInfo;
            }
        }

        this.clusterInfo.cluster = newCluster;

        Logger.debug(`Synced Cluster Directory: ${Object.keys(this.clusterInfo.cluster).length} nodes.`);
    }

    public async updateNodeEntry(): Promise<void> {
        const nodeKey = KeyGenerator.nodeKey(this.clusterInfo.clusterName, this.clusterInfo.localNode.nodeId);
        await new Promise((resolve, reject) => {
            this.redis.shared().setex(nodeKey, this.nodeEntrySecs, JSON.stringify(this.clusterInfo.localNode), (err: any, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        Logger.debug(`Updated node info: ${this.clusterInfo.localNode.nodeId}`);
    }
}

export default RedisClusterDirectory;
export { RedisClusterDirectory };