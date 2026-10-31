const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb+srv://Connect-App:Dhanush123@cluster0.2b30sey.mongodb.net/connect_db?retryWrites=true&w=majority';
    console.log('Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(connStr, {
      maxPoolSize: 25,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

