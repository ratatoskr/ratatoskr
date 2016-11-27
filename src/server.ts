import "reflect-metadata";

// Common
const Package = require("../package.json");
import Types from "./types";

// IOC
import { Container } from "inversify";

// Utils / Config
import Config from "./config/config";
import Logger from "./util/logger";

// Net
import * as ClusterState from "./net/cluster-state";
import Redis from "./net/redis";
import PubSub from "./net/pub-sub";
import ClusterDirectory from "./net/cluster-directory";
import ClusterMessaging from "./net/cluster-messaging";

// Actor
import ActorDirectory from "./actor/actor-directory";
import ActorPlacement from "./actor/actor-placement";
import ActorFactory from "./actor/actor-factory";
import ActorMessaging from "./actor/actor-messaging";
import ActorExecution from "./actor/actor-execution";

// API
import RatatoskrAPI from "./api/ratatoskr-api";

class Server {
    private container: Container;
    private config: any;
    private api: RatatoskrAPI;
    private timer: number;


    public constructor(opts?: any) {
        this.init(opts);
    }

    public async start() {
        Logger.info("Starting Ratatoskr server...");

        // Cluster info 
        const clusterInfo = this.container.get<ClusterState.ClusterInfo>(Types.Cluster.ClusterInfo);
        clusterInfo.localNode.nodeStatus = ClusterState.NodeStatus.STARTING;

        // Start the pub sub system
        const pubSub = this.container.get<PubSub>(Types.PubSub);
        await pubSub.connect();

        // Start cluster messaging
        const clusterMessaging = this.container.get<ClusterMessaging>(Types.Cluster.ClusterMessaging);
        await clusterMessaging.openChannels();

        // Start cluster directory
        const clusterDirectory = this.container.get<ClusterDirectory>(Types.Cluster.ClusterDirectory);
        await clusterDirectory.updateCluster();

        // Flip our state to running and write to directory
        clusterInfo.localNode.nodeStatus = ClusterState.NodeStatus.RUNNING;
        await clusterDirectory.updateCluster();

        // Setup pulse
        this.timer = setInterval(this.internalPulse.bind(this), this.config.serverPulseSecs * 1000);

        Logger.info("Server started.");
    }

    private async pulse() {
        await this.container.get<ClusterDirectory>(Types.Cluster.ClusterDirectory).updateCluster();
        await this.container.get<ActorMessaging>(Types.Actor.ActorMessaging).updatePendingMessages();
    }

    public async stop() {
        clearInterval(this.timer);
    }

    private internalPulse() {
        this.pulse().catch((error) => {
            Logger.error(`Pulse Error: ${error}`);
        })
    }

    private init(opts: any) {
        // Create the DI container
        this.container = new Container();

        // Create our config object
        this.config = Config.createOptions(opts);

        // Configure logging
        Logger.transports["console"].level = this.config.logLevel;

        // Log out welcome
        Logger.info(`Ratatoskr Server v${Package.version}`);
        Logger.info("Initial Configuration:", this.config);

        // Bind the configs to DI
        this.bindConfigs();

        // Create systems
        this.createSystems();

    }

    private createSystems() {
        this.container.bind<Container>(Types.Container).toConstantValue(this.container);

        // Cluster
        this.container.bind<ClusterState.NodeInfo>(Types.Cluster.LocalNode).to(ClusterState.NodeInfo).inSingletonScope();
        this.container.bind<ClusterState.ClusterInfo>(Types.Cluster.ClusterInfo).to(ClusterState.ClusterInfo).inSingletonScope();
        const clusterDirectory = require(this.config.systems.clusterDirectory);
        this.container.bind<ClusterDirectory>(Types.Cluster.ClusterDirectory).to(clusterDirectory.default).inSingletonScope();
        this.container.bind<ClusterMessaging>(Types.Cluster.ClusterMessaging).to(ClusterMessaging).inSingletonScope();

        // Redis
        this.container.bind<Redis>(Types.Redis).to(Redis).inSingletonScope();

        // Pubsub
        const pubSubSystem = require(this.config.systems.pubSub);
        this.container.bind<PubSub>(Types.PubSub).to(pubSubSystem.default).inSingletonScope();

        // Actor
        const actorDirectory = require(this.config.systems.actorDirectory);
        this.container.bind<ActorDirectory>(Types.Actor.ActorDirectory).to(actorDirectory.default).inSingletonScope();
        this.container.bind<ActorPlacement>(Types.Actor.ActorPlacement).to(ActorPlacement).inSingletonScope();
        this.container.bind<ActorFactory>(Types.Actor.ActorFactory).to(ActorFactory).inSingletonScope();
        this.container.bind<ActorMessaging>(Types.Actor.ActorMessaging).to(ActorMessaging).inSingletonScope();
        this.container.bind<ActorExecution>(Types.Actor.ActorExecution).to(ActorExecution).inSingletonScope();

        // API
        this.api = new RatatoskrAPI(this, this.container);
        this.container.bind<RatatoskrAPI>(Types.RatatoskrAPI).toConstantValue(this.api);
    }

    private bindConfigs() {
        this.container.bind(Types.FullConfig).toConstantValue(this.config);

        for (const key in this.config) {
            this.container.bind(Types.Config(key)).toConstantValue(this.config[key]);
        }
    }

    public getAPI(): RatatoskrAPI {
        return this.api;
    }
}

export default Server;
export { Server };