const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    businessId: { type: String },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    category: { type: String, required: true }, // VendorType (e.g. Products, Services, Food, Stay, Travel, Jobs, Daily Needs)
    subCategory: { type: String, default: 'General' },
    itemType: { type: String, default: '' },
    unit: { type: String, default: 'count' },
    stock: { type: Number, default: 0 },
    status: { type: String, enum: ['Available', 'Out of Stock'], default: 'Available' },
    imageUrl: { type: String, default: '' },
    pinCode: { type: String, default: '' },
    foodType: { type: String },
    roomType: { type: String },
    specialization: { type: String },
  },
  { timestamps: true, strict: false }
);

ProductSchema.index({ businessId: 1, createdAt: -1 });
ProductSchema.index({ category: 1 });

module.exports = mongoose.model('Product', ProductSchema);

