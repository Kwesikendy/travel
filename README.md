# Greater & Better Travel Agency

A full-stack travel agency website with trip planning and email notification features.

## 🚀 Features

- **Trip Planning Form**: Customers can submit trip requests with visa type, dates, and preferences
- **Email Notifications**: Automatic emails sent to both agency and customer
- **Responsive Design**: Works on desktop and mobile
- **Premium UI**: Glassmorphism effects, smooth animations, gold gradient buttons
- **Day/Night Mode**: Toggle between day and night backgrounds

## 📁 Project Structure

```
TT/
├── travel-backend/
│   └── travel-backend/
│       ├── public/           # Frontend files (HTML, CSS, JS, images)
│       ├── server.js         # Express backend with email integration
│       └── package.json
└── Pastor BA/                # (Legacy - can be deleted)
```

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3, JavaScript
- Glassmorphism design
- Responsive layout

**Backend:**
- Node.js + Express
- Nodemailer (Gmail integration)
- CORS enabled

## 🏃 Running Locally

1. **Install Dependencies**
   ```bash
   cd travel-backend/travel-backend
   npm install
   ```

2. **Start Server**
   ```bash
   node server.js
   ```

3. **Open Browser**
   - Navigate to: `http://localhost:3000`

## 📧 Email Configuration

The app uses Gmail for sending emails. Email credentials are currently hardcoded in `server.js` (lines 91-92).

**For production, use environment variables:**
1. Create `.env` file
2. Add: `EMAIL_USER=your-email@gmail.com` and `EMAIL_PASS=your-app-password`
3. Update `server.js` to use `process.env.EMAIL_USER` and `process.env.EMAIL_PASS`

## 🌐 Deployment

**Recommended Platform:** Render (Free tier available)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Set Root Directory: `travel-backend/travel-backend`
5. Build Command: `npm install`
6. Start Command: `node server.js`
7. Add environment variables for email credentials

## 📝 License

Private project for Greater & Better Travel Agency.
