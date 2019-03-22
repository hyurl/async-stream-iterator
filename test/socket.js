const co = require("co");
const net = require("net");
const bsp = require("bsp");
const assert = require("assert");
const sleep = require("sleep-promise");
const { AsyncStreamIterator } = require("..");

describe("Socket Tests", () => {
    it("should read data from a socket as expected", (done) => {
        let data = ["hello", "world", "hi", "ayon"];
        let server = net.createServer(socket => {
            let iterator = new AsyncStreamIterator(socket, {
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
            }).then(() => {
                client.destroy();
                server.close();
                done();
            }).catch((err) => {
                client.destroy();
                server.close();
                done(err);
            });
        }).listen(12345);
        let client = net.createConnection(12345);

        co(function* () {
            for (let msg of data) {
                client.write(msg);
                yield sleep(10);
            }

            client.end();
        });
    });

    it("should read data and stop the iterator when socket emits close event", (done) => {
        let data = ["hello", "world", "hi", "ayon"];
        let server = net.createServer(socket => {
            let iterator = new AsyncStreamIterator(socket, {
                events: { end: "close" },
                preprocessors: {
                    onData: buf => buf.toString()
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
            }).then(() => {
                server.close();
                done();
            }).catch((err) => {
                server.close();
                done(err);
            });
        }).listen(12345);
        let client = net.createConnection(12345);

        co(function* () {
            for (let msg of data) {
                client.write(msg);
                yield sleep(10);
            }

            client.destroy();
        });
    });

    it("should read data using a custom event name as expected", (done) => {
        let data = ["hello", "world", "hi", "ayon"];
        let server = net.createServer(socket => {
            socket.on("data", buf => {
                let temp = [];

                for (let data of bsp.receive(buf, temp)) {
                    for (let msg of data) {
                        if (msg.event) {
                            socket.emit(msg.event, msg.data);
                        }
                    }
                }
            });

            let iterator = new AsyncStreamIterator(socket, {
                events: { data: "test", end: "close" },
                preprocessors: {
                    onData: buf => buf.toString()
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
                        _data.push(value);
                    }
                }

                assert.strictEqual(count, 4);
                assert.deepStrictEqual(_data, data);
            }).then(() => {
                server.close();
                done();
            }).catch((err) => {
                server.close();
                done(err);
            });
        }).listen(12345);
        let client = net.createConnection(12345);

        co(function* () {
            for (let msg of data) {
                client.write(bsp.send({ event: "test", data: msg }));
                yield sleep(10);
            }

            client.destroy();
        });
    });
});