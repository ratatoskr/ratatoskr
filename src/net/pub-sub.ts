export type MessageHandler = (channelName: string, payload: string) => void;

interface PubSub {
    connect(): Promise<void>;
    subscribe(channelName: string, callback: MessageHandler): Promise<void>;
    addHandler(channelName: string, callback: MessageHandler): void;
    publish(channelName: string, message: string): Promise<number>;
    unsubscribe(channelName: string): Promise<void>;
}

export default PubSub;
export { PubSub };