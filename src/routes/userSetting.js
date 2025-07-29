// routes/userSettings.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Mongoose model

// Middleware xác thực JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// GET /api/user/settings - Lấy settings của user
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Default settings nếu user chưa có
    const defaultSettings = {
      theme: 'light',
      language: 'en',
      currency: 'USD',
      notifications: {
        email: true,
        push: false,
        priceAlerts: true,
        newsUpdates: false
      },
      displayPreferences: {
        defaultPairs: ['USD/VND', 'EUR/USD', 'GBP/USD'],
        refreshInterval: 30,
        showChart: true,
        decimalPlaces: 4
      },
      privacy: {
        dataCollection: false,
        analytics: true
      }
    };

    const userSettings = user.settings || defaultSettings;

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      settings: userSettings
    });

  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/settings - Cập nhật settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ error: 'Settings data required' });
    }

    // Validate settings structure
    const validatedSettings = validateSettings(settings);
    if (!validatedSettings.isValid) {
      return res.status(400).json({ error: validatedSettings.error });
    }

    // Cập nhật user settings
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          settings: settings,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity (optional)
    await logUserActivity(req.user.userId, 'settings_updated', {
      theme: settings.theme,
      language: settings.language
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/user/settings - Reset về default
router.delete('/settings', authenticateToken, async (req, res) => {
  try {
    const defaultSettings = {
      theme: 'light',
      language: 'en',
      currency: 'USD',
      notifications: {
        email: true,
        push: false,
        priceAlerts: true,
        newsUpdates: false
      },
      displayPreferences: {
        defaultPairs: ['USD/VND', 'EUR/USD', 'GBP/USD'],
        refreshInterval: 30,
        showChart: true,
        decimalPlaces: 4
      },
      privacy: {
        dataCollection: false,
        analytics: true
      }
    };

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          settings: defaultSettings,
          updatedAt: new Date()
        }
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Settings reset to default',
      settings: user.settings
    });

  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validation function
function validateSettings(settings) {
  try {
    // Validate theme
    if (!['light', 'dark'].includes(settings.theme)) {
      return { isValid: false, error: 'Invalid theme value' };
    }

    // Validate language
    const validLanguages = ['en', 'vi', 'ja', 'ko'];
    if (!validLanguages.includes(settings.language)) {
      return { isValid: false, error: 'Invalid language value' };
    }

    // Validate currency
    const validCurrencies = ['USD', 'EUR', 'VND', 'JPY', 'GBP'];
    if (!validCurrencies.includes(settings.currency)) {
      return { isValid: false, error: 'Invalid currency value' };
    }

    // Validate refresh interval
    const validIntervals = [10, 30, 60, 300];
    if (!validIntervals.includes(settings.displayPreferences?.refreshInterval)) {
      return { isValid: false, error: 'Invalid refresh interval' };
    }

    // Validate decimal places
    const decimalPlaces = settings.displayPreferences?.decimalPlaces;
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 2 || decimalPlaces > 8) {
      return { isValid: false, error: 'Decimal places must be between 2 and 8' };
    }

    // Validate currency pairs
    const validPairs = [
      'USD/VND', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/GBP',
      'AUD/USD', 'USD/CAD', 'USD/CHF', 'EUR/JPY', 'GBP/JPY'
    ];
    const selectedPairs = settings.displayPreferences?.defaultPairs || [];
    
    for (const pair of selectedPairs) {
      if (!validPairs.includes(pair)) {
        return { isValid: false, error: `Invalid currency pair: ${pair}` };
      }
    }

    if (selectedPairs.length > 10) {
      return { isValid: false, error: 'Maximum 10 currency pairs allowed' };
    }

    return { isValid: true };

  } catch (error) {
    return { isValid: false, error: 'Invalid settings format' };
  }
}

// Log user activity (optional)
async function logUserActivity(userId, action, details = {}) {
  try {
    const ActivityLog = require('../models/ActivityLog');
    
    await ActivityLog.create({
      userId,
      action,
      details,
      timestamp: new Date(),
      ipAddress: req.ip || 'unknown'
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

module.exports = router;

// ============================================
// models/User.js (Mongoose Schema)
// ============================================

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    language: {
      type: String,
      enum: ['en', 'vi', 'ja', 'ko'],
      default: 'en'
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'VND', 'JPY', 'GBP'],
      default: 'USD'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      priceAlerts: { type: Boolean, default: true },
      newsUpdates: { type: Boolean, default: false }
    },
    displayPreferences: {
      defaultPairs: [{
        type: String,
        enum: ['USD/VND', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/GBP', 
               'AUD/USD', 'USD/CAD', 'USD/CHF', 'EUR/JPY', 'GBP/JPY']
      }],
      refreshInterval: {
        type: Number,
        enum: [10, 30, 60, 300],
        default: 30
      },
      showChart: { type: Boolean, default: true },
      decimalPlaces: {
        type: Number,
        min: 2,
        max: 8,
        default: 4
      }
    },
    privacy: {
      dataCollection: { type: Boolean, default: false },
      analytics: { type: Boolean, default: true }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware để tự động update updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);

// ============================================
// models/ActivityLog.js (Optional - để log activities)
// ============================================

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'settings_updated', 'password_changed', 'profile_updated']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: 'unknown'
  },
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index cho performance
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

// ============================================
// app.js hoặc server.js (Main app setup)
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fx-dashboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
const userSettingsRoutes = require('./routes/userSettings');
const authRoutes = require('./routes/auth');

app.use('/api/user', userSettingsRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint  
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      details: err.message 
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      error: 'Invalid ID format' 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// ============================================
// .env file example
// ============================================

/*
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fx-dashboard
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-complex
FRONTEND_URL=http://localhost:3000

# For production:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fx-dashboard
# FRONTEND_URL=https://your-frontend-domain.com
*/

// ============================================
// package.json dependencies
// ============================================

/*
{
  "name": "fx-dashboard-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "dotenv": "^16.3.1",
    "validator": "^13.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.4"
  }
}
*/