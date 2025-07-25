const express = require('express');
const router = express.Router();
const { saveUser, updateUser } = require('../services/userService');
const User = require('../models/User');
const { loginUser } = require('../controllers/userController');

// ✅ [POST] Tạo người dùng mới
router.post('/save', async (req, res) => {
  try {
    const result = await saveUser(req.body);

    if (result.success) {
      return res.status(201).json({ success: true, user: result.user });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('❌ Lỗi khi lưu user:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ✅ [PUT] Cập nhật người dùng qua email
router.put('/update', async (req, res) => {
  const { email, updates } = req.body;

  if (!email || !updates || typeof updates !== 'object') {
    return res.status(400).json({ success: false, message: 'Thiếu email hoặc dữ liệu cập nhật không hợp lệ' });
  }

  try {
    const result = await updateUser(email, updates);

    if (result.success) {
      return res.json({ success: true, user: result.user });
    } else {
      return res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật user:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ✅ [PUT] Cập nhật preferences
router.put('/preferences', async (req, res) => {
  const { email, preferences } = req.body;

  if (!email || !preferences) {
    return res.status(400).json({ success: false, message: 'Thiếu email hoặc preferences' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { preferences },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    }

    res.json({ success: true, message: 'Cập nhật thành công', preferences: user.preferences });
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật preferences:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ✅ [POST] Đăng ký (sử dụng email)
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const newUser = new User({ name, email, password });
    await newUser.save();
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// ✅ [POST] Đăng nhập (chỉ còn 1 lần định nghĩa)
router.post('/login', loginUser);

module.exports = router;
