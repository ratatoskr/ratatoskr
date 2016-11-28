import { injectable, inject } from "inversify";
import { Types } from "../types";
import { Logger } from "../util/logger";
import { PubSub, MessageHandler } from "./pub-sub";
import { Redis, RedisClient } from "./redis";
import { ClusterInfo, NodeInfo } from "./cluster-state";


@injectable()
class RedisPubSub implements PubSub {
    private redis: Redis;
    private clusterInfo: ClusterInfo;
    private subClient: RedisClient;
    private pubClient: RedisClient;
    private handlers: { [key: string]: MessageHandler[] };
    private subscriptions: string[];

    constructor(
        @inject(Types.Redis) redis: Redis,
        @inject(Types.Cluster.ClusterInfo) clusterInfo: ClusterInfo,
    ) {
        this.redis = redis;
        this.clusterInfo = clusterInfo;
    }

    public async connect(): Promise<void> {
        this.subClient = this.redis.dedicated();
        this.subClient.on("message", this.onMessage.bind(this));
        this.pubClient = this.redis.shared();
        this.handlers = {};
        this.subscriptions = [];

    }

    public async subscribe(channelName: string, callback?: MessageHandler): Promise<void> {
        if (callback) {
            this.addHandler(channelName, callback);
        }

        if (this.subscriptions.indexOf(channelName) === -1) {
            this.subscriptions.push(channelName);
            return new Promise<void>((resolve, reject) => {
                this.subClient.subscribe(channelName, (err: any, res: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
        }
    }

    public addHandler(channelName: string, callback: MessageHandler): void {
        if (!this.handlers[channelName]) {
            this.handlers[channelName] = [];
        }

        this.handlers[channelName].push(callback);
    }

    public async publish(channelName: string, payload: string): Promise<number> {
        Logger.silly(`Publishing message on channel '${channelName}': ${payload}`);
        return new Promise<number>((resolve, reject) => {
            this.pubClient.publish(channelName, payload, (err: any, count: number) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(count);
                }
            });
        });
    }

    public async unsubscribe(channelName: string): Promise<void> {
        const index = this.subscriptions.indexOf(channelName);
        if (index !== -1) {
             this.subscriptions.splice(index, 1);
             return new Promise<void>((resolve, reject) => {
                this.subClient.unsubscribe(channelName, (err: any, res: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
             });
        }
    }

    private onMessage(channelName: string, payload: string) {
        Logger.silly(`Received message on channel '${channelName}': ${payload}`);
        const channelHandlers = this.handlers[channelName];
        if (channelHandlers) {
            for (const handler of channelHandlers) {
                handler(channelName, payload);
            }
        }
    }
}

export default RedisPubSub;
export { RedisPubSub };