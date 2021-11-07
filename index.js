"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const fs = require("fs");
const rl = require("readline");
class Database {
    constructor(path = 'db') {
        this._queue = [];
        this._running = false;
        this._reader = null;
        this._writer = null;
        this._path = path;
        try {
            fs.statSync(this._path);
        }
        catch (_) {
            fs.writeFileSync(this._path, '');
        }
    }
    put(data) {
        return new Promise(res => fs.appendFile(this._path, JSON.stringify(data) + '\n', () => res(void 0)));
    }
    find(fn) {
        return new Promise(res => {
            this._queue.push({
                type: 'read', res, fn,
                init: !this._running
            });
            this._runner();
        });
    }
    remove(fn) {
        return new Promise(res => {
            this._queue.push({
                type: 'write', res, fn,
                init: !this._running
            });
            this._runner();
        });
    }
    _runner() {
        var _a, _b;
        if (this._running)
            return;
        this._running = true;
        if (this._queue.find(q => q.type === 'write'))
            this._writer = fs.createWriteStream(this._path + '.tmp');
        this._reader = rl.createInterface(fs.createReadStream(this._path));
        (_a = this._reader) === null || _a === void 0 ? void 0 : _a.on('line', (line) => {
            var _a;
            const json = JSON.parse(line);
            for (let i = 0; i < this._queue.length; i++) {
                const q = this._queue[i];
                if (q.init) {
                    if (q.type === 'read' && q.fn(json))
                        this._queue.splice(i, 1)[0].res(json);
                    else if (q.type === 'write' && !q.fn(json))
                        (_a = this._writer) === null || _a === void 0 ? void 0 : _a.write(line + '\n');
                }
            }
        });
        (_b = this._reader) === null || _b === void 0 ? void 0 : _b.once('close', () => {
            var _a;
            this._reader = null;
            if (this._writer) {
                (_a = this._writer) === null || _a === void 0 ? void 0 : _a.close();
                this._writer = null;
                try {
                    fs.statSync(this._path + '.tmp');
                    fs.renameSync(this._path + '.tmp', this._path);
                }
                catch (_) { }
            }
            for (let i = 0; i < this._queue.length; i++) {
                const q = this._queue[i];
                if (q.init)
                    this._queue.splice(i, 1)[0].res(void 0);
                else
                    q.init = true;
            }
            this._running = false;
            if (this._queue.length)
                this._runner();
        });
    }
}
exports.Database = Database;
