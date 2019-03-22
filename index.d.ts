export type AsyncIteratorResolver<T> = (data: IteratorResult<T>) => void;
export type AsyncIteratorTask<T> = {
    resolve: AsyncIteratorResolver<T>,
    reject: (err: any) => void
};

export namespace AsyncStreamIterator {
    export interface Options<T = Buffer> {
        events?: {
            data?: string,
            error?: string,
            end?: string
        },
        preprocessors?: {
            onData?: (msg: any) => T,
            onError?: (err: any) => Error,
            onEnd?: () => void
        }
    }
}

export class AsyncStreamIterator<T = Buffer> implements AsyncIterableIterator<T>, PromiseLike<T> {
    readonly source: any;
    readonly status: "suspended" | "closed";
    protected tasks: AsyncIteratorTask<T>[];
    protected chunks: T[];
    protected error: any;
    protected preprocessors: AsyncStreamIterator.Options["preprocessors"];
    protected events: { [x: string]: Function };

    constructor(source: any, options?: AsyncStreamIterator.Options<T>);
    /** Fetches the next chunk of data from the stream. */
    next(): Promise<IteratorResult<T>>;
    /** Explicitly stops the iterator. */
    stop(): void;
    then(onfulfilled?: (data: any) => any, onrejected?: (err: any) => any): ReturnType<this["next"]>;
    [Symbol.asyncIterator](): this;
    protected attachEventHandler(event: string, handler: Function): void;
    protected detachEventHandlers(): void;
    protected handleDataEvent(msg: any): void;
    protected handleErrorEvent(err: any): void;
    protected handleEndEvent(): void;
}

export default AsyncStreamIterator;