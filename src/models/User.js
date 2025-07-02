const userSchema = new mongoose.Schema({
  email: String,
  watchlist: [String],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
