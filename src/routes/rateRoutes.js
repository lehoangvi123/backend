const express = require('express');
const router = express.Router();
const Rate = require('../models/rateModel');

// Middleware để log requests (optional)
const logRequest = (req, res, next) => {
  console.log(`📊 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
};

router.use(logRequest);

// ==================== EXISTING ROUTES ====================

// Lấy tỷ giá mới nhất
router.get('/current', async (req, res) => {
  try {
    const rateDoc = await Rate.findOne().sort({ createdAt: -1 });
    if (!rateDoc) return res.status(404).json({ error: 'No rates found' });
    res.json({ success: true, rates: rateDoc.rate });
  } catch (err) {
    console.error('❌ current rate error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lịch sử tỷ giá (filter theo from, to date)
router.get('/history', async (req, res) => {
  const { from, to } = req.query;

  try {
    const query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const history = await Rate.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: history });
  } catch (err) {
    console.error('❌ History query error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// Chuyển đổi tiền tệ đơn giản
router.post('/convert', async (req, res) => {
  const { from, to, amount } = req.body;
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const rateDoc = await Rate.findOne().sort({ createdAt: -1 });
    if (!rateDoc) return res.status(404).json({ error: 'No rates found' });

    const rates = rateDoc.rate;
    const fromRate = rates[from];
    const toRate = rates[to];

    if (!fromRate || !toRate) {
      return res.status(400).json({ error: 'Invalid currency code' });
    }

    const result = (amount / fromRate) * toRate;
    res.json({ success: true, from, to, amount, result });
  } catch (err) {
    console.error('❌ convert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chuyển đổi tiền tệ qua một đồng trung gian (cross rate)
router.post('/convert-cross', async (req, res) => {
  const { base, quote, via } = req.body;

  if (!base || !quote || !via) {
    return res.status(400).json({ error: 'Missing base, quote, or via currency' });
  }

  try {
    const rateDoc = await Rate.findOne().sort({ createdAt: -1 });
    if (!rateDoc) return res.status(404).json({ error: 'No rates available' });

    const rates = rateDoc.rate;
    const baseVia = rates[base];
    const quoteVia = rates[quote];
    const viaRate = rates[via];

    if (!baseVia || !quoteVia || !viaRate) {
      return res.status(400).json({ error: 'Invalid currency code' });
    }

    // Công thức: base/quote = base/via / quote/via
    const crossRate = (baseVia / viaRate) / (quoteVia / viaRate);
    res.json({ success: true, base, quote, via, rate: crossRate });
  } catch (err) {
    console.error('❌ convert-cross error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== NEW ROUTES FOR SAVERATEFORM ====================

// Validation helper function
const validateRates = (rates) => {
  const allowedCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD',
    'KRW', 'THB', 'VND', 'MYR', 'IDR', 'PHP', 'BGN', 'BRL'
  ];

  // Check if rates is an object
  if (!rates || typeof rates !== 'object') {
    return { valid: false, message: 'Rates must be an object' };
  }

  const currencies = Object.keys(rates);
  
  // Check minimum currencies
  if (currencies.length === 0) {
    return { valid: false, message: 'At least one currency rate is required' };
  }

  // Check maximum currencies
  if (currencies.length > 15) {
    return { valid: false, message: 'Maximum 15 currencies allowed' };
  }

  // Validate each currency and rate
  for (const [currency, rate] of Object.entries(rates)) {
    // Check currency code
    if (!allowedCurrencies.includes(currency)) {
      return { valid: false, message: `Invalid currency code: ${currency}` };
    }

    // Check rate value
    if (typeof rate !== 'number' || rate <= 0 || isNaN(rate)) {
      return { valid: false, message: `Invalid rate for ${currency}: ${rate}` };
    }

    // Check rate range (reasonable values)
    if (rate > 1000000 || rate < 0.000001) {
      return { valid: false, message: `Rate out of range for ${currency}: ${rate}` };
    }
  }

  return { valid: true };
};

// POST /api/rates/save - Lưu tỷ giá mới (cho SaveRateForm)
router.post('/save', async (req, res) => {
  try {
    const rates = req.body;
    console.log('💾 Saving rates:', rates);

    // Validation
    const validation = validateRates(rates);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Tạo document mới
    const newRate = new Rate({
      rate: rates,
      source: 'manual_input',
      metadata: {
        currencyCount: Object.keys(rates).length,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    // Lưu vào database
    const savedRate = await newRate.save();
    console.log('✅ Rates saved successfully:', savedRate._id);

    res.json({
      success: true,
      message: 'Tỷ giá đã được lưu thành công',
      data: {
        id: savedRate._id,
        timestamp: savedRate.createdAt,
        currencyCount: Object.keys(rates).length
      }
    });

  } catch (error) {
    console.error('❌ Error saving rates:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lưu tỷ giá'
    });
  }
});

// PUT /api/rates/update/:id - Cập nhật tỷ giá theo ID
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rates = req.body;

    // Validation
    const validation = validateRates(rates);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Tìm và cập nhật
    const updatedRate = await Rate.findByIdAndUpdate(
      id,
      {
        rate: rates,
        updatedAt: new Date(),
        metadata: {
          currencyCount: Object.keys(rates).length,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress,
          lastModified: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedRate) {
      return res.status(404).json({
        success: false,
        message: 'Rate record not found'
      });
    }

    res.json({
      success: true,
      message: 'Tỷ giá đã được cập nhật',
      data: updatedRate
    });

  } catch (error) {
    console.error('❌ Error updating rates:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật tỷ giá'
    });
  }
});

// DELETE /api/rates/delete/:id - Xóa tỷ giá theo ID
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRate = await Rate.findByIdAndDelete(id);
    
    if (!deletedRate) {
      return res.status(404).json({
        success: false,
        message: 'Rate record not found'
      });
    }

    res.json({
      success: true,
      message: 'Tỷ giá đã được xóa',
      data: {
        id: deletedRate._id,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error deleting rate:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tỷ giá'
    });
  }
});

// GET /api/rates/currencies - Lấy danh sách currencies được hỗ trợ
router.get('/currencies', (req, res) => {
  const supportedCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
    { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', flag: '🇧🇬' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' }
  ];

  res.json({
    success: true,
    data: supportedCurrencies,
    total: supportedCurrencies.length
  });
});

// GET /api/rates/stats - Thống kê tỷ giá
router.get('/stats', async (req, res) => {
  try {
    const totalRecords = await Rate.countDocuments();
    const latestRate = await Rate.findOne().sort({ createdAt: -1 });
    const oldestRate = await Rate.findOne().sort({ createdAt: 1 });

    // Lấy thống kê theo ngày (7 ngày gần nhất)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRecords = await Rate.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Currencies được sử dụng nhiều nhất
    const pipeline = [
      { $unwind: { path: "$rate", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$rate.k", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ];

    const popularCurrencies = await Rate.aggregate([
      {
        $project: {
          currencies: { $objectToArray: "$rate" }
        }
      },
      { $unwind: "$currencies" },
      {
        $group: {
          _id: "$currencies.k",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        totalRecords,
        recentRecords,
        latestUpdate: latestRate?.createdAt,
        oldestRecord: oldestRate?.createdAt,
        popularCurrencies,
        availableCurrencies: latestRate ? Object.keys(latestRate.rate).length : 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    });
  }
});

// GET /api/rates/validate - Validate tỷ giá trước khi lưu
router.post('/validate', (req, res) => {
  try {
    const rates = req.body;
    const validation = validateRates(rates);

    if (validation.valid) {
      res.json({
        success: true,
        message: 'Dữ liệu tỷ giá hợp lệ',
        data: {
          currencyCount: Object.keys(rates).length,
          currencies: Object.keys(rates)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: validation.message
      });
    }

  } catch (error) {
    console.error('❌ Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi validate dữ liệu'
    });
  }
});

// ==================== ERROR HANDLING ====================

// Global error handler cho routes
router.use((error, req, res, next) => {
  console.error('🚨 Route Error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}); 

// Thêm vào rateRoutes.js

// ==================== HISTORY ENDPOINTS FOR HISTORYCHART ====================

// GET /api/rates/history - Enhanced history endpoint
router.get('/history', async (req, res) => {
  try {
    const { 
      period = 'week', 
      limit = 50, 
      page = 1,
      currency,
      sortBy = 'date',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    console.log(`📊 History request: period=${period}, limit=${limit}`);

    // Build date filter based on period
    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      // Custom date range
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Predefined periods
      switch (period) {
        case 'hour':
          dateFilter = {
            createdAt: { $gte: new Date(now - 60 * 60 * 1000) }
          };
          break;
        case 'day':
          dateFilter = {
            createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) }
          };
          break;
        case 'week':
          dateFilter = {
            createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) }
          };
          break;
        case 'month':
          dateFilter = {
            createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) }
          };
          break;
        case 'quarter':
          dateFilter = {
            createdAt: { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) }
          };
          break;
        case 'year':
          dateFilter = {
            createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) }
          };
          break;
        case 'all':
        default:
          // No date filter for 'all'
          break;
      }
    }

    // Add currency filter if specified
    let query = { ...dateFilter };
    if (currency) {
      query[`rate.${currency}`] = { $exists: true };
    }

    // Build sort object
    let sortObject = {};
    if (sortBy === 'date') {
      sortObject.createdAt = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortObject.createdAt = -1; // Default to date desc
    }

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const [data, total] = await Promise.all([
      Rate.find(query)
        .sort(sortObject)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Use lean for better performance
      Rate.countDocuments(query)
    ]);

    // Sort by specific currency rate if requested
    if (sortBy === 'rate' && currency) {
      data.sort((a, b) => {
        const rateA = a.rate[currency] || 0;
        const rateB = b.rate[currency] || 0;
        return sortOrder === 'asc' ? rateA - rateB : rateB - rateA;
      });
    }

    // Format response
    const formattedData = data.map(item => ({
      id: item._id,
      rate: item.rate,
      createdAt: item.createdAt,
      source: item.source || 'manual_input',
      metadata: item.metadata
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + data.length < total,
        hasPrev: parseInt(page) > 1
      },
      meta: {
        period,
        currency,
        sortBy,
        sortOrder,
        dateRange: dateFilter.createdAt ? {
          from: dateFilter.createdAt.$gte,
          to: dateFilter.createdAt.$lte
        } : null
      }
    });

  } catch (error) {
    console.error('❌ History query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
      message: error.message
    });
  }
});

// GET /api/rates/history/stats - Statistics for specific period and currency
router.get('/history/stats', async (req, res) => {
  try {
    const { 
      period = 'week', 
      currency = 'USD',
      startDate,
      endDate
    } = req.query;

    console.log(`📈 Stats request: currency=${currency}, period=${period}`);

    // Build date filter
    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      switch (period) {
        case 'day':
          dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
          break;
        case 'week':
          dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
          break;
        case 'month':
          dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
          break;
        case 'year':
          dateFilter = { createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } };
          break;
      }
    }

    // Aggregate statistics
    const pipeline = [
      {
        $match: {
          ...dateFilter,
          [`rate.${currency}`]: { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          rate: `$rate.${currency}`,
          createdAt: 1
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          min: { $min: '$rate' },
          max: { $max: '$rate' },
          avg: { $avg: '$rate' },
          first: { $first: '$rate' },
          last: { $last: '$rate' },
          rates: { $push: '$rate' }
        }
      }
    ];

    const result = await Rate.aggregate(pipeline);
    
    if (!result || result.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No data found for the specified period and currency'
      });
    }

    const stats = result[0];
    
    // Calculate additional statistics
    const rates = stats.rates.sort((a, b) => a - b);
    const median = rates.length % 2 === 0 
      ? (rates[rates.length / 2 - 1] + rates[rates.length / 2]) / 2
      : rates[Math.floor(rates.length / 2)];

    // Calculate standard deviation
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - stats.avg, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);

    // Calculate change percentage
    const change = stats.last && stats.first 
      ? ((stats.last - stats.first) / stats.first) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        currency,
        period,
        count: stats.count,
        latest: stats.last,
        oldest: stats.first,
        min: stats.min,
        max: stats.max,
        avg: stats.avg,
        median,
        stdDev,
        change,
        range: stats.max - stats.min,
        volatility: (stdDev / stats.avg) * 100 // Coefficient of variation
      }
    });

  } catch (error) {
    console.error('❌ Stats calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate statistics',
      message: error.message
    });
  }
});

// GET /api/rates/history/chart-data - Optimized data for charts
router.get('/history/chart-data', async (req, res) => {
  try {
    const { 
      period = 'week',
      currency = 'USD',
      interval = 'hour', // hour, day, week
      limit = 100
    } = req.query;

    console.log(`📊 Chart data request: ${currency} for ${period} with ${interval} intervals`);

    // Calculate date range
    const now = new Date();
    let dateFilter = {};
    
    switch (period) {
      case 'day':
        dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case 'week':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case 'year':
        dateFilter = { createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
    }

    // Build aggregation pipeline for time-based grouping
    let timeGrouping = {};
    switch (interval) {
      case 'hour':
        timeGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'day':
        timeGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'week':
        timeGrouping = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      default:
        timeGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
    }

    const pipeline = [
      {
        $match: {
          ...dateFilter,
          [`rate.${currency}`]: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: timeGrouping,
          avgRate: { $avg: `$rate.${currency}` },
          minRate: { $min: `$rate.${currency}` },
          maxRate: { $max: `$rate.${currency}` },
          count: { $sum: 1 },
          timestamp: { $first: '$createdAt' }
        }
      },
      {
        $sort: { timestamp: 1 }
      },
      {
        $limit: parseInt(limit)
      }
    ];

    const chartData = await Rate.aggregate(pipeline);

    // Format data for frontend charts
    const formattedData = chartData.map(item => ({
      timestamp: item.timestamp,
      date: item.timestamp.toISOString().split('T')[0],
      time: item.timestamp.toTimeString().split(' ')[0],
      rate: parseFloat(item.avgRate.toFixed(6)),
      min: parseFloat(item.minRate.toFixed(6)),
      max: parseFloat(item.maxRate.toFixed(6)),
      count: item.count
    }));

    res.json({
      success: true,
      data: {
        currency,
        period,
        interval,
        points: formattedData,
        summary: {
          totalPoints: formattedData.length,
          dateRange: {
            from: formattedData[0]?.timestamp,
            to: formattedData[formattedData.length - 1]?.timestamp
          },
          rateRange: {
            min: Math.min(...formattedData.map(p => p.min)),
            max: Math.max(...formattedData.map(p => p.max))
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Chart data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data',
      message: error.message
    });
  }
});

// GET /api/rates/history/currencies - Get all currencies with data in period
router.get('/history/currencies', async (req, res) => {
  try {
    const { period = 'week' } = req.query;

    // Calculate date range
    const now = new Date();
    let dateFilter = {};
    
    switch (period) {
      case 'day':
        dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case 'week':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case 'year':
        dateFilter = { createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = {};
    }

    // Get all rates in period and extract currencies
    const rates = await Rate.find(dateFilter).select('rate').lean();
    
    // Count occurrences of each currency
    const currencyCount = {};
    rates.forEach(rateDoc => {
      if (rateDoc.rate) {
        Object.keys(rateDoc.rate).forEach(currency => {
          currencyCount[currency] = (currencyCount[currency] || 0) + 1;
        });
      }
    });

    // Sort by frequency
    const sortedCurrencies = Object.entries(currencyCount)
      .sort(([,a], [,b]) => b - a)
      .map(([currency, count]) => ({ currency, count }));

    res.json({
      success: true,
      data: {
        period,
        currencies: sortedCurrencies,
        total: sortedCurrencies.length,
        totalRecords: rates.length
      }
    });

  } catch (error) {
    console.error('❌ Currencies query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch currencies',
      message: error.message
    });
  }
});

// POST /api/rates/history/compare - Compare multiple currencies
router.post('/history/compare', async (req, res) => {
  try {
    const { 
      currencies = ['USD', 'EUR'], 
      period = 'week',
      startDate,
      endDate
    } = req.body;

    console.log(`🔍 Compare request: ${currencies.join(', ')} for ${period}`);

    // Validate currencies array
    if (!Array.isArray(currencies) || currencies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Currencies must be a non-empty array'
      });
    }

    if (currencies.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 currencies allowed for comparison'
      });
    }

    // Build date filter
    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      switch (period) {
        case 'day':
          dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
          break;
        case 'week':
          dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
          break;
        case 'month':
          dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
          break;
        case 'year':
          dateFilter = { createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } };
          break;
      }
    }

    // Build query to find rates that have at least one of the requested currencies
    const orConditions = currencies.map(currency => ({
      [`rate.${currency}`]: { $exists: true, $ne: null }
    }));

    const query = {
      ...dateFilter,
      $or: orConditions
    };

    // Fetch data
    const rates = await Rate.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Process data for comparison
    const comparisonData = rates.map(rateDoc => {
      const dataPoint = {
        timestamp: rateDoc.createdAt,
        date: rateDoc.createdAt.toISOString().split('T')[0],
        rates: {}
      };

      currencies.forEach(currency => {
        dataPoint.rates[currency] = rateDoc.rate[currency] || null;
      });

      return dataPoint;
    });

    // Calculate statistics for each currency
    const statistics = {};
    currencies.forEach(currency => {
      const values = comparisonData
        .map(point => point.rates[currency])
        .filter(rate => rate !== null);

      if (values.length > 0) {
        const sortedValues = [...values].sort((a, b) => a - b);
        statistics[currency] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          median: sortedValues.length % 2 === 0
            ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
            : sortedValues[Math.floor(sortedValues.length / 2)],
          latest: values[0],
          oldest: values[values.length - 1],
          change: values.length > 1 ? ((values[0] - values[values.length - 1]) / values[values.length - 1]) * 100 : 0
        };
      } else {
        statistics[currency] = null;
      }
    });

    res.json({
      success: true,
      data: {
        currencies,
        period,
        points: comparisonData,
        statistics,
        meta: {
          totalPoints: comparisonData.length,
          dateRange: comparisonData.length > 0 ? {
            from: comparisonData[comparisonData.length - 1].timestamp,
            to: comparisonData[0].timestamp
          } : null
        }
      }
    });

  } catch (error) {
    console.error('❌ Compare currencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare currencies',
      message: error.message
    });
  }
});

// DELETE /api/rates/history/cleanup - Clean up old records
router.delete('/history/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 365 } = req.query;

    console.log(`🧹 Cleaning up records older than ${daysToKeep} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysToKeep));

    const result = await Rate.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} old records`,
      data: {
        deletedCount: result.deletedCount,
        cutoffDate,
        daysKept: parseInt(daysToKeep)
      }
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup old records',
      message: error.message
    });
  }
}); 

// Thêm vào cuối file rateRoutes.js (sau route convert-cross)

// ==================== HISTORY ROUTES ====================

// GET /api/rates/history - Lấy lịch sử tỷ giá (Enhanced)
router.get('/history', async (req, res) => {
  try {
    const { 
      period = 'week', 
      limit = 50, 
      page = 1 
    } = req.query;

    console.log(`📊 History request: period=${period}, limit=${limit}`);

    // Build date filter based on period
    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'hour':
        dateFilter = {
          createdAt: { $gte: new Date(now - 60 * 60 * 1000) }
        };
        break;
      case 'day':
        dateFilter = {
          createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) }
        };
        break;
      case 'week':
        dateFilter = {
          createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) }
        };
        break;
      case 'month':
        dateFilter = {
          createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) }
        };
        break;
      case 'year':
        dateFilter = {
          createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) }
        };
        break;
      case 'all':
      default:
        // No date filter for 'all'
        break;
    }

    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [data, total] = await Promise.all([
      Rate.find(dateFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Rate.countDocuments(dateFilter)
    ]);

    console.log(`✅ Found ${data.length} records for period ${period}`);

    // Format response
    const formattedData = data.map(item => ({
      id: item._id,
      rate: item.rate,
      createdAt: item.createdAt,
      source: item.source || 'manual_input',
      metadata: item.metadata
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      meta: {
        period,
        dateFilter: dateFilter.createdAt ? {
          from: dateFilter.createdAt.$gte,
          to: dateFilter.createdAt.$lte || now
        } : null
      }
    });

  } catch (error) {
    console.error('❌ History query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
      message: error.message
    });
  }
});

// GET /api/history/:period - Fallback route cho compatibility
router.get('/history/:period', async (req, res) => {
  try {
    const { period } = req.params;
    console.log(`📊 Fallback history request: ${period}`);

    // Redirect to main history route
    const query = new URLSearchParams({
      period: period,
      limit: '50'
    }).toString();

    // Forward to main history route
    const newReq = { ...req, query: { period, limit: 50 } };
    return router.handle(newReq, res);

  } catch (error) {
    console.error('❌ Fallback history error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch history',
      message: error.message 
    });
  }
});

// ==================== DEBUG ROUTES ====================

// GET /api/rates/debug - Debug information
router.get('/debug', async (req, res) => {
  try {
    const totalRecords = await Rate.countDocuments();
    const latestRecord = await Rate.findOne().sort({ createdAt: -1 });
    const oldestRecord = await Rate.findOne().sort({ createdAt: 1 });

    // Sample of currencies available
    const sampleRates = await Rate.findOne().sort({ createdAt: -1 });
    const availableCurrencies = sampleRates ? Object.keys(sampleRates.rate || {}) : [];

    res.json({
      success: true,
      debug: {
        totalRecords,
        latestRecord: latestRecord ? {
          id: latestRecord._id,
          date: latestRecord.createdAt,
          currencyCount: Object.keys(latestRecord.rate || {}).length
        } : null,
        oldestRecord: oldestRecord ? {
          id: oldestRecord._id,
          date: oldestRecord.createdAt
        } : null,
        availableCurrencies,
        sampleEndpoints: [
          '/api/rates/current',
          '/api/rates/history?period=week',
          '/api/rates/save (POST)',
          '/api/rates/debug'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      message: error.message
    });
  }
});

// ==================== DATA SEEDING ROUTE (DEVELOPMENT ONLY) ====================

// POST /api/rates/seed - Tạo sample data cho testing
router.post('/seed', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Seeding not allowed in production' });
    }

    console.log('🌱 Seeding sample data...');

    const sampleCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'VND'];
    const now = new Date();
    const sampleData = [];

    // Create 10 sample records over the past week
    for (let i = 0; i < 10; i++) {
      const date = new Date(now - (i * 24 * 60 * 60 * 1000)); // Each day back
      
      const rates = {};
      sampleCurrencies.forEach(currency => {
        // Generate realistic exchange rates
        const baseRates = {
          USD: 1.0,
          EUR: 0.85 + (Math.random() * 0.1 - 0.05),
          GBP: 0.75 + (Math.random() * 0.1 - 0.05),
          JPY: 110 + (Math.random() * 20 - 10),
          AUD: 1.35 + (Math.random() * 0.2 - 0.1),
          VND: 24000 + (Math.random() * 2000 - 1000)
        };
        rates[currency] = baseRates[currency];
      });

      sampleData.push({
        rate: rates,
        createdAt: date,
        source: 'seeded_data',
        metadata: {
          currencyCount: sampleCurrencies.length,
          note: `Sample data ${i + 1}`
        }
      });
    }

    // Insert sample data
    const inserted = await Rate.insertMany(sampleData);
    
    console.log(`✅ Seeded ${inserted.length} sample records`);

    res.json({
      success: true,
      message: `Seeded ${inserted.length} sample records`,
      data: {
        recordsCreated: inserted.length,
        currencies: sampleCurrencies,
        dateRange: {
          from: sampleData[sampleData.length - 1].createdAt,
          to: sampleData[0].createdAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({
      success: false,
      error: 'Seeding failed',
      message: error.message
    });
  }
});

module.exports = router;