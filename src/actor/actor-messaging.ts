import { injectable, inject } from "inversify";
import { Types } from "../types";

import { DeferredPromise } from "../util/deferred-promise";
import { Time } from "../util/time";
import { Logger } from "../util/logger";

import { ClusterMessaging, MessageHeaders } from "../net/cluster-messaging";
import { NodeInfo, NodeId, ClusterInfo } from "../net/cluster-state";

import { ActorPlacement } from "./actor-placement";
import { ActorDirectory } from "./actor-directory";
import { ActorId, ActorType } from "./actor-types";
import { ActorExecution } from "./actor-execution";

const ACTOR_SUBSYSTEM = "actor";

enum ActorMessageType {
    REQUEST,
    RESPONSE,
    ERROR
}

type ActorMessage = {
    messageType: ActorMessageType,
    actorType: ActorType,
    actorId: ActorId,
    contents: any,
    messageId: number,
    respondTo?: NodeId
};

type InFlightMessage = {
    deferred: DeferredPromise<any>,
    startTime: number
}

@injectable()
class ActorMessaging {
    private clusterInfo: ClusterInfo;
    private clusterMessaging: ClusterMessaging;
    private actorPlacement: ActorPlacement;
    private actorDirectory: ActorDirectory;
    private actorExecution: ActorExecution;
    private config: any;

    private messageCounter: number;
    private messagesInFlight: { [key: string]: InFlightMessage };

    constructor(
        @inject(Types.Cluster.ClusterInfo) clusterInfo: ClusterInfo,
        @inject(Types.Cluster.ClusterMessaging) clusterMessaging: ClusterMessaging,
        @inject(Types.Actor.ActorPlacement) actorPlacement: ActorPlacement,
        @inject(Types.Actor.ActorDirectory) actorDirectory: ActorDirectory,
        @inject(Types.Actor.ActorExecution) actorExecution: ActorExecution,
        @inject(Types.FullConfig) config: any
    ) {
        this.clusterInfo = clusterInfo;
        this.clusterMessaging = clusterMessaging;
        this.actorPlacement = actorPlacement;
        this.actorDirectory = actorDirectory;
        this.actorExecution = actorExecution;
        this.config = config;

        this.messageCounter = 1;
        this.messagesInFlight = {};

        this.clusterMessaging.addHandler(ACTOR_SUBSYSTEM, this.onMessage.bind(this));
    }

    public async sendActorRequest(actorType: ActorType, actorId: ActorId, contents: any, oneWay: boolean = false, respondTo?: NodeId): Promise<any> {

        // Find or place actor
        let actorLocation: NodeId = await this.actorDirectory.getActorLocation(actorType, actorId);
        if (!actorLocation) {
            actorLocation = this.actorPlacement.placeActor(actorType, actorId);
            actorLocation = await this.actorDirectory.putOrGetActorLocation(actorType, actorId, this.clusterInfo.localNode.nodeId, this.config.defaultActorLifetimeSecs);
        }

        // Did we find one
        if (actorLocation == null) {
            throw `Could not get location for actor '${actorType}:${actorId}'`;
        }

        // Construct message payload
        const messageId = this.messageCounter++;
        respondTo = respondTo == undefined ? this.clusterInfo.localNode.nodeId : respondTo;
        const actorMessage: ActorMessage = {
            messageType: ActorMessageType.REQUEST,
            actorType: actorType,
            actorId: actorId,
            contents: contents,
            messageId: messageId,
            respondTo: respondTo
        };

        const deferred: DeferredPromise<any> = new DeferredPromise();

        if (oneWay) {
            deferred.resolve(null);
        } else {
            const inFlightMessage: InFlightMessage = {
                deferred: deferred,
                startTime: Time.currentTime()
            }
            this.messagesInFlight[messageId] = inFlightMessage;
        }

        await this.clusterMessaging.sendMessage(actorLocation, ACTOR_SUBSYSTEM, actorMessage);

        return deferred.promise;
    }

    private async sendNormalResponse(originalMessage: ActorMessage, response: any) {
        const actorMessage: ActorMessage = {
            messageType: ActorMessageType.RESPONSE,
            actorType: originalMessage.actorType,
            actorId: originalMessage.actorId,
            messageId: originalMessage.messageId,
            contents: response
        };

        return this.clusterMessaging.sendMessage(originalMessage.respondTo, ACTOR_SUBSYSTEM, actorMessage);
    }

