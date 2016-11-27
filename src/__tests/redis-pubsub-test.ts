import "./helpers/base-test";

import { ClusterInfo, NodeInfo } from "../net/cluster-state";
import { RedisPubSub } from "../net/redis-pub-sub";
import { Redis } from "../net/redis";
import Config from "../config/config"

function createPubSub() {
    const clusterName = "randomCluster" + Math.floor((Math.random() * 9999));
    const redis: Redis = new Redis();
    const clusterInfo = new ClusterInfo(clusterName, new NodeInfo("pubsub-test"));
    return new RedisPubSub(redis, clusterInfo);
}


test("redis single subscriber", done => {
    const MESSAGE_CONTENT = "meep-moop-boop";

    const randomId = "channel" + Math.floor((Math.random() * 9999));

    // Create client
    const pubSub = createPubSub();
    pubSub.connect();

    // Subscribe
    pubSub.subscribe(randomId, (channelName, payload) => {
        expect(payload).toBe(MESSAGE_CONTENT);
        done();
    }).then(() => {
        // Publish
        pubSub.publish(randomId, MESSAGE_CONTENT);
    });
});

test("redis multi subscriber", done => {
    const MESSAGE_CONTENT = "multi-moop-boop";

    const randomId = "channel" + Math.floor((Math.random() * 9999));

    // Count incoming message
    let callCount = 0;
    let onMessage = (channelName: string, payload: string) => {
        // Check the message is the one we wanted
        expect(payload).toBe(MESSAGE_CONTENT);

        // Did we get 2?
        if (++callCount == 2) {
            done();
        }
    }

    // Create clients
    const pubSub = createPubSub();
    pubSub.connect();
    const pubSub2 = createPubSub();
    pubSub2.connect();

    // Subscribe to first
    pubSub.subscribe(randomId, onMessage)
        .then(() => {
            // Subscribe to second
            return pubSub2.subscribe(randomId, onMessage);
        }).then(() => {
            // Publish to channel
            pubSub.publish(randomId, MESSAGE_CONTENT);
        });
});