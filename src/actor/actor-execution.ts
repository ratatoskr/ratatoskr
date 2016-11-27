import { injectable, inject, Container } from "inversify";

import { Types } from "../types";
import { RatatoskrAPI } from "../api/ratatoskr-api";

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
    private activations: { [key: string]: ActorActivation };

    constructor(
        @inject(Types.Actor.ActorDirectory) actorDirectory: ActorDirectory,
        @inject(Types.Actor.ActorFactory) actorFactory: ActorFactory,
        @inject(Types.Container) container: Container,
        @inject(Types.RatatoskrAPI) api: RatatoskrAPI
    ) {
        this.actorDirectory = actorDirectory;
        this.actorFactory = actorFactory;
        this.container = container;
        this.api = api;

        this.activations = {};
    }

    public async onMessage(actorType: ActorType, actorId: ActorId, contents: any, expireInSecs: number): ActivationMessageResult {
        const activation = await this.getOrActivate(actorType, actorId);
        return activation.onMessage(contents, expireInSecs);
    }

    private async getOrActivate(actorType: ActorType, actorId: ActorId)
    {
        const activationKey = this.activationKey(actorType, actorId);
        let activation = this.activations[activationKey];
        if(!activation) {
            const actorCtr = this.actorFactory.getInstance(actorType);
            activation = new ActorActivation(actorType, actorId, actorCtr, this.api);
            this.activations[activationKey] = activation; // Do this before we await on anything so it's effectively atomic
            try 
            {
                await activation.activate();
            }
            catch(e)
            {
                await this.deactivate(actorType, actorId);
                throw "Could not activate actor: " + e;
            }
            
        }
        return activation;
    }

    public async deactivate(actorType: ActorType, actorId: ActorId) {
        const activationKey = this.activationKey(actorType, actorId);
        const activation = this.activations[activationKey];
        if(activation) {
            await activation.deactivate();
            await this.actorDirectory.removeActor(actorType, actorId);
            delete this.activations[activationKey];
        }
    }

    private activationKey(actorType: ActorType, actorId: ActorId) {
        return actorType + "/" + actorId;
    }
}

export default ActorExecution;
export { ActorExecution };