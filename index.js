"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

if (!Symbol.asyncIterator) {
    Symbol.asyncIterator = Symbol("Symbol.asyncIterator");
}

/**
 * @example
 * var iterator = new AsyncStreamIterator(someReadableStream);
 *
 * for await (let data of iterator) {
 *     // TODO...
 * }
 *
 * // OR
 *
 * while (true) {
 *     let { value, done } = await iterator;
 *
 *     if (done) {
 *         break;
 *     } else {
 *         // TODO...
 *     }
 * }
 */
class AsyncStreamIterator {
    constructor(source, options) {
        let { events = {}, preprocessors = {} } = options || {};

        this.source = source;
        this.status = "suspended";
        this.tasks = [];
        this.chunks = [];
        this.error = null;
        this.preprocessors = preprocessors;

        if (events.data || (events.data = "data")) {
            this.attachEventHandler(events.data, this.handleDataEvent);
        }

        if (events.error || (events.error = "error")) {
            this.attachEventHandler(events.error, this.handleErrorEvent);
        }

        if (events.end || (events.end = "end")) {
            this.attachEventHandler(events.end, this.handleEndEvent);
        }
    }

    /** Fetches the next chunk of data from the stream. */
    next() {
        return new Promise((resolve, reject) => {
            if (this.error && this.status !== "closed") {
                // If there is error occurred during the last transmission and
                // the iterator hasn't been closed, reject that error and stop
                // the iterator immediately.
                reject(this.error);
                this.stop();
            } else if (this.status === "closed") {
                // If the iterator has is closed, resolve any pending task with
                // void value.
                resolve({ value: void 0, done: true });
            } else if (this.chunks.length > 0) {
                // If there are data in the queue, resolve the the first chunk 
                // of them immediately.
                resolve({ value: this.chunks.shift(), done: false });
            } else {
                // If there are no queued data, push the task to a waiting queue.
                this.tasks.push({ resolve, reject });
            }
        });
    }

    /** Explicitly stops the iterator. */
    stop() {
        this.status = "closed";
        this.preprocessors.onEnd && this.preprocessors.onEnd();

        if (this.tasks.length > 0) {
            let task;

            // Resolve all waiting tasks with void value.
            while (task = this.tasks.shift()) {
                task.resolve({ value: undefined, done: true });
            }
        }
    }

    /** @protected */
    attachEventHandler(event, handler) {
        if (event[0] === "#") {
            this.source[event.slice(1)] = handler.bind(this);
        } else if (typeof this.source.on === "function") {
            this.source.on(event, handler.bind(this));
        }
    }

    /** @protected */
    handleDataEvent(msg) {
        if (this.status === "suspended") {
            let value = this.preprocessors.onData
                ? this.preprocessors.onData(msg)
                : msg;

            if (this.tasks.length > 0) {
                this.tasks.shift().resolve({ value, done: false });
            } else {
                this.chunks.push(value);
            }
        }
    }

    /** @protected */
    handleErrorEvent(err) {
        if (this.status === "suspended") {
            let error = this.preprocessors.onError
                ? this.preprocessors.onError(err)
                : err;

            this.error = error;

            if (this.tasks.length > 0) {
                this.tasks.shift().reject(error);
                this.stop();
            }
        }
    }

    /** @protected */
    handleEndEvent() {
        this.status === "suspended" && this.stop();
    }

    [Symbol.asyncIterator]() {
        return this;
    }

    then(onfulfilled, onrejected) {
        return this.next().then(onfulfilled, onrejected);
    }
}

exports.default = exports.AsyncStreamIterator = AsyncStreamIterator;