const co = require("co");
const http = require("http");
const assert = require("assert");
const sleep = require("sleep-promise");
const EventSource = require("eventsource");
const SSE = require("sfn-sse").default;
const { AsyncStreamIterator } = require("..");

describe("HTTP Tests", () => {
    /** @type {http.Server} */
    let server;
    let data = ["hello", "world", "hi", "ayon"];
    let _input = [];

    before(() => {
        server = http.createServer((req, res) => {
            co(function* () {
                if (req.url === "/test-req") {
                    let iterator = new AsyncStreamIterator(req, {
                        preprocessors: {
                            onData: (buf) => buf.toString()
                        }
                    });
                    let value, done;

                    while ({ value, done } = yield iterator.next()) {
                        if (done) {
                            break;
                        } else {
                            _input.push(value);
                        }
                    }

                    res.end("");
                } else if (req.url === "/test-res") {
                    res.writeHead(200, {
                        "Content-Type": "text/plain; charset=UTF-8"
                    });

                    for (let msg of data) {
                        res.write(msg);
                        yield sleep(10);
                    }

                    res.end();
                } else if (req.url === "/sse-test") {
                    let sse = new SSE(req, res);

                    for (let msg of data) {
                        sse.send(msg);
                    }
                }
            });
        }).listen(12345);
    });

    after(() => {
        server.close();
    });

    it("should read data from a http request as expected", (done) => {
        co(function* () {
            let timer = setTimeout(() => {
                done(new Error("HTTP request timeout after 1000 ms"));
            }, 1500);
            let req = http.request("http://localhost:12345/test-req", {
                method: "POST"
            }, res => {
                clearTimeout(timer);

                try {
                    assert.deepStrictEqual(_input, data);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            for (let msg of data) {
                req.write(msg);
                yield sleep(10);
            }

            req.end();
        });
    });

    it("should read data from a http response as expected", (done) => {
        http.request("http://localhost:12345/test-res", res => {
            let iterator = new AsyncStreamIterator(res, {
                preprocessors: {
                    onData: (buf) => buf.toString()
                }
            });
            let count = 0;

            co(function* () {
                let _data = [];
                let value, done;

                while ({ value, done } = yield iterator.next()) {
                    if (done) {
                        break;
                    } else {
                        count++;
                        _data.push(value);
                    }
                }

                assert.strictEqual(count, 4);
                assert.deepStrictEqual(_data, data);
            }).then(done).catch(done);
        }).end();
    });

    it("should read data from a EventSource as expected", (done) => {
        let es = new EventSource("http://localhost:12345/sse-test");
        let iterator = new AsyncStreamIterator(es, {
            events: {
                data: "#onmessage",
                error: "#onerror"
            },
            preprocessors: {
                onData: (event) => event.data,
                onEnd: () => es.close()
            }
        });
        let count = 0;

        co(function* () {
            let _data = [];
            let value, done;

            while ({ value, done } = yield iterator.next()) {
                if (done) {
                    break;
                } else {
                    count++;
                    _data.push(value);

                    if (count === 4) {
                        iterator.stop();
                    }
                }
            }

            assert.strictEqual(count, 4);
            assert.deepStrictEqual(_data, data);
        }).then(done).catch(done);
    });
});