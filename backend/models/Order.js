const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
});

const OrderSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    businessId: { type: String },
    memberName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAddress: { type: String },
    pickupLocation: { type: String },
    dropLocation: { type: String },
    type: { type: String, enum: ['Order', 'Booking'], default: 'Order' },
    status: {
      type: String,
      enum: ['Pending', 'Preparing', 'Assigned', 'Out for Delivery', 'Delivered', 'Cancelled', 'Confirmed'],
      default: 'Pending',
    },
    finalAmount: { type: Number, required: true },
    items: [OrderItemSchema],
    candidateEmail: { type: String },
    candidateResume: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ businessId: 1 });

module.exports = mongoose.model('Order', OrderSchema);

