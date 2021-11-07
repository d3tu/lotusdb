```ts
import { Database } from 'lotusdb';
const db = new Database('data.db'); // path to database file
(async () => {
  await db.put({ a: 'b' }) // Promise<void>
  const data = await db.find(o => o.a === 'b') // Promise<any>
  console.log(data); // Output: { a: 'b' }
  await db.remove(o => o.a === 'b'); // Promise<void>
})();
```