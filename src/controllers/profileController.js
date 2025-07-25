const User = require('../models/userModel'); // giả sử bạn có model

exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId; // đã gán từ middleware auth
    const user = await User.findById(userId).select('-password'); // bỏ mật khẩu
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};





