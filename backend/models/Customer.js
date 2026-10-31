const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, required: true },
    ordersCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', CustomerSchema);
