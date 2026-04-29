# Odoo API Access Guide

## Current Configuration
Your Odoo is already configured:
- **URL:** https://co.haqqal-est.com/
- **DB:** test
- **API Key:** b1624329dc9a6ba356f92d9e76eabab105479791

### Accessing the Odoo Instance
1. Go to: https://co.haqqal-est.com/web
2. Log in with:
   - **Username:** aburiyad
   - **Password:** test

---

## API Endpoints (via Proxy)

Since the Odoo instance doesn't have native REST API endpoints enabled, we use the `api/index.ts` server as a proxy that communicates with Odoo via XML-RPC.

### 1. Common XML-RPC Authentication
```bash
curl -X POST https://co.haqqal-est.com/xmlrpc/2/common \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0"?>
<methodCall>
  <methodName>authenticate</methodName>
  <params>
    <param><value><string>test</string></value></param>
    <param><value><string>aburiyad</string></value></param>
    <param><value><string>test</string></value></param>
    <param><value><struct></struct></value></param>
  </params>
</methodCall>'
```

## Alternative: Generate API Key (Optional)

### For REST API
1. Go to **Settings** > **Technical** > **API Keys**
2. Create new API Key
3. Assign to user `aburiyad`
4. Use in Authorization header: `Bearer YOUR_API_KEY`

### For External Applications
1. Go to **Settings** > **Technical** > **Database Structure** > **API Keys**
2. Create key with specific permissions

## Current Status Check

### Verify Your Setup
Your application is already connecting successfully to Odoo:
- Orders are being created (S00045, S00046, S00047, S00048)
- API calls are working in logs
- XML-RPC authentication is successful

### If Issues Occur
1. Check user permissions in Odoo
2. Verify database name is correct: `test`
3. Ensure password is correct: `test`
4. Check if user is active

## Best Practices

### Security
- Create dedicated API user with limited permissions
- Use strong passwords
- Enable two-factor authentication if possible

### Performance
- Use appropriate field limits in queries
- Cache frequently accessed data
- Monitor API usage

---

**Conclusion:** Your Odoo API is working! You don't need an "API key" for XML-RPC - just ensure the user `aburiyad` has proper permissions in Odoo.
