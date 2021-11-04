```ts
class Database {
  constructor(path?: string = 'db');
  put(data: any): Promise<void>;
  find(fn: Function): Promise<any>;
  remove(fn: Function): Promise<void>;
}
```