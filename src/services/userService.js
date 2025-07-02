const User = require('../models/User');

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
