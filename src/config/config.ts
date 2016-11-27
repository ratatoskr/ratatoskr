import DefaultOptions from "./defaults";

class Config {
    public static createOptions(options?: any) : any {
        const output = {};
        Config.applyOptions(DefaultOptions, output);
        if(options) {
            Config.applyOptions(options, output);
        }
        return output;
    }

    private static applyOptions(source: any, target: any) : void {
        if (source) {
            for (const i in source) {
                target[i] = source[i];
            }
        }
    }
}

export default Config;
export { Config };