class UUID {
    public static generate(): string {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            // tslint:disable-next-line
            const r = Math.random() * 16 | 0,  v = c === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

export default UUID;
export {UUID};
