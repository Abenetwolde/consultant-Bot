const { Scenes, Markup } = require('telegraf');
const TyQuestion = require('../Model/q');
const TyUser = require('../Model/User');

const homeScene = new Scenes.BaseScene('startScene');

homeScene.enter(async (ctx) => {
    const telegramId = ctx.message.from.id;
    const startCommand = ctx.message.text.split(' ');

    // Check if the user is coming from a channel post
    if (startCommand.length === 2 && startCommand[1].startsWith('chat_')) {
        // Extract the question ID from the arguments
        const questionId = startCommand[1].replace('chat_', '');
        ctx.session.questionId = questionId;
        // Find the question by ID and populate the replies
        const question = await TyQuestion.findById(questionId).populate('replies.user').exec();
        console.log("question", question)
        if (question) {
            // Display the question and replies to the user
            sendQuestionWithReplies(ctx, question);
            return;
        }
    }

    // Check if the user is already registered
    const existingUser = await TyUser.findOne({ telegramId });

    if (!existingUser) {
        // User not found, register them
        const newUser = new TyUser({
            telegramId,
            name: ctx.from.first_name,
            last: ctx.from.last_name,
            username: ctx.message.from.username ? ctx.message.from.username : '',
        });

        try {
            await newUser.save();
            ctx.reply('You have been successfully registered. You can now ask your therapy questions.');
            await ctx.scene.enter('registrationScene');
        } catch (error) {
            ctx.reply('Error registering user. Please try again.');
            console.error('Error registering user:', error);
        }
    } else {
        await ctx.reply('You are already registered',        Markup.keyboard([
            ['Ask a question', '🔍 Search questions', '📈 Trending Answers'],
            ['Profile',  'Language']
        ]).resize(),);
        await ctx.reply(`Hello ${ctx.from.first_name}!`,)

        // await ctx.scene.enter('registrationScene');
    }
});
homeScene.hears('Ask a question', async (ctx) => {
    await ctx.scene.enter('registrationScene');
});
homeScene.on('text', async (ctx) => {
    const telegramId = ctx.message.from.id;
    const user = await TyUser.findOne({ telegramId });
    const questionText = ctx.message.text;

    if (questionText.startsWith('/start')) {
        ctx.reply('Welcome back!');
        return ctx.scene.leave();
    }
    if (user) {
        // Check if there's a question ID in the session
        const questionId = ctx.session.questionId;

        if (questionId) {
            // Save the user's reply in the question's replies array
            const reply = {
                user: user._id,
                telegramId: telegramId,
                text: ctx.message.text,
            };

            // Update the question with the new reply
      const id=      await TyQuestion.findByIdAndUpdate(questionId, { $push: { replies: reply } });
            await updateRepliesCount(ctx, id._id);
            // Send the updated question and its replies
            const updatedQuestion = await TyQuestion.findById(questionId).populate('replies.user').exec();
            sendQuestionWithReplies(ctx, updatedQuestion);
            const questionOwner = updatedQuestion.telegramId;
            const notificationMessage = `New reply to your question: ${updatedQuestion.replies[0].text}`;
            sendNotificationToUser(ctx, questionOwner, notificationMessage);

            // Clear the questionId in the session
            // delete ctx.session.questionId;
        } else {
            ctx.reply('No question ID found in the session.');
        }
    } else {
        ctx.reply('User not found.');
    }
});
homeScene.command('start', async (ctx) => {
    await ctx.scene.leave()
});
homeScene.leave(async (ctx) => {
    // Leave the scene
    await ctx.scene.leave();
});
async function updateRepliesCount(ctx,questionId) {
    console.log("questionId..............",questionId)
    try {
        const question = await TyQuestion.findById(questionId).populate('replies').exec();

        if (!question) {
            console.log('Question not found.');
            return;
        }

        // Get the updated replies count
        const replyCount = question.replies ? question.replies.length : 0;
        const messageText = `Question from Anonymous\n${question.text || 'No question text available.'}`;
        // Get the channel message ID from the database
        const channelMessageId = question.channelMessageId;

        // Update the inline button label on the channel post
        await ctx.telegram.editMessageText(
            -1002043550645,  // Channel ID
            channelMessageId,
            undefined,
            messageText,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: `Chat (${replyCount} replies)`, url: `https://t.me/therapy123321_bot?start=chat_${question._id}` }
                        ]
                    ]
                }
            }
        );

        console.log(`Replies count updated for question ${question._id}.`);
    } catch (error) {
        console.error('Error updating replies count:', error);
    }
}

async function sendQuestionWithReplies(ctx, question) {
    let formattedQuestion = `Question from ${question.telegramId.name || 'Anonymous'}:\n${question.text}\n`;
    let formatedRepies = 'Repies:-'
    if (question.replies && question.replies.length > 0) {
        formattedQuestion += 'Replies:\n';



        // Add the inline button with the reply count
        const replyCount = question.replies.length;
        formattedQuestion += `\n${replyCount} reply${replyCount !== 1 ? 's' : ''}`;

        // Inline button to view replies
        const inlineKeyboard = Markup.inlineKeyboard([
            Markup.button.callback(`View Replies (${replyCount})`, `view_replies_${question._id}`),
        ]);

        // Send the question with inline buttons
        await ctx.reply(formattedQuestion, inlineKeyboard);
        for (const reply of question.replies) {
            formatedRepies = `- ${reply.user.namee || 'Councler'}: ${reply.text}\n`;
            await ctx.reply(formatedRepies);
        }

    } else {
        formattedQuestion += 'No replies yet.';
        ctx.reply(formattedQuestion);
    }
}

async function sendNotificationToUser(ctx, userId, message) {
    try {
        await ctx.telegram.sendMessage(userId, message);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}
module.exports = {
    homeScene,
};
