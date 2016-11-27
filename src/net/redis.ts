import { RedisClient, createClient as CreateRedisClient } from "redis";
import { injectable } from "inversify";

@injectable()
class Redis {
    private mainClient: RedisClient;
    private dedicatedClients: RedisClient[] = [];

    public shared() {
        if (!this.mainClient)
            this.mainClient = CreateRedisClient();

        return this.mainClient;
    }

    public dedicated() {
        const newClient = this.shared().duplicate();
        this.dedicatedClients.push(newClient);
        return newClient;
    }

}

export { RedisClient, Redis };
export default Redis;