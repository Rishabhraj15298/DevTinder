# Quick Start: Deploy to Render

## 🚀 Fast Deployment Steps

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push
```

### 2. Create Web Service on Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:

   **Settings:**
   - Name: `devtinder-backend`
   - Region: Choose closest
   - Branch: `main`
   - Root Directory: `backend` ⚠️ **Important if backend is in subdirectory**
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

### 3. Set Environment Variables

In Render dashboard → Environment tab, add:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=generate_a_strong_random_secret_here
CORS_ORIGINS=https://your-frontend-url.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
REDIS_ENABLED=false
```

**Generate JWT Secret:**
```bash
# On Mac/Linux
openssl rand -base64 32

# Or use online generator
# https://randomkeygen.com/
```

### 4. Deploy

Click **"Create Web Service"** and wait for deployment.

### 5. Get Your URL

Your backend will be at: `https://your-service-name.onrender.com`

---

## ✅ Checklist

- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas configured (network access allows Render)
- [ ] Environment variables set in Render
- [ ] Frontend URL added to CORS_ORIGINS
- [ ] Strong JWT_SECRET generated
- [ ] Deployment successful
- [ ] Test API endpoints

---

## 🔧 Common Issues

**Build fails?**
- Check Root Directory is set to `backend` if your backend is in a subdirectory
- Verify `package.json` has `start` script

**CORS errors?**
- Add frontend URL to `CORS_ORIGINS`
- Set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`

**Database connection fails?**
- Check MongoDB Atlas Network Access allows `0.0.0.0/0`
- Verify connection string is correct

---

For detailed guide, see [DEPLOYMENT.md](./DEPLOYMENT.md)

