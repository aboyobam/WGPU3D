class ExtensionHost {
    addExtension<E extends Extension<typeof this>>(extension: E): void {
        extension.__host = this;
        extension.init();
    }
}

export default abstract class Extension<T extends ExtensionHost> {
    static readonly Host = ExtensionHost;
    
    declare __host: T;
    abstract init(): void;

    pre<F extends keyof T>(
        name: F, 
        fn: T[F] extends (...args: infer Args) => any ? (...args: Args) => void : never
    ) {
        const original = this.__host[name];
        if (typeof original === 'function') {
            this.__host[name] = function(this: T, ...args: any[]) {
                fn.apply(this, args);
                return original.apply(this, args);
            } as T[F];
        }
    }

    after<F extends keyof T>(
        name: F, 
        fn: T[F] extends (...args: infer Args) => any ? (...args: Args) => void : never
    ) {
        const original = this.__host[name];
        if (typeof original === 'function') {
            this.__host[name] = function(this: T, ...args: any[]) {
                const retv = original.apply(this, args);
                fn.apply(this, args);
                return retv;
            } as T[F];
        }
    }
}