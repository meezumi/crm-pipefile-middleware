# ✅ TODO: Setup Checklist

Follow these steps to get your Pipefile to Zoho CRM integration running!

## Step 1: Install Dependencies ✅

Already done! Dependencies are installed.

```bash
npm install  # Already completed
```

## Step 2: Get Zoho CRM Credentials ⏳

You need to get OAuth credentials from Zoho:

### 2a. Create OAuth App

1. Go to https://api-console.zoho.com/
2. Click **Add Client** → **Server-based Applications**
3. Fill in:
   - Client Name: `Pipefile Integration`
   - Homepage URL: `http://localhost:3000`
   - Redirect URI: `http://localhost:3000/callback`
4. Click **Create**
5. **Copy** your Client ID and Client Secret

### 2b. Generate Refresh Token

1. Visit this URL in your browser (replace YOUR_CLIENT_ID):

```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=1000.N4EA4Z6YYD1ROAJMY7O1ZB2S2WAOHZ&response_type=code&access_type=offline&redirect_uri=http://localhost:3000/callback

```

2. Authorize the app
3. You'll be redirected to a URL with a `code` parameter - copy this code
4. Run this command (replace YOUR_CODE, YOUR_CLIENT_ID, YOUR_CLIENT_SECRET):

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "code=YOUR_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "grant_type=authorization_code"
```

5. Copy the `refresh_token` from the response

## Step 3: Configure .env File ⏳

Edit the `.env` file in the project root:

```env
PORT=3000

# Paste your Zoho credentials here:
ZOHO_CLIENT_ID=1000.YOUR_CLIENT_ID_HERE
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_REFRESH_TOKEN=1000.your_refresh_token_here
ZOHO_API_DOMAIN=https://www.zohoapis.in

# Which Zoho module to create records in (Leads, Contacts, Deals, etc.)
ZOHO_MODULE=Leads
```

Save the file!

## Step 4: Test the Server Locally ⏳

Start the server:

```bash
npm run dev
```

You should see:

```
🚀 Webhook receiver running on port 3000
📡 Webhook URL: http://localhost:3000/webhook
🏥 Health check: http://localhost:3000/health
```

## Step 5: Test with curl ⏳

In a new terminal, run:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "file_request.file_uploaded",
    "data": {
      "file_id": "test123",
      "file_name": "test.csv",
      "file_url": "https://example.com/test.csv",
      "uploaded_at": "2025-11-11T10:00:00Z",
      "uploader_name": "Test User",
      "uploader_email": "test@example.com"
    }
  }'
```

Expected output in your server console:

```
📥 Webhook received from Pipefile
Event: file_request.file_uploaded
✅ Valid file upload event received
🔄 Parsing data for Zoho CRM...
✅ Data parsed successfully
📤 Sending to Zoho CRM module: Leads
🔑 Refreshing Zoho access token...
✅ Access token refreshed successfully
✅ Record created successfully in Zoho CRM
Record ID: 4567890123456
```

Check your Zoho CRM - you should see a new Lead created!

## Step 6: Expose Your Server with ngrok ⏳

For Pipefile to send webhooks to your local server, you need to expose it to the internet:

```bash
# Install ngrok (if not installed)
npm install -g ngrok

# Expose port 3000
ngrok http 3000
```

You'll see output like:

```
Forwarding  https://abc123def456.ngrok.io -> http://localhost:3000
```

**Copy this URL** - you'll need it for Pipefile!

## Step 7: Register Webhook in Pipefile ⏳

Create the webhook in Pipefile using their API:

```bash
curl -X POST https://api.pipefile.com/v1/webhooks/ \
  -H "Authorization: Token YOUR_PIPEFILE_API_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "event": "file_request.file_uploaded",
    "target": "https://YOUR-NGROK-URL.ngrok.io/webhook"
  }'
```

Replace:
- `YOUR_PIPEFILE_API_TOKEN` with your Pipefile API token (e.g., `0f2f927eda84c2ce4d4fb805ddc113aec41cde2156b1f6f2a9af5de7dd73d67f`)
- `YOUR-NGROK-URL` with your ngrok URL

Expected response:

```json
{
  "id": 3,
  "event": "file_request.file_uploaded",
  "target": "https://YOUR-NGROK-URL.ngrok.io/webhook",
  "created": "2025-11-11T10:00:00Z"
}
```

## Step 8: Test End-to-End! 🎉

1. Go to Pipefile
2. Upload a file
3. Watch your server console
4. Check Zoho CRM for the new record!

---

## 🎯 Summary of What You Need

- [x] Node.js installed
- [x] npm dependencies installed
- [ ] Zoho OAuth credentials (Client ID, Secret, Refresh Token)
- [ ] `.env` file configured
- [ ] Server running and tested locally
- [ ] ngrok running (for Pipefile webhooks)
- [ ] Webhook registered in Pipefile
- [ ] End-to-end test successful

---

## 🐛 Troubleshooting

### "Zoho authentication failed"

Check your credentials in `.env`:
- Client ID should start with `1000.`
- Refresh token should also start with `1000.`
- No extra spaces or quotes

### "Field does not exist" from Zoho

The field names in `src/webhookHandler.js` must match your Zoho CRM:
1. Go to Zoho CRM → Settings → Modules → Your Module → Fields
2. Check the **API Name** of each field
3. Update the field names in `parseDataForZoho()` function

### Webhook not receiving data

- Is ngrok still running? Check the terminal
- Is the server running? Check with `curl http://localhost:3000/health`
- Is the webhook URL correct in Pipefile?

---

## 📚 Documentation

- **README.md** - Complete setup guide
- **QUICKSTART.md** - Quick reference
- **FLOW_DIAGRAM.md** - How everything works

---

## 🎉 Next Steps After Setup

Once everything is working:

1. **Customize field mapping** - Edit `src/webhookHandler.js` to match your data
2. **Add validation** - Check data before sending to Zoho
3. **Handle errors** - Add retry logic for failed API calls
4. **Add more events** - Handle other Pipefile events
5. **Deploy to production** - Use a proper domain instead of ngrok

---

Good luck! 🚀

If you get stuck, check the console logs - they show exactly what's happening!
