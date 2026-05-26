import { MongoClient } from 'mongodb';
import { tenantConfig } from './tenant-config.js';

const clientCache = {};

export async function connectToTenantDatabase(tenantId) {
  const cfg = tenantConfig[tenantId];
  // If not found in static config, try to fetch from shared DB
  let finalCfg = cfg;
  if (!finalCfg) {
    // Attempt to load from the shared tenants collection
    const { db: sharedDb } = await import('./connectToDatabase.js').then(m => m.connectToDatabase());
    const tenantDoc = await sharedDb.collection('tenants').findOne({ id: tenantId });
    if (tenantDoc) {
      const defaultUri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
      const defaultDbName = `${tenantId}_db`;
      finalCfg = {
        uri: tenantDoc.uri || defaultUri,
        dbName: tenantDoc.dbName || defaultDbName,
      };
      // Cache for future calls
      tenantConfig[tenantId] = finalCfg;
    }
  }
  if (!finalCfg) {
    throw new Error(`Konfigurasi DB tidak ditemukan untuk tenant "${tenantId}"`);
  }
  const { uri, dbName } = finalCfg;

  if (!clientCache[tenantId]) {
    const client = new MongoClient(uri);
    await client.connect();
    clientCache[tenantId] = client;
  }
  const db = clientCache[tenantId].db(dbName);
  console.log(`[DB] Menyambungkan ke ${dbName}`);
  return { db };
}
