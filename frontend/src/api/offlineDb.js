import Dexie from 'dexie';

export const db = new Dexie('MarthingtonOffline');

// Define tables: 
// 1. products: for price checking offline
// 2. pendingSales: for syncing later
// 3. userSession: for offline login checks
db.version(1).stores({
  products: '_id, name, sellingPrice, stock',
  pendingSales: '++id, data, timestamp',
  userSession: 'id, token, userData'
});