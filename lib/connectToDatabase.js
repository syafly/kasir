// lib/connectToDatabase.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL; // shared connection string
const dbName = process.env.DB_NAME || 'kasir_app';

let cachedClient = null;
let cachedDb = null;

/**
 * Returns a cached MongoClient and database handle for the shared database.
 * This is used for operations that are not tenant‑specific, such as login
 * and global tenant management.
 */
export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;
  return { client, db };
}
