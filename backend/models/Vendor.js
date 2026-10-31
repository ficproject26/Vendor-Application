const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    membershipPlan: { type: String, enum: ['Silver', 'Gold', 'Diamond'], default: 'Silver' },
    primaryBusinessId: { type: String, default: '' },
    businesses: [
      {
        businessName: { type: String, required: true },
        vendorType: { type: String, required: true },
        category: { type: String },
        subcategory: { type: String },
        address: { type: String, default: '' },
        pinCode: { type: String, default: '' },
        phone: { type: String, default: '' },
        logo: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', VendorSchema);
