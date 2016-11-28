class Time {
    public static currentTime(): number {
        return Date.now() / 1000 | 0;
    }
}

export default Time;
export { Time };