// models/rateModel.js
const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
  // Rate object - giữ nguyên cấu trúc cũ nhưng thêm validation
  rate: {
    type: Object,
    required: true,
    validate: {
      validator: function(rateObj) {
        // Kiểm tra rate object không rỗng
        if (!rateObj || Object.keys(rateObj).length === 0) {
          return false;
        }

        // Danh sách currencies được phép
        const allowedCurrencies = [
          'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD',
          'KRW', 'THB', 'VND', 'MYR', 'IDR', 'PHP', 'BGN', 'BRL'
        ];

        // Validate từng currency và rate
        for (const [currency, rate] of Object.entries(rateObj)) {
          // Kiểm tra currency code hợp lệ
          if (!allowedCurrencies.includes(currency)) {
            return false;
          }

          // Kiểm tra rate là số và > 0
          if (typeof rate !== 'number' || rate <= 0 || isNaN(rate)) {
            return false;
          }

          // Kiểm tra rate trong phạm vi hợp lý
          if (rate > 1000000 || rate < 0.000001) {
            return false;
          }
        }

        // Kiểm tra số lượng currencies (tối đa 15)
        if (Object.keys(rateObj).length > 15) {
          return false;
        }

        return true;
      },
      message: 'Invalid rate object: must contain valid currency codes with positive numeric rates'
    }
  },

  // Giữ nguyên createdAt
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Thêm index cho performance
  },

  // Thêm các field mới (optional)
  source: {
    type: String,
    enum: ['manual_input', 'api_import', 'scheduled_update', 'admin'],
    default: 'manual_input'
  },

  // Metadata bổ sung (optional)
  metadata: {
    currencyCount: Number,
    userAgent: String,
    ipAddress: String,
    notes: String
  },

  // Thêm updatedAt
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Tự động thêm timestamps
  timestamps: true
});

// ==================== INDEXES ====================

// Index cho queries thường dùng
rateSchema.index({ createdAt: -1 }); // Sắp xếp theo thời gian mới nhất
rateSchema.index({ source: 1 });     // Filter theo source

// ==================== VIRTUAL PROPERTIES ====================

// Virtual để lấy danh sách currencies
rateSchema.virtual('currencies').get(function() {
  return Object.keys(this.rate || {});
});

// Virtual để lấy số lượng currencies
rateSchema.virtual('currencyCount').get(function() {
  return Object.keys(this.rate || {}).length;
});

// ==================== INSTANCE METHODS ====================

// Method để validate currency code
rateSchema.methods.isValidCurrency = function(currencyCode) {
  const allowedCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD',
    'KRW', 'THB', 'VND', 'MYR', 'IDR', 'PHP', 'BGN', 'BRL'
  ];
  return allowedCurrencies.includes(currencyCode);
};

// Method để lấy rate của một currency
rateSchema.methods.getRate = function(currencyCode) {
  return this.rate[currencyCode];
};

// Method để set rate cho một currency
rateSchema.methods.setRate = function(currencyCode, rate) {
  if (!this.isValidCurrency(currencyCode)) {
    throw new Error(`Invalid currency code: ${currencyCode}`);
  }
  
  if (typeof rate !== 'number' || rate <= 0) {
    throw new Error(`Invalid rate for ${currencyCode}: ${rate}`);
  }

  this.rate = this.rate || {};
  this.rate[currencyCode] = rate;
  this.markModified('rate'); // Báo cho Mongoose biết object đã thay đổi
  this.updatedAt = new Date();
};

// Method để convert giữa các currencies
rateSchema.methods.convert = function(fromCurrency, toCurrency, amount) {
  const fromRate = this.getRate(fromCurrency);
  const toRate = this.getRate(toCurrency);
  
  if (!fromRate || !toRate) {
    throw new Error('Currency not found in rates');
  }
  
  // Công thức convert: amount * (toRate / fromRate)
  return (amount / fromRate) * toRate;
};

