
const { Telegraf, Markup, InputFile, Scene, session, WizardScene, Scenes } = require('telegraf');
const TyUser = require('./Model/User');
const TyQuestion = require('./Model/q');
const connectDatabase = require('./config/database');
const { registrationScene } = require('./scenes/question');
const chatScene = require('./scenes/chat');
const { homeScene } = require('./scenes/home');

const bot = new Telegraf("6532776516:AAHIaVhAW0Pt1SPLhgC49lv2kxxiK7z6in0", {
    timeout: Infinity
});
connectDatabase()
const { Stage } = Scenes;
const stage = new Stage([ homeScene,registrationScene, chatScene]);
bot.use(session());
bot.use(stage.middleware());
bot.command('start', async (ctx) => {
    await ctx.scene.enter('startScene');
});

bot.command('post', async (ctx) => {
    try {
        const questions = await TyQuestion.find().populate('_id').exec();

        if (questions.length === 0) {
            ctx.reply('No questions available.');
            return;
        }

        // Post each question to the channel
        for (const question of questions) {
            const user = question.telegramId;

            // Get the replies count
            const replyCount = question.replies ? question.replies.length : 0;

            // Create an inline keyboard button for each question with replies count
            const inlineKeyboard = Markup.inlineKeyboard([
                Markup.button.url(`Chat (${replyCount} replies)`, `https://t.me/therapy123321_bot?start=chat_${question._id}`),
            ]);
            const categoryHashtag = `#${question.category}`;
            // Post the question to the channel
            const postedMessage=    await bot.telegram.sendMessage(
                -1002043550645,
                `Question from ${user.name || 'Anonymous'}:\n${question.text} \n${categoryHashtag}  `,
                inlineKeyboard
            );
            question.channelMessageId = postedMessage.message_id;
            await question.save();
        }
      
        ctx.reply(`${questions?.length}All questions posted to the channel`);
    } catch (error) {
        console.error('Error posting questions:', error);
        ctx.reply('Error posting questions. Please try again.');
    }
});


bot.catch(async (err, ctx) => {
    console.log(`Error while handling update ${ctx.update.update_id}:`, err)

    const errorCode = err.response && err.response.error_code;
    let errorMessage = '';

    switch (errorCode) {
        case 400:
            errorMessage = 'Bad Request: The request was not understood or lacked required parameters.';
            break;
        case 403:
            errorMessage = 'Forbidden: The bot was blocked by the user.';
            break;
        case 404:
            errorMessage = 'Not Found: The requested resource could not be found.';
            break;
        case 409:
            errorMessage = 'Conflict: The request could not be completed due to a conflict with the current state of the resource.';
            break;
        case 429:
            errorMessage = 'Too Many Requests: The bot is sending too many requests to the Telegram servers.';
            break;
        case 500:
            errorMessage = 'Internal Server Error: An error occurred on the server.';
            break;
        default:
            errorMessage = 'An error occurred while processing your request.';
    }
    const adminChatId = '2126443079'
    // Notify the user
    await ctx.telegram.sendMessage(adminChatId, errorMessage).catch((err) => {
        console.log('Failed to send error message to user:', err);
    });
    // if (ctx && ctx.chat && ctx.chat.id) {
    await ctx.telegram.sendMessage(adminChatId, errorMessage).catch((err) => {
        console.log('Failed to send error message to user:', err);
    });
    // }
})


process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
const launch = async () => {
    try {
        await bot.launch({
            dropPendingUpdates: true,
            polling: {
                timeout: 30,
                limit: 100,
            },
        });
        console.log('Bot is running!');
    } catch (e) {
        console.error(`Couldn't connect to Telegram - ${e.message}; trying again in 5 seconds...`);

        // Wait for 5 seconds before attempting to reconnect
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Retry launching the bot
        await launch();
    }
};

launch();


