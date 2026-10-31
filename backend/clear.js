const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const Vendor = require('./models/Vendor');
const Business = require('./models/Business');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Customer = require('./models/Customer');
const DeliveryPartner = require('./models/DeliveryPartner');

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://karthikeyanb25_db_user:pqbZxh0jH0zNGyKf@cluster0.2gix8jn.mongodb.net/?appName=Cluster0';

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB Atlas at:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB Atlas!');

    console.log('Clearing all collections...');
    await Vendor.deleteMany({});
    await Business.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Customer.deleteMany({});
    await DeliveryPartner.deleteMany({});

    console.log('\n🧹 All MongoDB Atlas collections cleared to 0 items!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing MongoDB collections:', err);
    process.exit(1);
  }
}

clearDatabase();
