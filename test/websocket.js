const co = require("co");
const http = require("http");
const assert = require("assert");
const sleep = require("sleep-promise");
const { server: WebSocketServer, w3cwebsocket: WebSocket } = require("websocket");
const { AsyncStreamIterator } = require("..");

describe("WebSocket Tests", () => {
    it("should read data from the WebSocket server as expected", (done) => {
        let data = ["hello", "world", "hi", "ayon"];
        let server = http.createServer().listen(12345);
        let wsServer = new WebSocketServer({
            httpServer: server
        });

        wsServer.on("request", req => {
            let conn = req.accept('echo-protocol', req.origin);

            co(function* () {
                for (let msg of data) {
                    conn.send(msg);
                    yield sleep(10);
                }
            });
        });

        let ws = new WebSocket("ws://localhost:12345", 'echo-protocol');
        let iterator = new AsyncStreamIterator(ws, {
            events: {
                data: "#onmessage",
                error: "#onerror",
                end: "#onclose"
            },
            preprocessors: {
                onData: (event) => event.data,
                onEnd: () => ws.close()
            }
        });
        let count = 0;

        co(function* () {
            let _data = [];
            let value, done;

            while ({ value, done } = yield iterator) {
                if (done) {
                    break;
                } else {
                    count++;
                    _data.push(value.toString());

                    if (count === 4) {
                        iterator.stop();
                    }
                }
            }

            assert.strictEqual(count, 4);
            assert.deepStrictEqual(_data, data);
        }).then(() => {
            done();
            server.close();
        }).catch(err => {
            done(err);
            server.close();
        });
    });
});