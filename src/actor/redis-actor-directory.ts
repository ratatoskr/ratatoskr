import { injectable, inject } from "inversify";
import { Types } from "../types";
import { KeyGenerator } from "../util/key-generator";
import { Logger } from "../util/logger";
import { NodeId, ClusterInfo } from "../net/cluster-state";
import { Redis } from "../net/redis";
import { ActorId, ActorType } from "./actor-types";
import { ActorDirectory } from "./actor-directory";

@injectable()
class RedisActorDirectory implements ActorDirectory {
    private redis: Redis;
    private clusterInfo: ClusterInfo;

    constructor(
        @inject(Types.Redis) redis: Redis,
        @inject(Types.Cluster.ClusterInfo) clusterInfo: ClusterInfo
    ) {
        this.redis = redis;
        this.clusterInfo = clusterInfo;
    }

    async getActorLocation(actorType: ActorType, actorId: ActorId): Promise<NodeId> {
        const actorLocation = await new Promise<NodeId>((resolve, reject) => {
            const actorKey = KeyGenerator.actorPlacementKey(this.clusterInfo.clusterName, actorType, actorId);
            this.redis.shared().get(actorKey, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        return actorLocation;
    }

    async putOrGetActorLocation(actorType: ActorType, actorId: ActorId, nodeId: NodeId, expireSecs: number): Promise<NodeId> {
        let currentLocation = await this.getActorLocation(actorType, actorId);

        // Did we find anything?
        if (currentLocation == null) {
            const setResult = await new Promise((resolve, reject) => {
                const actorKey = KeyGenerator.actorPlacementKey(this.clusterInfo.clusterName, actorType, actorId);
                this.redis.shared().set(actorKey, nodeId, "EX", expireSecs, "NX", (err: any, res: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            if (setResult == 0) { // Someone else beat us
                currentLocation = await this.getActorLocation(actorType, actorId);
            } else { // We won
                currentLocation = nodeId;
            }
        }

        return currentLocation;
    }

    async removeActor(actorType: ActorType, actorId: ActorId): Promise<void> {
        await new Promise((resolve, reject) => {
            const actorKey = KeyGenerator.actorPlacementKey(this.clusterInfo.clusterName, actorType, actorId);
            this.redis.shared().del(actorKey, (err: any, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(err);
                }
            });
        });
    }

    async updateActorExpiry(actorType: ActorType, actorId: ActorId, nodeId: NodeId, expireSecs: number): Promise<boolean> {
        const script = '\
            local currentNode = redis.call("GET", KEYS[1]) \
            if(currentNode == ARGV[1]) then \
                redis.call("EXPIRE", KEYS[1], ARGV[2]) \
                return 1 \
            end \
            return 0';

        const result = await new Promise((resolve, reject) => {
            const actorKey = KeyGenerator.actorPlacementKey(this.clusterInfo.clusterName, actorType, actorId);
            this.redis.shared().eval(script, 1, actorKey, nodeId, expireSecs, (err: any, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        return result == 1;
    }
}

export default RedisActorDirectory;
export {RedisActorDirectory};