class Time {
    public static currentTime(): number {
        // tslint:disable-next-line
        return Date.now() / 1000 | 0;
    }
}

export default Time;
export { Time };
