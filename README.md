# AsyncStreamIterator

**Convert any readable stream to an async iterator and promise-like.**

## API

```typescript
class AsyncStreamIterator<T = Buffer> implements AsyncIterableIterator<T> {
    readonly source: any;
    readonly status: "suspended" | "closed";

    constructor(source: any, options?: AsyncStreamIterator.Options<T>);
    /** Fetches the next chunk of data from the stream. */
    next(): Promise<IteratorResult<T>>;
    /** Explicitly stops the iterator. */
    stop(): void;
    then(onfulfilled?: Function, onrejected?: Function): ReturnType<this["next"]>;
    [Symbol.asyncIterator](): this;
}

namespace AsyncStreamIterator {
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
```

## Examples

### HTTP request

```typescript
import * as http from "http";
import AsyncStreamIterator from "async-stream-iterator";

var server = http.createServer(async (req, res) => {
    let data = "";
    
    for await (let chunk of new AsyncStreamIterator(req)) {
        // Instead of converting the data here, you can pass the options
        // `preprocessors.onData` a function to do so.
        data += String(chunk);
    }

    res.end(data);
});
```

### Socket message

```typescript
import * as net from "net";
import AsyncStreamIterator from "async-stream-iterator";

var server = net.createServer(async (socket) => {
    for await (let chunk of new AsyncStreamIterator(socket)) {
        socket.write(chunk);
    }
});
```

### Browser WebSocket

```typescript
import AsyncStreamIterator from "async-stream-iterator";

var ws = new WebSocket("ws://localhost");
var iterator = new AsyncStreamIterator(ws, {
    events: {
        // When the event is bound to a property, it shuold be prefixed with '#'.
        data: "#onmessage",
        error: "#onerror",
        end: "#onclose"
    },
    preprocessors: {
        onData: (event) => event.data
    }
});

(async () => {
    for await (let data of iterator) {
        console.log(data);
    }
})();
```

## Browser EventSource

```typescript
import AsyncStreamIterator from "async-stream-iterator";

var es = new EventSource("ws://localhost");
var iterator = new AsyncStreamIterator(ws, {
    events: {
        data: "#onmessage",
        error: "#onerror"
    },
    preprocessors: {
        onData: (event) => event.data,
        onEnd: () => es.close()
    }
});

(async () => {
    for await (let data of iterator) {
        // TODO...

        if (/* goes well */) {
            // Explicitly close the iterator and `preprocessors.onEnd` is bound
            // to close the EventSource instance, the request will be closed as
            // well.
            iterator.close();
        }
    }
})();
```

## Socket.io

```typescript
import * as SocketIO from "socket.io";
import AsyncStreamIterator from "async-stream-iterator";

var ws = SocketIO(8000).on("connection", socket => {
    let task = (async () => {
        let iterator = new AsyncStreamIterator(socket, {
            events: {
                data: "some event"
            }
        });

        for await (let data of iterator) {
            // TODO...
        }

        // NOTE: AsyncStreamIterator only supports one argument passed to the
        // corresponding data event.
    })();
});
```

### Compatible with while loop

Only NodeJS v10+ and Chrome v63+ (Firefox v57+ / Safari v11+) support 
`for...await...of` loop, for other versions, use a transpiler, or just use a 
`while...await` loop (AsyncStreamIterator also implements the `PromiseLike`
interface, calling `await iterator` is the same as calling 
`await iterator.next()`).

```typescript
import * as http from "http";
import AsyncStreamIterator from "async-stream-iterator";

var server = http.createServer(async (req, res) => {
    let data = "";
    let iterator = new AsyncStreamIterator(req, {
        preprocessors: {
            onData: (buf) => buf.toString()
        }
    });
    let value: string, done: boolean;
    
    while ({ value, done } = await iterator) {
        if (done) {
            break;
        } else {
            data += value;
        }
    }

    res.end(data);
});
```