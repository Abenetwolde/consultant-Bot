const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TyUser',
    required: true,
  },
  channelMessageId: { type: String, default: null }, 
  telegramId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    
  },
  replies: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TyUser',
        required: true,
      },
      telegramId: {
        type: String,
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
    },
  ], 
  
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

module.exports = mongoose.model('TyQuestion', questionSchema);
 