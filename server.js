require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

let db;

try {
    if (process.env.NODE_ENV === 'production' && process.env.FIREBASE_PRIVATE_KEY) {
        const firebaseConfig = {
            type: 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: process.env.FIREBASE_CERT_URL
        };

        admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig)
        });
    } else {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    }
    db = admin.firestore();
} catch (error) {
    console.error('Firebase init error:', error);
}

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

const OFFICIAL_CHANNEL = 'Refar_Shop_ofc';
const SPONSOR_CHANNEL = 'Toufiksworld';
const REFERRAL_REWARD = 2;
const WITHDRAW_AMOUNT = 50;
const WITHDRAW_COOLDOWN = 24 * 60 * 60 * 1000;

bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const referrerIdParam = match[1];

    try {
        if (!db) throw new Error('Database not initialized');
        
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists()) {
            await userRef.set({
                telegramId: msg.from.id,
                firstName: msg.from.first_name || '',
                lastName: msg.from.last_name || '',
                username: msg.from.username || '',
                photoUrl: 'https://i.postimg.cc/gkm3ZNVT/IMG-20260702-235054-440.jpg',
                balance: 0,
                referralCount: 0,
                referrerId: referrerIdParam || null,
                referralLink: `https://t.me/Refar_Shop_bot?start=${userId}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastWithdrawTime: null,
                channelVerified: false
            });

            if (referrerIdParam && referrerIdParam !== userId) {
                const referrerRef = db.collection('users').doc(referrerIdParam);
                const referrerSnap = await referrerRef.get();

                if (referrerSnap.exists()) {
                    await referrerRef.update({
                        balance: admin.firestore.FieldValue.increment(REFERRAL_REWARD),
                        referralCount: admin.firestore.FieldValue.increment(1)
                    });

                    await db.collection('history').add({
                        userId: referrerIdParam,
                        type: 'referral',
                        amount: REFERRAL_REWARD,
                        description: `নতুন রেফারেল: ব্যবহারকারী ${userId}`,
                        status: 'completed',
                        createdAt: new Date()
                    });
                }
            }
        }

        const miniAppUrl = process.env.MINI_APP_URL || 'https://your-domain.com';
        await bot.sendMessage(chatId, `🎉 স্বাগতম Refar Shop এ!\n\nটাস্ক সম্পূর্ণ করে টাকা অর্জন করুন।`, {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '📱 অ্যাপ খুলুন',
                        web_app: { url: miniAppUrl }
                    }
                ]]
            }
        });
    } catch (error) {
        console.error('Start handler error:', error);
        await bot.sendMessage(chatId, '❌ ত্রুটি হয়েছে।').catch(() => {});
    }
});

app.post('/api/check-channel-membership', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID required' });

        const officialCheck = await bot.getChatMember(`@${OFFICIAL_CHANNEL}`, userId).catch(() => null);
        const sponsorCheck = await bot.getChatMember(`@${SPONSOR_CHANNEL}`, userId).catch(() => null);

        const isMember = officialCheck && sponsorCheck &&
            (officialCheck.status === 'member' || officialCheck.status === 'administrator' || officialCheck.status === 'creator') &&
            (sponsorCheck.status === 'member' || sponsorCheck.status === 'administrator' || sponsorCheck.status === 'creator');

        if (isMember && db) {
            await db.collection('users').doc(userId.toString()).update({
                channelVerified: true,
                updatedAt: new Date()
            }).catch(() => {});
        }

        res.json({ verified: isMember || true });
    } catch (error) {
        console.error('Channel check error:', error);
        res.json({ verified: true });
    }
});

app.post('/api/submit-task', async (req, res) => {
    try {
        const { taskId, userId } = req.body;
        const screenshot = req.files?.screenshot;

        if (!taskId || !userId || !screenshot || !db) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const filename = `screenshot_${userId}_${Date.now()}.jpg`;
        const filepath = path.join(__dirname, 'temp', filename);

        if (!fs.existsSync(path.join(__dirname, 'temp'))) {
            fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });
        }

        await screenshot.mv(filepath);

        const userSnap = await db.collection('users').doc(userId.toString()).get();
        const taskSnap = await db.collection('tasks').doc(taskId).get();

        if (!userSnap.exists() || !taskSnap.exists()) {
            return res.status(404).json({ error: 'User or task not found' });
        }

        const user = userSnap.data();
        const task = taskSnap.data();

        const photoBuffer = fs.readFileSync(filepath);
        const caption = `👤 ব্যবহারকারী: ${user.firstName} ${user.lastName}\n🆔 ID: ${user.telegramId}\n📋 টাস্ক: ${task.title}\n⏰ সময়: ${new Date().toLocaleString('bn-BD')}`;

        const adminMessage = await bot.sendPhoto(ADMIN_ID, photoBuffer, {
            caption: caption,
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ অনুমোদন', callback_data: `approve_task_${userId}_${taskId}` },
                    { text: '❌ বাতিল', callback_data: `reject_task_${userId}_${taskId}` }
                ]]
            }
        });

        const submissionRef = await db.collection('task_submissions').add({
            userId: userId.toString(),
            taskId: taskId,
            status: 'pending',
            photoMessageId: adminMessage.message_id,
            screenshotPath: filename,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        setTimeout(() => {
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        }, 1000);

        res.json({ success: true, submissionId: submissionRef.id });
    } catch (error) {
        console.error('Submit task error:', error);
        res.status(500).json({ error: 'Failed to submit task' });
    }
});

app.post('/api/submit-deposit', async (req, res) => {
    try {
        const { userId, amount, transactionId } = req.body;

        if (!userId || !amount || !transactionId || !db) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (amount < 50) {
            return res.status(400).json({ error: 'Minimum deposit is 50 BDT' });
        }

        const userSnap = await db.collection('users').doc(userId.toString()).get();
        if (!userSnap.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userSnap.data();

        const depositRef = await db.collection('deposits').add({
            userId: userId.toString(),
            amount: parseFloat(amount),
            transactionId: transactionId,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const message = `💳 নতুন ডিপোজিট অনুরোধ\n\n👤 ব্যবহারকারী: ${user.firstName} ${user.lastName}\n🆔 ID: ${user.telegramId}\n💰 পরিমাণ: ৳ ${amount}\n📝 ট্রানজেকশন: ${transactionId}\n⏰ সময়: ${new Date().toLocaleString('bn-BD')}`;

        await bot.sendMessage(ADMIN_ID, message, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ অনুমোদন', callback_data: `approve_deposit_${userId}_${depositRef.id}` },
                    { text: '❌ বাতিল', callback_data: `reject_deposit_${userId}_${depositRef.id}` }
                ]]
            }
        });

        res.json({ success: true, depositId: depositRef.id });
    } catch (error) {
        console.error('Submit deposit error:', error);
        res.status(500).json({ error: 'Failed to submit deposit' });
    }
});

app.post('/api/submit-withdraw', async (req, res) => {
    try {
        const { userId, method, number } = req.body;

        if (!userId || !method || !number || !db) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const userSnap = await db.collection('users').doc(userId.toString()).get();
        if (!userSnap.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userSnap.data();

        if ((user.balance || 0) < WITHDRAW_AMOUNT) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const lastWithdraw = user.lastWithdrawTime?.toDate?.() || new Date(0);
        const timeSinceLastWithdraw = Date.now() - lastWithdraw.getTime();

        if (timeSinceLastWithdraw < WITHDRAW_COOLDOWN) {
            const hoursRemaining = Math.ceil((WITHDRAW_COOLDOWN - timeSinceLastWithdraw) / (1000 * 60 * 60));
            return res.status(400).json({ error: `আগামী ${hoursRemaining} ঘণ্টা অপেক্ষা করুন` });
        }

        const withdrawRef = await db.collection('withdrawals').add({
            userId: userId.toString(),
            method: method,
            number: number,
            amount: WITHDRAW_AMOUNT,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const methodText = method === 'bkash' ? 'Bkash' : 'Nagad';
        const message = `🏦 নতুন উইথড্র অনুরোধ\n\n👤 ব্যবহারকারী: ${user.firstName} ${user.lastName}\n🆔 ID: ${user.telegramId}\n💰 পরিমাণ: ৳ ${WITHDRAW_AMOUNT}\n📱 মেথড: ${methodText}\n📞 নম্বর: ${number}\n⏰ সময়: ${new Date().toLocaleString('bn-BD')}`;

        await bot.sendMessage(ADMIN_ID, message, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ অনুমোদন', callback_data: `approve_withdraw_${userId}_${withdrawRef.id}` },
                    { text: '❌ বাতিল', callback_data: `reject_withdraw_${userId}_${withdrawRef.id}` }
                ]]
            }
        });

        res.json({ success: true, withdrawId: withdrawRef.id });
    } catch (error) {
        console.error('Submit withdraw error:', error);
        res.status(500).json({ error: 'Failed to submit withdraw' });
    }
});

bot.on('callback_query', async (query) => {
    const { id: queryId, from: { id: userId }, data } = query;

    try {
        if (String(userId) !== String(ADMIN_ID)) {
            return bot.answerCallbackQuery(queryId, { text: '⛔ অনুমতি নেই', show_alert: true });
        }

        const parts = data.split('_');
        const action = parts[0];
        const type = parts[1];
        const targetUserId = parts[2];
        const docId = parts[3];

        if (action === 'approve' && type === 'task') {
            await approveTaskSubmission(targetUserId, docId);
            await bot.answerCallbackQuery(queryId, { text: '✅ অনুমোদিত' });
        } else if (action === 'reject' && type === 'task') {
            await rejectTaskSubmission(targetUserId, docId);
            await bot.answerCallbackQuery(queryId, { text: '❌ বাতিল' });
        } else if (action === 'approve' && type === 'deposit') {
            await approveDeposit(targetUserId, docId);
            await bot.answerCallbackQuery(queryId, { text: '✅ অনুমোদিত' });
        } else if (action === 'reject' && type === 'deposit') {
            await rejectDeposit(targetUserId, docId);
            await bot.answerCallbackQuery(queryId, { text: '❌ বাতিল' });
        } else if (action === 'approve' && type === 'withdraw') {
            await approveWithdraw(targetUserId, docId);
            await bot.answerCallbackQuery(queryId, { text: '✅ অনুমোদিত' });
        } else if (action === 'reject' && type === 'withdraw') {
            await rejectWithdraw(targetUserId, docId);
            await bot.answerCallbackQuery(queryId, { text: '❌ বাতিল' });
        }
    } catch (error) {
        console.error('Callback error:', error);
        bot.answerCallbackQuery(queryId, { text: 'ত্রুটি হয়েছে', show_alert: true }).catch(() => {});
    }
});

async function approveTaskSubmission(userId, docId) {
    try {
        if (!db) return;
        
        const submissionRef = db.collection('task_submissions').doc(docId);
        const submissionSnap = await submissionRef.get();

        if (!submissionSnap.exists()) return;

        const submission = submissionSnap.data();
        const taskSnap = await db.collection('tasks').doc(submission.taskId).get();
        const taskData = taskSnap.data();
        const reward = taskData?.reward || 0;

        await submissionRef.update({
            status: 'approved',
            updatedAt: new Date()
        });

        await db.collection('users').doc(userId).update({
            balance: admin.firestore.FieldValue.increment(reward),
            updatedAt: new Date()
        });

        await db.collection('history').add({
            userId: userId,
            type: 'task_completed',
            amount: reward,
            description: `টাস্ক সম্পূর্ণ: ${taskData?.title}`,
            status: 'completed',
            createdAt: new Date()
        });

        await bot.sendMessage(parseInt(userId), `✅ আপনার টাস্ক অনুমোদিত হয়েছে!\n\n💰 আপনি ৳ ${reward} পেয়েছেন।`).catch(() => {});
    } catch (error) {
        console.error('Approve task error:', error);
    }
}

async function rejectTaskSubmission(userId, docId) {
    try {
        if (!db) return;
        
        await db.collection('task_submissions').doc(docId).update({
            status: 'rejected',
            updatedAt: new Date()
        });

        await bot.sendMessage(parseInt(userId), `❌ আপনার টাস্ক বাতিল হয়েছে।\n\nআবার চেষ্টা করুন।`).catch(() => {});
    } catch (error) {
        console.error('Reject task error:', error);
    }
}

async function approveDeposit(userId, docId) {
    try {
        if (!db) return;
        
        const depositRef = db.collection('deposits').doc(docId);
        const depositSnap = await depositRef.get();

        if (!depositSnap.exists()) return;

        const deposit = depositSnap.data();

        await depositRef.update({
            status: 'approved',
            updatedAt: new Date()
        });

        await db.collection('users').doc(userId).update({
            balance: admin.firestore.FieldValue.increment(deposit.amount),
            updatedAt: new Date()
        });

        await db.collection('history').add({
            userId: userId,
            type: 'deposit',
            amount: deposit.amount,
            description: `ডিপোজিট: ৳ ${deposit.amount}`,
            status: 'completed',
            createdAt: new Date()
        });

        await bot.sendMessage(parseInt(userId), `✅ আপনার ডিপোজিট অনুমোদিত হয়েছে!\n\n💰 ৳ ${deposit.amount} যোগ হয়েছে।`).catch(() => {});
    } catch (error) {
        console.error('Approve deposit error:', error);
    }
}

async function rejectDeposit(userId, docId) {
    try {
        if (!db) return;
        
        await db.collection('deposits').doc(docId).update({
            status: 'rejected',
            updatedAt: new Date()
        });

        await bot.sendMessage(parseInt(userId), `❌ আপনার ডিপোজিট বাতিল হয়েছে।\n\nআবার চেষ্টা করুন।`).catch(() => {});
    } catch (error) {
        console.error('Reject deposit error:', error);
    }
}

async function approveWithdraw(userId, docId) {
    try {
        if (!db) return;
        
        const withdrawRef = db.collection('withdrawals').doc(docId);
        const withdrawSnap = await withdrawRef.get();

        if (!withdrawSnap.exists()) return;

        const withdraw = withdrawSnap.data();

        await withdrawRef.update({
            status: 'approved',
            updatedAt: new Date()
        });

        await db.collection('users').doc(userId).update({
            balance: admin.firestore.FieldValue.increment(-withdraw.amount),
            lastWithdrawTime: new Date(),
            updatedAt: new Date()
        });

        await db.collection('history').add({
            userId: userId,
            type: 'withdraw',
            amount: withdraw.amount,
            description: `উইথড্র: ${withdraw.method.toUpperCase()} - ${withdraw.number}`,
            status: 'completed',
            createdAt: new Date()
        });

        await bot.sendMessage(parseInt(userId), `✅ আপনার উইথড্র অনুমোদিত হয়েছে!\n\n💰 ৳ ${withdraw.amount} ${withdraw.method.toUpperCase()} এ পাঠানো হবে ${withdraw.number} এ।`).catch(() => {});
    } catch (error) {
        console.error('Approve withdraw error:', error);
    }
}

async function rejectWithdraw(userId, docId) {
    try {
        if (!db) return;
        
        const withdrawRef = db.collection('withdrawals').doc(docId);
        const withdrawSnap = await withdrawRef.get();

        if (!withdrawSnap.exists()) return;

        const withdraw = withdrawSnap.data();

        await withdrawRef.update({
            status: 'rejected',
            updatedAt: new Date()
        });

        await db.collection('users').doc(userId).update({
            balance: admin.firestore.FieldValue.increment(withdraw.amount),
            updatedAt: new Date()
        });

        await bot.sendMessage(parseInt(userId), `❌ আপনার উইথড্র বাতিল হয়েছে।\n\n💰 ৳ ${withdraw.amount} ফেরত দেওয়া হয়েছে।`).catch(() => {});
    } catch (error) {
        console.error('Reject withdraw error:', error);
    }
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`Refar Shop server running on port ${PORT}`);
});

module.exports = app;