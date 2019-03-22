const co = require("co");
const fs = require("fs");
const assert = require("assert");
const { AsyncStreamIterator } = require("..");

describe("File System Tests", () => {
    let filename = `${__dirname}/test-sample.tgz`;
    let stat = fs.statSync(filename);

    it("should read data from a file as expected", (done) => {
        let stream = fs.createReadStream(filename, { highWaterMark: 1024 });
        let iterator = new AsyncStreamIterator(stream);
        let count = 0;

        co(function* () {
            let data = Buffer.from([]);
            let value, done;

            while ({ value, done } = yield iterator.next()) {
                if (done) {
                    break;
                } else {
                    count++;
                    data = Buffer.concat([data, value]);
                }
            }

            assert.strictEqual(count, 3);
            assert.strictEqual(data.byteLength, stat.size);
        }).then(done).catch(done);
    });

    it("should read data from a file concurrently as expected", (done) => {
        let stream = fs.createReadStream(filename, { highWaterMark: 1024 });
        let iterator = new AsyncStreamIterator(stream);
        let count = 0;

        co(function* () {
            let data = Buffer.from([]);
            let tasks = [
                iterator.next(),
                iterator.next(),
                iterator.next(),
                iterator.next()
            ];

            for (let task of tasks) {
                let { value, done } = yield task;

                if (done) {
                    break;
                } else {
                    count++;
                    data = Buffer.concat([data, value]);
                }
            }

            assert.strictEqual(count, 3);
            assert.strictEqual(data.byteLength, stat.size);
        }).then(done).catch(done);
    });
});