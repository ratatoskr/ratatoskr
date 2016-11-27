import { injectable, inject, Container } from "inversify";

import { Types } from "../types";
import { RatatoskrAPI } from "../api/ratatoskr-api";
import { Time } from "../util/time";
import { ClusterInfo } from "../net/cluster-state";

import { ActorType, ActorId } from "./actor-types";
import { ActorActivation, ActivationMessageResult } from "./actor-activation";
import { ActorDirectory } from "./actor-directory";
import { ActorFactory } from "./actor-factory";

@injectable()
class ActorExecution {
    private actorDirectory: ActorDirectory;
    private actorFactory: ActorFactory
    private container: Container;
    private api: RatatoskrAPI;
    private config: any;
    private clusterInfo: ClusterInfo;
    private activations: { [key: string]: ActorActivation };

    constructor(
        @inject(Types.Actor.ActorDirectory) actorDirectory: ActorDirectory,
        @inject(Types.Actor.ActorFactory) actorFactory: ActorFactory,
        @inject(Types.Container) container: Container,
        @inject(Types.RatatoskrAPI) api: RatatoskrAPI,
        @inject(Types.FullConfig) config: ClusterInfo,
        @inject(Types.Cluster.ClusterInfo) clusterInfo: any
    ) {
        this.actorDirectory = actorDirectory;
        this.actorFactory = actorFactory;
        this.container = container;
        this.api = api;
        this.config = config;
        this.clusterInfo = clusterInfo;

        this.activations = {};
    }

    public async onMessage(actorType: ActorType, actorId: ActorId, contents: any): ActivationMessageResult {
        const expiryResult = await this.updateExpiry(actorType, actorId);

        if (expiryResult.expiryUpdated) {
            const activation = await this.getOrActivate(actorType, actorId);
            activation.expireTime = Time.currentTime() + expiryResult.expireIn;
            return activation.onMessage(contents);
        }

        return { rejected: true, promise: null };
    }

    private async getOrActivate(actorType: ActorType, actorId: ActorId) {
        const activationKey = this.activationKey(actorType, actorId);
        let activation = this.activations[activationKey];
        if (!activation) {
            const actorCtr = this.actorFactory.getInstance(actorType);
            activation = new ActorActivation(actorType, actorId, actorCtr, this.api);
            this.activations[activationKey] = activation; // Do this before we await on anything so it's effectively atomic
            try {
                await activation.onActivate();
            }
            catch (e) {
                await this.deactivate(actorType, actorId);
                throw "Could not activate actor: " + e;
            }

        }
        return activation;
    }

    public async killExpiredActors() {
        const toBeRemoved: string[] = [];
        for (const activationKey in this.activations) {
            const activation = this.activations[activationKey];
            if (activation.expireTime < Time.currentTime()) {
                toBeRemoved.push(activationKey);
            }
        }

        for (const activationKey of toBeRemoved) {
            const activation = this.activations[activationKey];
            await this.deactivate(activation.actorType, activation.actorId);
        }
    }

    public async killAllActors() {
        for (const activationKey in this.activations) {
            const activation = this.activations[activationKey];
            await this.deactivate(activation.actorType, activation.actorId);
        }
    }

    public async deactivate(actorType: ActorType, actorId: ActorId) {
        const activationKey = this.activationKey(actorType, actorId);
        const activation = this.activations[activationKey];
        if (activation) {
            await activation.onDeactivate();
            await this.actorDirectory.removeActor(actorType, actorId);
            delete this.activations[activationKey];
        }
    }

    private async updateExpiry(actorType: ActorType, actorId: ActorId) {
        // We add twice the pulse interval so we don't have a race
        // TODO: This is pretty nasty, figure out a better way
        const dbExpiry = this.config.defaultActorLifetimeSecs + (2 * this.config.serverPulseSecs);
        const realExpiry = this.config.defaultActorLifetimeSecs;
        // Attempt to update expiry
        const didUpdateExpiry = await this.actorDirectory.updateActorExpiry(actorType, actorId, this.clusterInfo.localNode.nodeId, dbExpiry);

        return { expiryUpdated: true, expireIn: realExpiry };
    }

    private activationKey(actorType: ActorType, actorId: ActorId) {
        return actorType + "/" + actorId;
    }
}

export default ActorExecution;
export { ActorExecution };