    private async sendErrorResponse(originalMessage: ActorMessage, response: any) {
        const actorMessage: ActorMessage = {
            messageType: ActorMessageType.ERROR,
            actorType: originalMessage.actorType,
            actorId: originalMessage.actorId,
            messageId: originalMessage.messageId,
            contents: response
        };

        return this.clusterMessaging.sendMessage(originalMessage.respondTo, ACTOR_SUBSYSTEM, actorMessage);
    }

    public async updatePendingMessages() {
        const currentTime = Time.currentTime();
        for (const messageId in this.messagesInFlight) {
            const messageInFlight = this.messagesInFlight[messageId];
            if (currentTime > messageInFlight.startTime + this.config.actorMessageTimeoutSecs) {
                messageInFlight.deferred.reject("Timed out");
                delete this.messagesInFlight[messageId];
            }
        }
    }

    private async handleActorRequest(message: ActorMessage) {
        // Do we actually own it?
        const actorOwner = await this.actorDirectory.getActorLocation(message.actorType, message.actorId);
        if (actorOwner == this.clusterInfo.localNode.nodeId) {
            // We remove 10% twice the pulse interval so we don't have a race
            // TODO: This is pretty nasty, figure out a better way
            const dbExpiry = this.config.defaultActorLifetimeSecs;
            const realExpiry = this.config.defaultActorLifetimeSecs - (2 * this.config.serverPulseSecs);
            // Attempt to update expiry
            const didUpdateExpiry = await this.actorDirectory.updateActorExpiry(message.actorType, message.actorId, this.clusterInfo.localNode.nodeId, dbExpiry);
            if (didUpdateExpiry) {
                // We still own the actor 
                const result = await this.actorExecution.onMessage(message.actorType, message.actorId, message.contents, realExpiry);
                if (!result.rejected) {
                    const reponse = await result.promise;
                    return { proxiedMessage: false, response: reponse };
                }

            }
        }

        // If we got here we don't own this actor anymore or message was rejected
        Logger.debug("We got message for an actor we don't own", message.actorType, message.actorId);
        // We need to tell execution
        this.actorExecution.deactivate(message.actorType, message.actorId);
        // We are going to forward this to be placed again
        await this.sendActorRequest(message.actorType, message.actorId, message.contents, true, message.respondTo);
        return { proxiedMessage: true, response: null };
    }

    private onActorRequestMessage(message: ActorMessage) {
        this.handleActorRequest(message).then(
            result => {
                if (!result.proxiedMessage) {
                    this.sendNormalResponse(message, result.response).catch(
                        error => {
                            Logger.error("Could not send normal response", message, error);
                        }
                    );
                }
            }
        ).catch(
            error => {
                this.sendErrorResponse(message, error).catch(
                    error => {
                        Logger.error("Could not send error response", message, error);
                    }
                );
            }
            );
    }

    private onActorResponseMessage(message: ActorMessage) {
        const inFlight = this.messagesInFlight[message.messageId];
        if (inFlight != undefined) {
            inFlight.deferred.resolve(message.contents);
            delete this.messagesInFlight[message.messageId];
        } else {
            Logger.warn("Got a response for a message we were not waiting for", message);
        }
    }

    private onActorErrorMessage(message: ActorMessage) {
        const inFlight = this.messagesInFlight[message.messageId];
        if (inFlight != undefined) {
            inFlight.deferred.reject(message.contents);
            delete this.messagesInFlight[message.messageId];
        } else {
            Logger.warn("Got error response for a message we were not waiting for", message);
        }
    }

    private onMessage(message: ActorMessage, headers: MessageHeaders) {
        switch (message.messageType) {
            case ActorMessageType.REQUEST:
                this.onActorRequestMessage(message);
                break;
            case ActorMessageType.RESPONSE:
                this.onActorResponseMessage(message);
                break;
            case ActorMessageType.ERROR:
                this.onActorErrorMessage(message);
                break;
        }
    }

}

export default ActorMessaging;
export { ActorMessaging };