import { ActorType, ActorId } from "./actor-types";
import { Types } from "../types";
import { NodeId } from "../net/cluster-state";

interface ActorDirectory {
    getActorLocation(actorType: ActorType, actorId: ActorId): Promise<NodeId>;
    putOrGetActorLocation(actorType: ActorType, actorId: ActorId, nodeId: NodeId, expireSecs: number): Promise<NodeId>;
    removeActor(actorType: ActorType, actorId: ActorId): Promise<void>;
    updateActorExpiry(actorType: ActorType, actorId: ActorId, nodeId: NodeId, expireSecs: number): Promise<boolean>;
}

export default ActorDirectory;
export { ActorDirectory };