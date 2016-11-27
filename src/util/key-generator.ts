import {ActorId, ActorType} from "../actor/actor-types";
import {NodeId} from "../net/cluster-state";

class KeyGenerator {
    public static key(type: string, args: { [key: string]: any }) {
        let prefix = type + "/";
        for (let arg in args) {
            prefix += arg + ":" + args[arg] + "/";
        }

        prefix = prefix.substring(0, prefix.length - 1);

        return prefix;
    }

    public static clusterKey(clusterName: string) {
        return KeyGenerator.key("cluster", { clusterName: clusterName });
    }

    public static nodeKey(clusterName: string, nodeId: NodeId) {
        return KeyGenerator.key("node", { clusterName: clusterName, nodeId: nodeId });
    }

    public static actorPlacementKey(clusterName: string, actorType: ActorType, actorId: ActorId) {
        return KeyGenerator.key("actorPlacement", { clusterName: clusterName, actorType: actorType, actorId: actorId });
    }
}

export default KeyGenerator;
export {KeyGenerator};