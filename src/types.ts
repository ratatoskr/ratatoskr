let Types =
    {
        Config: (configVal: string): string => `config.${configVal}`,
        FullConfig: Symbol("fullConfig"),
        Redis: Symbol("redis"),
        PubSub: Symbol("pubSub"),
        Container: Symbol("container"),
        RatatoskrAPI: Symbol("ratatoskrApi"),

        Cluster: {
            ClusterInfo: Symbol("cluster.clusterInfo"),
            LocalNode: Symbol("cluster.localNode"),
            ClusterDirectory: Symbol("cluster.clusterDirectory"),
            ClusterMessaging: Symbol("cluster.clusterMessaging")
        },

        Actor: {
            ActorDirectory: Symbol("actor.actorDirectory"),
            ActorPlacement: Symbol("actor.actorPlacement"),
            ActorFactory: Symbol("actor.actorFactory"),
            ActorMessaging: Symbol("actor.actorMessaging"),
            ActorExecution: Symbol("actor.actorExecution")
        }

    }

export default Types;
export { Types };