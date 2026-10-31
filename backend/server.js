// Authoritative backend service for Multi-Vendor platform is D:\vendor\backend\server.js
// Both the Vendor Website and Vendor Mobile Application share the exact same backend services,
// database records, authentication rules, and business logic.
const path = require('path');
const fs = require('fs');

const websiteBackend = path.resolve('D:/vendor/backend/server.js');
if (fs.existsSync(websiteBackend)) {
  console.log(`[Vendor-Mobile] Bootstrapping shared authoritative backend from ${websiteBackend}...`);
  const backend = require(websiteBackend);
  if (backend && typeof backend.startServer === 'function') {
    backend.startServer();
  }
} else {
  console.error(`[Vendor-Mobile] Error: Authoritative website backend not found at ${websiteBackend}`);
  process.exit(1);
}
