# Deployment Guide - Render

This guide will help you deploy the Koinsave Fintech API to Render's free tier.

## Prerequisites

- GitHub account
- Render account (sign up at [render.com](https://render.com))
- Your code pushed to GitHub

## Step 1: Push to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Initial commit - Koinsave Fintech API"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 2: Deploy on Render

### Option A: Using render.yaml (Recommended)

The project includes a `render.yaml` file for automatic deployment.

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`
5. Click **"Apply"**

### Option B: Manual Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `koinsave-fintech-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

## Step 3: Set Environment Variables

In your Render service settings, add these environment variables:

| Variable | Value | Note |
|----------|-------|------|
| `NODE_ENV` | `production` | Required |
| `JWT_SECRET` | Generate a secure random string | **IMPORTANT: Use a strong secret!** |
| `JWT_EXPIRES_IN` | `24h` | Optional |
| `PORT` | `3000` | Auto-set by Render |
| `DATABASE_PATH` | `./database.sqlite` | Optional |

### Generate a Secure JWT_SECRET

```bash
# On Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 4: Verify Deployment

Once deployed, Render will provide a URL like:
```
https://koinsave-fintech-api.onrender.com
```

Test your deployment:

```bash
# Health check
curl https://your-app.onrender.com/health

# Should return:
# {"success":true,"message":"Server is running","timestamp":"..."}
```

## Step 5: Test the API

### Register a User
```bash
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "full_name": "Test User"
  }'
```

### Update Postman Collection

Update the `base_url` variable in your Postman collection to your Render URL:
```
https://your-app.onrender.com
```

## Important Notes for Free Tier

### ⚠️ Database Persistence

**SQLite on free tier:**
- Database resets when the service restarts
- Files are not persistent on free tier

**Solutions:**
1. **For Production**: Upgrade to a paid plan
2. **For Development**: Use the free tier (data will reset)
3. **Best Practice**: Migrate to PostgreSQL for production:
   - Add Render PostgreSQL database (free tier available)
   - Update code to use PostgreSQL instead of SQLite

### 🕐 Auto-Sleep

Free tier services:
- Sleep after 15 minutes of inactivity
- Take ~30 seconds to wake up on first request
- This is normal behavior

### 📊 Monitoring

Check your service:
- **Logs**: Dashboard → Your Service → Logs
- **Metrics**: Dashboard → Your Service → Metrics
- **Health**: Visit `/health` endpoint

## Troubleshooting

### Build Failed
- Check build logs in Render dashboard
- Ensure `package.json` is correct
- Verify Node.js version compatibility

### Server Not Starting
- Check environment variables
- Review logs for errors
- Ensure `PORT` is set correctly

### Database Errors
- Database resets are normal on free tier
- Check file permissions
- Consider PostgreSQL for persistence

### 500 Errors
- Check logs: Dashboard → Service → Logs
- Verify JWT_SECRET is set
- Check environment variables

## Migrating to PostgreSQL (Recommended for Production)

1. Add PostgreSQL database in Render
2. Install pg package:
   ```bash
   npm install pg
   ```
3. Update database config to use PostgreSQL
4. Update environment variables

## Monitoring and Logs

### View Logs
```bash
# In Render Dashboard
Dashboard → Your Service → Logs
```

### Key Metrics to Monitor
- Response times
- Error rates
- Request volume
- Memory usage

## Security Checklist

✅ JWT_SECRET is strong and unique
✅ NODE_ENV is set to production
✅ Rate limiting is enabled
✅ CORS is properly configured
✅ No sensitive data in logs
✅ HTTPS enabled (automatic on Render)

## Performance Tips

1. **Keep Service Awake**: Use a service like UptimeRobot to ping every 5 minutes
2. **Database**: Migrate to PostgreSQL for better performance
3. **Caching**: Add Redis for session management
4. **Monitoring**: Set up error tracking (Sentry, etc.)

## Cost Optimization

**Free Tier Limits:**
- 750 hours/month (enough for 1 service)
- Sleeps after 15 min inactivity
- 512 MB RAM
- 0.1 CPU

**When to Upgrade:**
- Need database persistence
- High traffic (no sleep)
- More resources
- Custom domain

## Next Steps

1. Set up custom domain (optional)
2. Configure monitoring
3. Set up error tracking
4. Add CI/CD pipeline
5. Migrate to PostgreSQL

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)
- Check application logs for errors

---

**Deployment URL**: https://your-app.onrender.com

**Health Check**: https://your-app.onrender.com/health

**API Docs**: Import [postman_collection.json](postman_collection.json) to Postman
