const User = require('../models/userModel');

exports.saveUser = async (userInfo) => {
  const existing = await User.findOne({ email: userInfo.email });
  if (existing) return existing;
  const user = new User(userInfo);
  return user.save();
};

exports.getUserWatchlist = async (userId) => {
  const user = await User.findById(userId);
  return user?.watchlist || [];
}; 

/**
 * Lưu thông tin người dùng
 * @param {Object} userInfo - Ví dụ: { name, email, preferredCurrencies }
 */
const saveUser = async (userInfo) => {
  try {
    const existing = await User.findOne({ email: userInfo.email });
    if (existing) {
      return { success: false, message: 'Email đã tồn tại' };
    }

    const user = new User(userInfo);
    await user.save();
    return { success: true, user };
  } catch (err) {
    console.error('❌ Lỗi lưu user:', err.message);
    return { success: false, message: 'Lỗi máy chủ' };
  }
}; 


const updateUser = async (email, newInfo) => {
  try {
    const updated = await User.findOneAndUpdate(
      { email }, // tìm theo email
      { $set: newInfo }, // cập nhật các trường mới
      { new: true } // trả về bản ghi đã cập nhật
    );

    if (!updated) {
      return { success: false, message: 'User không tồn tại' };
    }

    return { success: true, user: updated };
  } catch (err) {
    console.error('❌ Lỗi cập nhật user:', err.message);
    return { success: false, message: 'Lỗi máy chủ' };
  }
};


module.exports = { saveUser, updateUser }; 