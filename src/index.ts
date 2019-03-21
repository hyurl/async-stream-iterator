if (!Symbol["asyncIterator"]) {
    Symbol["asyncIterator"] = Symbol("Symbol.asyncIterator");
}

export type AsyncIteratorResolver<T> = (data: IteratorResult<T>) => void;
export type AsyncIteratorTask<T> = {
    resolve: AsyncIteratorResolver<T>,
    reject: (err: any) => void
};

export class AsyncStreamIterator<T = string> {
    protected status: "suspended" | "closed" | "errored" = "suspended";
    protected tasks: AsyncIteratorTask<T>[] = [];
    protected frames: T[] = [];
    protected error: any = null;
    protected preprocesser: (msg: any) => T;
    protected onClose: Function;

    constructor(protected source: any, options: {
        events?: {
            data?: string,
            end?: string,
            error?: string
        },
        preprocesser?: (msg: any) => T,
        onClose?: Function
    } = {}) {
        let { events = {}, preprocesser, onClose } = options;
        this.preprocesser = preprocesser;
        this.onClose = onClose;

        if (events.data) {
            if (events.data[0] === "#") {
                source[events.data.slice(1)] = this.handleDataEvent.bind(this);
            } else {
                source.on(events.data, this.handleDataEvent.bind(this));
            }
        }

        if (events.end) {
            if (events.end[0] === "#") {
                source[events.end.slice(1)] = this.handleEndEvent.bind(this);
            } else {
                source.once(events.end, this.handleEndEvent.bind(this));
            }
        }

        if (events.error) {
            if (events.error[0] === "#") {
                source[events.error.slice(1)] = this.handleErrorEvent.bind(this);
            } else {
                source.once(events.end, this.handleErrorEvent.bind(this));
            }
        }
    }

    next() {
        return new Promise((resolve: AsyncIteratorResolver<T>, reject) => {
            if (this.status === "errored") {
                reject(this.error);
            } else if (this.status === "closed") {
                resolve({ value: void 0, done: true });
            } else if (this.frames.length > 0) {
                resolve({ value: this.frames.shift(), done: false });
            } else {
                this.tasks.push({ resolve, reject });
            }
        });
    }

    /** Manually stops the iterator. */
    stop() {
        this.status = "closed";

        if (this.tasks.length > 0) {
            let task: AsyncIteratorTask<T>;

            while (task = this.tasks.shift()) {
                task.resolve({ value: undefined, done: true });
            }
        }

        this.onClose && this.onClose();
    }

    protected handleDataEvent(msg: any) {
        if (this.status === "suspended") {
            let value: T = this.preprocesser ? this.preprocesser(msg) : msg;

            if (this.tasks.length > 0) {
                let task = this.tasks.shift();

                task.resolve({ value, done: false });
            } else {
                this.frames.push(value);
            }
        }
    }

    protected handleErrorEvent(err: any) {
        if (this.status === "suspended") {
            if (this.tasks.length > 0) {
                this.tasks.shift().reject(err);
            }

            this.stop();
        }
    }

    protected handleEndEvent() {
        this.status === "suspended" && this.stop();
    }

    [Symbol["asyncIterator"]]() {
        return this;
    }
}