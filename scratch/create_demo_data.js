import { connectToDatabase } from '../lib/connectToDatabase.js';
import { connectToTenantDatabase } from '../lib/connectTenantDatabase.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function main() {
  const { db: sharedDb } = await connectToDatabase();

  // Create demo tenant in shared DB
  const tenantId = uuidv4();
  const tenant = {
    id: tenantId,
    name: 'Demo Tenant',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await sharedDb.collection('tenants').insertOne(tenant);
  console.log('Created tenant', tenant);

  // Create admin user in shared DB (global users collection)
  const adminPassword = 'DemoPass!1';
  const hashed = await bcrypt.hash(adminPassword, 10);
  const adminUser = {
    id: uuidv4(),
    username: 'admin_demo',
    password: hashed,
    name: 'Demo Admin',
    role: 'admin',
    tenantId: tenantId,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await sharedDb.collection('users').insertOne(adminUser);
  console.log('Created admin user', adminUser.username, 'with password', adminPassword);

  // Also create tenant-specific collections (optional)
  const { db: tenantDb } = await connectToTenantDatabase(tenantId);
  // ensure collections exist
  await tenantDb.createCollection('products');
  await tenantDb.createCollection('transactions');
  console.log('Created tenant DB collections');

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
