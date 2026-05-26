import { MongoClient } from 'mongodb';
import { hashPassword } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

export async function initializeSystem() {
  const uri = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME || 'kasir_app';
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);
  
  try {
    console.log('🚀 Initializing Multi-tenant System...');
    
    // Check if already initialized
    const existingTenants = await db.collection('tenants').countDocuments();
    if (existingTenants > 0) {
      console.log('✅ System already initialized');
      await client.close();
      return { success: true, message: 'Already initialized' };
    }
    
    // 1. Create first tenant (Demo Tenant)
    const demoTenantId = uuidv4();
    const demoTenant = {
      id: demoTenantId,
      name: 'Demo Tenant',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('tenants').insertOne(demoTenant);
    console.log('✅ Created Demo Tenant:', demoTenantId);
    
    // 2. Create Super Admin user
    const superAdminPassword = await hashPassword('SuperAdmin123!');
    const superAdmin = {
      id: uuidv4(),
      username: 'superadmin',
      password: superAdminPassword,
      name: 'Super Administrator',
      role: 'superadmin',
      tenantId: null, // super admin tidak terikat tenant
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('users').insertOne(superAdmin);
    console.log('✅ Created Super Admin user');
    console.log('   Username: superadmin');
    console.log('   Password: SuperAdmin123!');
    
    // 3. Create Demo Admin for first tenant
    const demoAdminPassword = await hashPassword('Admin123!');
    const demoAdmin = {
      id: uuidv4(),
      username: 'admin',
      password: demoAdminPassword,
      name: 'Demo Admin',
      role: 'admin',
      tenantId: demoTenantId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('users').insertOne(demoAdmin);
    console.log('✅ Created Demo Admin user');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    
    // 4. Create Demo User (kasir) for first tenant
    const demoUserPassword = await hashPassword('User123!');
    const demoUser = {
      id: uuidv4(),
      username: 'kasir',
      password: demoUserPassword,
      name: 'Demo Kasir',
      role: 'user',
      tenantId: demoTenantId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('users').insertOne(demoUser);
    console.log('✅ Created Demo User (kasir)');
    console.log('   Username: kasir');
    console.log('   Password: User123!');
    
    // 5. Migrate existing data to Demo Tenant
    const collections = ['products', 'transactions', 'vouchers', 'monthly_closings'];
    
    for (const collectionName of collections) {
      const result = await db.collection(collectionName).updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: demoTenantId } }
      );
      console.log(`✅ Migrated ${result.modifiedCount} documents in ${collectionName}`);
    }
    
    console.log('\n🎉 System initialization complete!');
    console.log('\n📝 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Super Admin:');
    console.log('  Username: superadmin');
    console.log('  Password: SuperAdmin123!');
    console.log('\nDemo Admin:');
    console.log('  Username: admin');
    console.log('  Password: Admin123!');
    console.log('\nDemo User (Kasir):');
    console.log('  Username: kasir');
    console.log('  Password: User123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await client.close();
    return {
      success: true,
      credentials: {
        superadmin: { username: 'superadmin', password: 'SuperAdmin123!' },
        admin: { username: 'admin', password: 'Admin123!' },
        user: { username: 'kasir', password: 'User123!' }
      }
    };
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
    await client.close();
    throw error;
  }
}
