# Netlify Environment Setup

## Your Production Site
**URL:** https://effulgent-cupcake-f4d22e.netlify.app/

## Required Environment Variables

### 1. Go to Netlify Dashboard
1. Login to [Netlify](https://app.netlify.com/)
2. Go to your site: `effulgent-cupcake-f4d22e`
3. Click on **Site settings** > **Build & deploy** > **Environment**

### 2. Add Environment Variables

#### Variable 1: API Base URL
- **Key:** `VITE_API_BASE_URL`
- **Value:** `https://co.hakkal-est.com/`
- **Scope:** Build & Deploy

#### Variable 2: (Optional) Other Variables
```
VITE_API_BASE_URL=https://co.hakkal-est.com/
```

### 3. Deploy Updated Build

#### Option A: Drag & Drop
1. Take the `dist/` folder from your project
2. Drag and drop it to the Netlify deploy area

#### Option B: Git Integration
1. Push changes to your Git repository
2. Netlify will auto-deploy

### 4. Important Notes

**Backend API Issue:**
Currently `https://co.hakkal-est.com/` doesn't have API endpoints. You have two options:

1. **Deploy Backend Server:**
   - Deploy your `server.ts` to a service like:
     - Railway
     - Render
     - Heroku
     - Vercel (Serverless)
   - Update `VITE_API_BASE_URL` to the deployed backend URL

2. **Use Netlify Functions:**
   - Convert `server.ts` to Netlify Functions
   - Place in `netlify/functions/` folder

### 5. Current Status
- Build created successfully: `dist/` folder ready
- Frontend deployed to Netlify
- Backend API needs to be deployed separately

### 6. Testing
After deployment, test:
- Site loads correctly
- API connection works
- Order creation functions
- Admin dashboard accessible

---

**Next Steps:**
1. Set environment variables in Netlify
2. Deploy backend API server
3. Update API URL if needed
4. Test full functionality
