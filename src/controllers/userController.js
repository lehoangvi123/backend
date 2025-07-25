// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Email không tồn tại' });

    // 2. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Sai mật khẩu' });

    // 3. Tạo JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'default_secret', {
      expiresIn: '1d',
    });

   res.status(201).json({
  token,
  user: {
    name: user.name,
    email: user.email,
    role: user.role,
    // thêm gì cũng được, miễn client cần
  }
});

  } catch (err) {
    console.error('❌ Lỗi khi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
  }
};
