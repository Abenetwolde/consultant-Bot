const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    unique: true,
    required: true,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  name: {
    type: String,
  },
  last: {
    type: String,
  },
  username: {
    type: String,
  },
});

module.exports = mongoose.model('TyUser', userSchema);
