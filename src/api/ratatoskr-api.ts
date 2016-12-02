import { Container } from "inversify";
import { ActorFactory } from "../actor/actor-factory";
import { ActorMessaging } from "../actor/actor-messaging";
import { ActorId, ActorType } from "../actor/actor-types";
import { Config } from "../config/config";
import { ClusterInfo, NodeInfo } from "../net/cluster-state";
import { Server } from "../server";
import { Types } from "../types";

class RatatoskrAPI {
    private server: Server;
    private container: Container;

    constructor(server: Server, container: Container) {
        this.server = server;
        this.container = container;
    }

    public actor(actorType: ActorType, actorObject: any) {
        return this.container.get<ActorFactory>(Types.Actor.ActorFactory).push(actorType, actorObject);
    }

    public start() {
        return this.server.start();
    }

    public stop() {
        return this.server.stop();
    }

    public send(actorType: ActorType, ...args: any[]) {
        let message = {};
        let actorId = "no_id";

        if (args.length === 2) {
            actorId = args[0];
            message = args[1];
        } else if (args.length === 1) {
            message = args[0];
        } else {
            throw "Invalid arguments for send";
        }

        const actorMessaging = this.container.get<ActorMessaging>(Types.Actor.ActorMessaging);
        return actorMessaging.sendActorRequest(actorType, actorId, message);
    }

    public clusterInfo(): ClusterInfo {
        return this.container.get<ClusterInfo>(Types.Cluster.ClusterInfo);
    }

    public config(): any {
        return this.container.get<Config>(Types.FullConfig);
    }

    public getServer(): Server {
        return this.server;
    }

    public getContainer(): Container {
        return this.container;
    }
}

export default RatatoskrAPI;
export { RatatoskrAPI };