// Method để format rates cho display
rateSchema.methods.formatRates = function(precision = 4) {
  const formatted = {};
  
  for (const [currency, rate] of Object.entries(this.rate || {})) {
    formatted[currency] = parseFloat(rate.toFixed(precision));
  }
  
  return formatted;
};

// Method để kiểm tra rate có hợp lệ không
rateSchema.methods.validateRate = function(currencyCode) {
  const rate = this.getRate(currencyCode);
  return rate && typeof rate === 'number' && rate > 0 && !isNaN(rate);
};

// ==================== STATIC METHODS ====================

// Static method để lấy rates mới nhất
rateSchema.statics.getLatest = function() {
  return this.findOne().sort({ createdAt: -1 });
};

// Static method để lấy rates theo date range
rateSchema.statics.getByDateRange = function(startDate, endDate) {
  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method để lấy rates có chứa currency cụ thể
rateSchema.statics.getByCurrency = function(currencyCode) {
  return this.find({ [`rate.${currencyCode}`]: { $exists: true } })
    .sort({ createdAt: -1 });
};

// Static method để clean up old records
rateSchema.statics.cleanupOldRecords = function(daysToKeep = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  return this.deleteMany({ createdAt: { $lt: cutoffDate } });
};

// Static method để lấy thống kê
rateSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        latestDate: { $max: '$createdAt' },
        oldestDate: { $min: '$createdAt' }
      }
    }
  ]);
};

// ==================== MIDDLEWARE ====================

// Pre-save middleware để update metadata
rateSchema.pre('save', function(next) {
  // Update metadata nếu có
  if (this.rate && typeof this.rate === 'object') {
    this.metadata = this.metadata || {};
    this.metadata.currencyCount = Object.keys(this.rate).length;
  }
  
  // Ensure updatedAt is current
  this.updatedAt = new Date();
  
  next();
});

// Pre-update middleware
rateSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Post-save middleware để log
rateSchema.post('save', function(doc) {
  console.log(`✅ Rate saved: ${doc._id} with ${Object.keys(doc.rate || {}).length} currencies`);
});

// ==================== ERROR HANDLING ====================

// Handle validation errors
rateSchema.post('save', function(error, doc, next) {
  if (error.name === 'ValidationError') {
    console.error('❌ Rate Validation Error:', error.message);
  }
  next(error);
});

// ==================== HELPER FUNCTIONS ====================

// Static method để validate rate object trước khi save
rateSchema.statics.validateRateObject = function(rateObj) {
  const allowedCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD',
    'KRW', 'THB', 'VND', 'MYR', 'IDR', 'PHP', 'BGN', 'BRL'
  ];

  // Check if rateObj is valid
  if (!rateObj || typeof rateObj !== 'object') {
    return { valid: false, message: 'Rate must be an object' };
  }

  const currencies = Object.keys(rateObj);
  
  // Check minimum currencies
  if (currencies.length === 0) {
    return { valid: false, message: 'At least one currency rate is required' };
  }

  // Check maximum currencies
  if (currencies.length > 15) {
    return { valid: false, message: 'Maximum 15 currencies allowed' };
  }

  // Validate each currency and rate
  for (const [currency, rate] of Object.entries(rateObj)) {
    // Check currency code
    if (!allowedCurrencies.includes(currency)) {
      return { valid: false, message: `Invalid currency code: ${currency}` };
    }

    // Check rate value
    if (typeof rate !== 'number' || rate <= 0 || isNaN(rate)) {
      return { valid: false, message: `Invalid rate for ${currency}: ${rate}` };
    }

    // Check rate range
    if (rate > 1000000 || rate < 0.000001) {
      return { valid: false, message: `Rate out of range for ${currency}: ${rate}` };
    }
  }

  return { valid: true };
};

// Static method để lấy supported currencies
rateSchema.statics.getSupportedCurrencies = function() {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' }
  ];
};

module.exports = mongoose.model('Rate', rateSchema);