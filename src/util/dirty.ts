export default function dirty(target: any, propertyKey: string) {
    Object.defineProperty(target.constructor.prototype, propertyKey, {
        get() {
            return this[`_${propertyKey}`];
        },
        set(value) {
            this[`_${propertyKey}`] = value;
            this.dirty = true;
        }
    });
}