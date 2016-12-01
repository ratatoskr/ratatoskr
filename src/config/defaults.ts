const defaultOptions = {
    logLevel: "silly",
    clusterName: "ratatoskr-default-cluster",
    nodeName: "ratatoskr-node",
    serverPulseSecs: 5,
    nodeEntrySecs: 10,
    actorMessageTimeoutSecs: 5,
    defaultActorLifetimeSecs: 60,
    reminderPumpSecs: 1,
    systems: {
        pubSub: "./net/redis-pub-sub",
        clusterDirectory: "./net/redis-cluster-directory",
        actorDirectory: "./actor/redis-actor-directory",
        reminderActor: "./actor/redis-reminder-actor"
    }
};

export default defaultOptions;
