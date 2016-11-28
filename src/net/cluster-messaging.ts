import { injectable, inject } from "inversify";
import { Types } from "../types";
import { Logger } from "../util/logger";
import { KeyGenerator } from "../util/key-generator";
import { PubSub } from "./pub-sub";
import { ClusterInfo, NodeId } from "./cluster-state";

export type MessageHeaders = { [key: string]: any };

export type ClusterMessageHandler = (contents: any, headers: MessageHeaders) => void;

type ClusterMessage = {
    sender: NodeId,
    subsystem: string,
    contents: any,
    headers: MessageHeaders
};

@injectable()
class ClusterMessaging {
    private clusterInfo: ClusterInfo;
    private pubSub: PubSub;

    private clusterChannelKey: string;
    private nodeChannelKey: string;

    private handlers: { [key: string]: ClusterMessageHandler[] };

    constructor(
        @inject(Types.Cluster.ClusterInfo) clusterInfo: ClusterInfo,
        @inject(Types.PubSub) pubSub: PubSub
    ) {
        this.clusterInfo = clusterInfo;
        this.pubSub = pubSub;
        this.handlers = {};
    }

    public async openChannels() {
        // Broadcast channel for cluster
        this.clusterChannelKey = KeyGenerator.clusterKey(this.clusterInfo.clusterName);
        await this.pubSub.subscribe(this.clusterChannelKey, this.onMessage.bind(this));

        // Channel for this node
        this.nodeChannelKey = KeyGenerator.nodeKey(this.clusterInfo.clusterName, this.clusterInfo.localNode.nodeId);
        await this.pubSub.subscribe(this.nodeChannelKey, this.onMessage.bind(this));
    }

    private onMessage(channelName: string, message: string) {
        const payload: ClusterMessage = JSON.parse(message);

        const handlers = this.handlers[payload.subsystem];
        if (handlers !== undefined) {
            for (const handler of handlers) {
                handler(payload.contents, payload.headers);
            }
        }
    }

    public sendMessage(targetNode: NodeId, subsystem: string, contents: any, headers?: MessageHeaders) {
        const targetChannel: string = KeyGenerator.nodeKey(this.clusterInfo.clusterName, targetNode);
        return this.publishToChannel(targetChannel, subsystem, contents, headers);
    }

    public async broadcastMessage(subsystem: string, contents: any, headers?: MessageHeaders) {
        return this.publishToChannel(this.clusterChannelKey, subsystem, contents, headers);
    }

    public addHandler(subsystem: string, handler: ClusterMessageHandler) {
        if (this.handlers[subsystem] === undefined) {
            this.handlers[subsystem] = [];
        }

        this.handlers[subsystem].push(handler);
    }

    private async publishToChannel(channelName: string, subsystem: string, contents: any, headers: MessageHeaders): Promise<number> {
        const payload: ClusterMessage = {
            sender: this.clusterInfo.localNode.nodeId,
            subsystem: subsystem,
            contents: contents,
            headers: headers
        };

        const rawMessage: string = JSON.stringify(payload);
        return this.pubSub.publish(channelName, rawMessage);
    }
}

export default ClusterMessaging;
export { ClusterMessaging };