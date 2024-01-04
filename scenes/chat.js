const { Scenes, Markup } = require('telegraf');
const TyQuestion = require('../Model/q');
const TyUser = require('../Model/User');

const chatScene = new Scenes.BaseScene('chatScene');

// Middleware to check if the user is registered and get the question ID
chatScene.enter(async (ctx) => {
    const questionId = ctx.callbackQuery.data.split('_')[1];
    ctx.session.questionId = questionId;
    await ctx.reply('You are now in the chat scene. Type your message:');
  }
// }
);

// Handle user messages in the chat
chatScene.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const questionId = ctx.session.questionId;
  const text = ctx.message.text;

  // Find the question to get the other user's ID
  const question = await TyQuestion.findById(questionId).populate('telegramId').exec();

  if (!question) {
    await ctx.reply('Question not found.');
    return;
  }

  // Determine the other user's ID
  const otherUserId = (userId.toString() === question.telegramId._id.toString())
    ? question.replies[0].telegramId
    : question.telegramId;

  // Find the other user
  const otherUser = await TyUser.findById(otherUserId);

  if (!otherUser) {
    await ctx.reply('Other user not found.');
    return;
  }

  // Send the message to the other user
  await ctx.telegram.sendMessage(otherUser.telegramId, `Anonymous message:\n${text}`);

  await ctx.reply('Your message has been sent.');
});

module.exports = chatScene;
