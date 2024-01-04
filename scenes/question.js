const { Scenes ,session, Markup } = require('telegraf');
const TyQuestion = require('../Model/q');
const TyUser = require('../Model/User');

let category = null;
let userQuestion = null;

const registrationScene = new Scenes.WizardScene(
  'registrationScene',
  (ctx) => {
    // ctx.session.back=false
    ctx.sendChatAction('typing');
    ctx.reply(
       ctx.session.back?"kdjskk":`Please select a category first`,
      Markup.keyboard([
        ['BlueKidan', 'AddisKidan']
      ]).resize(),
    );
    return ctx.wizard.next(); 
  },       
  async (ctx) => {
    // Handle category selection
    category = ctx.message.text;
    if (category.startsWith('/start')) {
      ctx.reply('Welcome back!');
      return ctx.scene.leave();
    }
    if (category.startsWith('Cancel')) {
      return ctx.wizard.back();
    }
    console.log("category", category);
    await ctx.reply("Please enter your question now", Markup.keyboard([
      ['Cancel']
    ]).resize());

    // Move to the next step
    return ctx.wizard.next();
  },
  async (ctx) => {
    const telegramId = ctx.message.from.id;
    const questionText = ctx.message.text;

    if (questionText.startsWith('/start')) {
      ctx.reply('Welcome back!');
      return ctx.scene.leave();
    }
    if (questionText.startsWith('Cancel')) {
      ctx.reply('Welcome back!');
      return ctx.scene.leave();
    }
    const user = await TyUser.findOne({ telegramId });

    if (!user) {
      ctx.reply('User not found. Please register first.');
      return ctx.scene.leave();
    }

    userQuestion = questionText;
    const categoryHashtag = `#${category}`;
    await ctx.reply(`Please confirm your question:\n\n${userQuestion} \n ${categoryHashtag}`, Markup.inlineKeyboard([
      Markup.button.callback('Confirm', 'confirm'),
      Markup.button.callback('Edit', 'edit'),
    ]).resize());

    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'confirm') {
      const tgid = parseInt(ctx.from.id);
      console.log("ctx.message.from.id", ctx.from.id);
      const user = await TyUser.findOne({ telegramId: tgid });
      console.log(user);
      const question = new TyQuestion({
        user: user._id,
        telegramId: tgid,
        text: userQuestion,
        category: category
      });

      try {
        await question.save();
        ctx.reply('Your question has been saved. Continue.');
      } catch (error) {
        ctx.reply('Error saving your question. Please try again.');
        console.error('Error saving question:', error);
      } finally {
        category = null;
        userQuestion = null;
        return ctx.scene.leave();
      }
    } else if (ctx.callbackQuery && ctx.callbackQuery.data === 'edit') {
      // Check if ctx.callbackQuery is defined before accessing its data property
      if (ctx.callbackQuery) {
        // await ctx.reply("Please enter your question again");
        ctx.wizard.selectStep(ctx.wizard.cursor - 3)
        ctx.session.back=true
    return ctx.wizard.step(ctx)
      }
    }
  }
);

module.exports = {
  registrationScene,
};
