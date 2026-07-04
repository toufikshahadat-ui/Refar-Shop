# Refar Shop - Production-Ready Telegram Mini App

A complete, production-ready Telegram Mini App for earning money through tasks, referrals, and withdrawals.

## Features

- ✅ Telegram Mini App Integration
- ✅ User Authentication via Telegram
- ✅ Task System with Screenshot Verification
- ✅ Referral System (₳2 per referral)
- ✅ Wallet System (Deposit & Withdraw)
- ✅ 24-hour Withdraw Limit
- ✅ Admin Panel (Telegram-based)
- ✅ Real-time Notifications
- ✅ Bengali Language Support
- ✅ Glassmorphism UI with Animations
- ✅ Responsive Mobile Design
- ✅ Firebase Firestore Database
- ✅ Telegram Bot API Integration

## Tech Stack

### Frontend
- HTML5
- CSS3 (Glassmorphism)
- Vanilla JavaScript
- Firebase Firestore Client SDK
- Telegram Web App API

### Backend
- Node.js
- Express.js
- Firebase Admin SDK
- Telegram Bot API
- Firestore Database

## Project Structure

```
refar-shop/
├── index.html          # Main HTML file
├── style.css           # Styling & animations
├── app.js              # Frontend logic
├── firebase.js         # Firebase config
├── server.js           # Backend server
├── package.json        # Dependencies
├── .env.example        # Environment variables template
├── firestore.rules     # Firestore security rules
└── README.md           # Documentation
```

## Installation

### Prerequisites
- Node.js 18+
- Firebase Project
- Telegram Bot Token
- Admin Telegram ID

### Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/refar-shop.git
cd refar-shop
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file
```bash
cp .env.example .env
```

4. Update `.env` with your credentials
```env
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_ID=your_admin_id
MINI_APP_URL=your_mini_app_url
FIREBASE_PROJECT_ID=refar-shop
FIREBASE_PRIVATE_KEY=your_key
FIREBASE_CLIENT_EMAIL=your_email
```

5. Start the server
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Firestore Collections

### users
```javascript
{
  telegramId: number,
  firstName: string,
  lastName: string,
  username: string,
  photoUrl: string,
  balance: number,
  referralCount: number,
  referralLink: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  lastWithdrawTime: timestamp,
  channelVerified: boolean
}
```

### tasks
```javascript
{
  title: string,
  description: string,
  reward: number,
  deadline: string,
  active: boolean,
  createdAt: timestamp
}
```

### task_submissions
```javascript
{
  userId: string,
  taskId: string,
  status: 'pending' | 'approved' | 'rejected',
  photoMessageId: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### deposits
```javascript
{
  userId: string,
  amount: number,
  transactionId: string,
  status: 'pending' | 'approved' | 'rejected',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### withdrawals
```javascript
{
  userId: string,
  method: 'bkash' | 'nagad',
  number: string,
  amount: number,
  status: 'pending' | 'approved' | 'rejected',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### history
```javascript
{
  userId: string,
  type: 'task_completed' | 'referral' | 'deposit' | 'withdraw',
  amount: number,
  description: string,
  status: string,
  createdAt: timestamp
}
```

## API Endpoints

### POST /api/check-channel-membership
Verify user joined both channels
```json
{
  "userId": "123456789"
}
```

### POST /api/submit-task
Submit task with screenshot
```
Content-Type: multipart/form-data
screenshot: file
taskId: string
userId: string
```

### POST /api/submit-deposit
Submit deposit request
```json
{
  "userId": "123456789",
  "amount": 500,
  "transactionId": "NAGAD_TX_ID"
}
```

### POST /api/submit-withdraw
Submit withdrawal request
```json
{
  "userId": "123456789",
  "method": "bkash",
  "number": "01xxxxxxxxx"
}
```

## Admin Features

Admin (only ID: 8380674482) can:
- Approve/Reject tasks
- Approve/Reject deposits
- Approve/Reject withdrawals
- Add/Edit/Delete tasks
- View user balances
- View transaction history

## Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_ID=8380674482
MINI_APP_URL=https://your-domain.com

# Firebase
FIREBASE_PROJECT_ID=refar-shop
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CERT_URL=your_cert_url

# Server
PORT=3000
NODE_ENV=production
```

## Deployment

### Render.com

1. Push to GitHub
2. Connect repo to Render
3. Set environment variables
4. Deploy

### Build Command
```bash
npm install
```

### Start Command
```bash
npm start
```

## Security

- ✅ No bot token in client-side code
- ✅ Admin ID verification
- ✅ Firestore rules protection
- ✅ User ownership validation
- ✅ 24-hour withdraw cooldown
- ✅ Minimum deposit/withdraw limits

## Support

**Developer**: 𝙰𝚁𝙸𝚇𝙾 メ Tᴏᴜғɪᴋ
**Telegram**: https://t.me/ST_Admin_Toufik
**Channel**: https://t.me/Refar_Shop_ofc

## License

ISC

## Changelog

### v1.0.0
- Initial production release
- Complete Telegram Mini App
- Task system with verification
- Referral system
- Wallet management
- Admin panel
- Bengali language support
