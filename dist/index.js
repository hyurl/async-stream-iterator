"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (!Symbol["asyncIterator"]) {
    Symbol["asyncIterator"] = Symbol("Symbol.asyncIterator");
}
class AsyncStreamIterator {
    constructor(source, options = {}) {
        this.source = source;
        this.status = "suspended";
        this.tasks = [];
        this.frames = [];
        this.error = null;
        let { events = {}, preprocesser, onClose } = options;
        this.preprocesser = preprocesser;
        this.onClose = onClose;
        if (events.data) {
            if (events.data[0] === "#") {
                source[events.data.slice(1)] = this.handleDataEvent.bind(this);
            }
            else {
                source.on(events.data, this.handleDataEvent.bind(this));
            }
        }
        if (events.end) {
            if (events.end[0] === "#") {
                source[events.end.slice(1)] = this.handleEndEvent.bind(this);
            }
            else {
                source.once(events.end, this.handleEndEvent.bind(this));
            }
        }
        if (events.error) {
            if (events.error[0] === "#") {
                source[events.error.slice(1)] = this.handleErrorEvent.bind(this);
            }
            else {
                source.once(events.end, this.handleErrorEvent.bind(this));
            }
        }
    }
    next() {
        return new Promise((resolve, reject) => {
            if (this.status === "errored") {
                reject(this.error);
            }
            else if (this.status === "closed") {
                resolve({ value: void 0, done: true });
            }
            else if (this.frames.length > 0) {
                resolve({ value: this.frames.shift(), done: false });
            }
            else {
                this.tasks.push({ resolve, reject });
            }
        });
    }
    stop() {
        this.status = "closed";
        if (this.tasks.length > 0) {
            let task;
            while (task = this.tasks.shift()) {
                task.resolve({ value: undefined, done: true });
            }
        }
        this.onClose && this.onClose();
    }
    handleDataEvent(msg) {
        if (this.status === "suspended") {
            let value = this.preprocesser ? this.preprocesser(msg) : msg;
            if (this.tasks.length > 0) {
                let task = this.tasks.shift();
                task.resolve({ value, done: false });
            }
            else {
                this.frames.push(value);
            }
        }
    }
    handleErrorEvent(err) {
        if (this.status === "suspended") {
            if (this.tasks.length > 0) {
                this.tasks.shift().reject(err);
            }
            this.stop();
        }
    }
    handleEndEvent() {
        this.status === "suspended" && this.stop();
    }
    [Symbol["asyncIterator"]]() {
        return this;
    }
}
exports.AsyncStreamIterator = AsyncStreamIterator;
//# sourceMappingURL=index.js.map