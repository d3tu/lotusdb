import * as fs from 'fs';
import * as rl from 'readline';
type Callback = (arg: any) => void;
interface Options {
  wait?: boolean;
};
export class Database {
  private _path: string;
  private _queue: any[] = [];
  private _running = false;
  private _reader: rl.ReadLine | null = null;
  private _writer: fs.WriteStream | null = null;
  private _waiter = false;
  constructor(path: string = 'db', options?: Options) {
    this._path = path;
    this._waiter = options.wait;
    try {
      fs.statSync(this._path);
    } catch (_) {
      fs.writeFileSync(this._path, '');
    }
  }
  put(data: any): Promise<void> {
    return new Promise(res => fs.appendFile(this._path, JSON.stringify(data) + '\n', () => res(void 0)));
  }
  find(fn: Callback): Promise<any> {
    return new Promise(res => {
      this._queue.push({
        type: 'read', res, fn,
        init: !this._running
      });
      this._runner();
    });
  }
  remove(fn: Callback): Promise<void> {
    return new Promise(res => {
      this._queue.push({
        type: 'write', res, fn,
        init: !this._running
      });
      this._runner();
    });
  }
  private _runner() {
    if (this._running) return;
    this._running = true;
    if (this._queue.find(q => q.type === 'write'))
      this._writer = fs.createWriteStream(this._path + '.tmp');
    this._reader = rl.createInterface(fs.createReadStream(this._path));
    this._reader?.on('line', (line: string) => {
      this._waiter && this._reader?.pause();
      let json: any;
      try {
        json = JSON.parse(line);
      } catch(_) {}
      for (let i = 0; i < this._queue.length; i++) {
        const q = this._queue[i];
        if (q.init) {
          if (q.type === 'read' && q.fn(json || line))
            this._queue.splice(i, 1)[0].res(json || line);
          else if (q.type === 'write' && !q.fn(json || line))
            this._writer?.write(line + '\n');
        }
      }
      this._waiter && this._reader?.resume();
    });
    this._reader?.once('close', () => {
      this._reader = null;
      if (this._writer) {
        this._writer?.close();
        this._writer = null;
        try {
          fs.statSync(this._path + '.tmp');
          fs.renameSync(this._path + '.tmp', this._path);
        } catch(_) {}
      }
      for (let i = 0; i < this._queue.length; i++) {
        const q = this._queue[i];
        if (q.init) this._queue.splice(i, 1)[0].res(void 0);
        else q.init = true;
      }
      this._running = false;
      this._queue.length && this._runner();
    });
  }
}