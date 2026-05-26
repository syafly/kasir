export const tenantConfig = {
  demoTenant: {
    uri: process.env.MONGODB_URI_DEMO || 'mongodb://127.0.0.1:27017',
    dbName: process.env.MONGODB_DB_DEMO || 'kasir_demo',
  },
  // Contoh konfigurasi tenant. Ganti dengan nilai .env Anda.
  // 'demoTenantId': { uri: process.env.MONGODB_URI_DEMO, dbName: 'kasir_demo' },
};
