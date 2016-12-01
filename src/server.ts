import "reflect-metadata";

// Common
// tslint:disable-next-line
const Package = require("../package.json");
import Types from "./types";

// IOC
import { Container } from "inversify";

// Utils / Config
import Config from "./config/config";
import Logger from "./util/logger";

// Net
import ClusterDirectory from "./net/cluster-directory";
import ClusterMessaging from "./net/cluster-messaging";
import * as ClusterState from "./net/cluster-state";
import PubSub from "./net/pub-sub";
import Redis from "./net/redis";

// Actor
import ActorDirectory from "./actor/actor-directory";
import ActorExecution from "./actor/actor-execution";
import ActorFactory from "./actor/actor-factory";
import ActorMessaging from "./actor/actor-messaging";
import ActorPlacement from "./actor/actor-placement";
import ActorReminders from "./actor/actor-reminders";

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

        // Start reminder system
        const actorReminders = this.container.get<ActorReminders>(Types.Actor.ActorReminders);
        actorReminders.initReminderActor();

        // Flip our state to running and write to directory
        clusterInfo.localNode.nodeStatus = ClusterState.NodeStatus.RUNNING;
        await clusterDirectory.updateCluster();

        // Setup pulse
        this.timer = setInterval(this.internalPulse.bind(this), this.config.serverPulseSecs * 1000);

        Logger.info("Server started.");
    }

    public getAPI(): RatatoskrAPI {
        return this.api;
    }

        public async stop() {
        Logger.info("Stopping Ratatoskr server...");

        const clusterDirectory = this.container.get<ClusterDirectory>(Types.Cluster.ClusterDirectory);
        const clusterInfo = this.container.get<ClusterState.ClusterInfo>(Types.Cluster.ClusterInfo);

        // Stop the pulse
        clearInterval(this.timer);

        // Set node status
        clusterInfo.localNode.nodeStatus = ClusterState.NodeStatus.STOPPING;
        await clusterDirectory.updateNodeEntry();

        // Kill all active actors
        await this.container.get<ActorExecution>(Types.Actor.ActorExecution).killAllActors();

        // Set status again
        clusterInfo.localNode.nodeStatus = ClusterState.NodeStatus.IDLE;
        await clusterDirectory.updateNodeEntry();

        // Kill redis
        this.container.get<Redis>(Types.Redis).stop();

        Logger.info("Server stopped.");
    }

    private async pulse() {
        await this.container.get<ClusterDirectory>(Types.Cluster.ClusterDirectory).updateCluster();
        await this.container.get<ActorMessaging>(Types.Actor.ActorMessaging).updatePendingMessages();
        await this.container.get<ActorExecution>(Types.Actor.ActorExecution).killExpiredActors();
        await this.container.get<ActorReminders>(Types.Actor.ActorReminders).pingReminders();
    }

    private internalPulse() {
        this.pulse().catch((error) => {
            Logger.error("Pulse Error:", error);
        });
    }

    private init(opts: any) {
        // Create the DI container
        this.container = new Container();

        // Create our config object
        this.config = Config.createOptions(opts);

        // Configure logging
        // tslint:disable-next-line
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
        this.container.bind<ClusterState.NodeInfo>(Types.Cluster.LocalNode)
            .to(ClusterState.NodeInfo).inSingletonScope();
        this.container.bind<ClusterState.ClusterInfo>(Types.Cluster.ClusterInfo)
            .to(ClusterState.ClusterInfo).inSingletonScope();
        const clusterDirectory = require(this.config.systems.clusterDirectory);
        this.container.bind<ClusterDirectory>(Types.Cluster.ClusterDirectory)
            .to(clusterDirectory.default).inSingletonScope();
        this.container.bind<ClusterMessaging>(Types.Cluster.ClusterMessaging)
            .to(ClusterMessaging).inSingletonScope();

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
        this.container.bind<ActorReminders>(Types.Actor.ActorReminders).to(ActorReminders).inSingletonScope();

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
}

export default Server;
export { Server };
