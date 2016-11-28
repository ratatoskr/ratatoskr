import { inject, injectable } from "inversify";
import {ActorType} from "./actor-types";

@injectable()
class ActorFactory {
    private actorConstructors: {[key: string]: () => any};

    constructor() {
        this.actorConstructors = {};
    }

    public push(actorType: ActorType, actorObject: any) {
        let actorConstructor: any;

        if (this.actorConstructors[actorType]) {
            throw `Actor implementation for type '${actorType}' already exists`;
        }

        // First we check it really is a function
        if (typeof actorObject !== "function") {
            throw "Actor implementation is not valid";
        }

        // Unpack it
        // TODO: We need to detect if it's just a class on it's own
        actorObject = actorObject();

        // Now we check if we really have an implementation
        // tslint:disable-next-line
        if (actorObject["constructor"] !== undefined && typeof actorObject["constructor"] === "function") {
            actorConstructor = () => new actorObject();
        }

        // Do we have a constructor?
        if (!actorConstructor) {
            throw "Actor implementation is not valid";
        }

        this.actorConstructors[actorType] = actorConstructor;
    }

    public getInstance(actorType: ActorType) {
        const actorCtr = this.actorConstructors[actorType];
        if (!actorCtr) {
            throw `No actor implementation found for '${actorType}`;
        }
        return actorCtr;
    }
}

export default ActorFactory;
export { ActorFactory };
