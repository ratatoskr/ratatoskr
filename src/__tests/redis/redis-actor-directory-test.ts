import "../__helpers/base-test";

import RedisActorDirectory from "../../actor/redis-actor-directory";
import {ClusterInfo, NodeInfo} from "../../net/cluster-state";
import Redis from "../../net/redis";

function createActorDirectory() {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));
    const redis = new Redis();
    const clusterInfo = new ClusterInfo(clusterName, new NodeInfo("testNode"));
    return new RedisActorDirectory(redis, clusterInfo);
}

test("redis actor directory cluster placement", () => {
    const actorDirectory = createActorDirectory();
    const ACTOR_TYPE = "clusterPlacementActorTest";
    const randomId = Math.floor((Math.random() * 9999));

    return actorDirectory.getActorLocation(ACTOR_TYPE, randomId).then((result) => {
        // Should be null first
        expect(result).toBe(null);
    })
    .then(() => {
        // Set to "myNode"
        return actorDirectory.putOrGetActorLocation(ACTOR_TYPE, randomId, "myNode", 10);
    })
    .then((result) => {
        // Verify it is "myNode"
        expect(result).toBe("myNode");
    })
    .then(() => {
        // Try to set it to "otherNode"
        return actorDirectory.putOrGetActorLocation(ACTOR_TYPE, randomId, "otherNode", 10);
    })
    .then((result) => {
        // Verify it did not change to "otherNode" but is still "myNode"
        expect(result).toBe("myNode");
    })
    .then(() => {
        // Verify "myNode" can update the timer
        return actorDirectory.updateActorExpiry(ACTOR_TYPE, randomId, "myNode", 10);
    })
    .then((result) => {
        expect(result).toBe(true);
    })
    .then(() => {
        // Verify "otherNode" can not update the timer
        return actorDirectory.updateActorExpiry(ACTOR_TYPE, randomId, "otherNode", 10);
    }).then((result) => {
        return expect(result).toBe(false);
    });
});

test("redis actor directory ttl persistence", () => {
    const actorDirectory = createActorDirectory();
    const ACTOR_TYPE = "clusterPlacementActorTTLTest";
    const ACTOR_TTL = 1;
    const randomId = Math.floor((Math.random() * 9999));

    return actorDirectory.putOrGetActorLocation(ACTOR_TYPE, randomId, "myNode", ACTOR_TTL).then((result) => {
        // Make sure it was placed
        expect(result).toBe("myNode");

        // Set ttl
        return actorDirectory.updateActorExpiry(ACTOR_TYPE, randomId, "myNode", ACTOR_TTL);
    })
    .then((result) => {
        // Make sure it was set
        expect(result).toBe(true);

        // Finish this promise after double the ttl
        return new Promise((resolve) => {
            setTimeout(() => resolve(), (ACTOR_TTL * 2) * 1000);
        });
    })
    .then(() => {
        // Attempt to get it
        return actorDirectory.getActorLocation(ACTOR_TYPE, randomId);
    })
    .then((result) => {
        // Check it was removed and is null
        return expect(result).toBe(null);
    });
});
