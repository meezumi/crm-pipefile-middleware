# Quick Reference Guide

## 🎯 What You've Built

A simple webhook receiver that:
1. Receives POST requests from Pipefile when files are uploaded
2. Extracts the file data
3. Sends it to Zoho CRM API v8

## 🚀 How to Run

### 1. Configure Credentials

Edit `.env` file with your Zoho credentials:

```env
PORT=3000
ZOHO_CLIENT_ID=1000.ABC123...
ZOHO_CLIENT_SECRET=xyz789...
ZOHO_REFRESH_TOKEN=1000.def456...
ZOHO_MODULE=Leads
```

### 2. Start Server

```bash
npm run dev
```

### 3. Expose Localhost (for testing)

```bash
ngrok http 3000
```

Copy the ngrok URL: `https://abc123.ngrok.io`

### 4. Register Webhook in Pipefile

```bash
curl -X POST https://api.pipefile.com/v1/webhooks/ \
  -H "Authorization: Bearer YOUR_PIPEFILE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "file_request.file_uploaded",
    "target": "https://abc123.ngrok.io/webhook"
  }'
```

## 🧪 Test It

### Test manually:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "file_request.file_uploaded",
    "data": {
      "file_id": "test123",
      "file_name": "customers.csv",
      "file_url": "https://example.com/file.csv",
      "uploaded_at": "2025-11-11T10:00:00Z",
      "uploader_name": "John Doe",
      "uploader_email": "john@example.com"
    }
  }'
```

### Expected output in console:

```
📥 Webhook received from Pipefile
Event: file_request.file_uploaded
✅ Valid file upload event received
🔄 Parsing data for Zoho CRM...
✅ Data parsed successfully
📤 Sending to Zoho CRM module: Leads
✅ Record created successfully in Zoho CRM
Record ID: 4567890123456
```

## 📝 The Flow

```
┌─────────────┐
│  Pipefile   │  File uploaded
│             │
└──────┬──────┘
       │
       │ POST /webhook
       │ {
       │   "event": "file_request.file_uploaded",
       │   "data": {...}
       │ }
       │
       ▼
┌─────────────────────┐
│  Your Server        │
│  (localhost:3000)   │
│                     │
│  1. Receive webhook │
│  2. Parse data      │
│  3. Format for Zoho │
└──────┬──────────────┘
       │
       │ POST /crm/v8/Leads
       │ Authorization: Zoho-oauthtoken
       │ {
       │   "data": [{...}]
       │ }
       │
       ▼
┌─────────────┐
│  Zoho CRM   │  Record created!
│             │
└─────────────┘
```

## 🔧 Files Explained

### `src/server.js`
- Sets up Express server
- Defines routes (`/webhook`, `/health`)
- Starts listening on port 3000

### `src/webhookHandler.js`
- Receives Pipefile webhook
- Validates the payload
- Parses and formats data for Zoho
- Calls Zoho client to send data

### `src/zohoClient.js`
- Manages Zoho OAuth tokens
- Refreshes access tokens automatically (every 55 minutes)
- Sends data to Zoho CRM API v8

## 🎨 Customization

### Change which Zoho module to use:

Edit `.env`:
```env
ZOHO_MODULE=Contacts  # or Deals, Accounts, etc.
```

### Change field mapping:

Edit `src/webhookHandler.js` - `parseDataForZoho()` function:

```javascript
const zohoRecord = {
  First_Name: uploader_name?.split(' ')[0],
  Last_Name: uploader_name?.split(' ').slice(1).join(' '),
  Email: uploader_email,
  
  // ADD YOUR CUSTOM FIELDS HERE
  Custom_Field: pipefileData.custom_field,
};
```

## ⚠️ Important Notes

1. **Zoho Field Names**: The field names in the code must match your Zoho CRM setup
   - Go to Zoho CRM → Settings → Modules → Your Module → Fields
   - Use the **API Name** (not the display name)

2. **Token Expiry**: Access tokens expire every 1 hour
   - The code automatically refreshes them
   - Refresh tokens never expire

3. **ngrok for Testing**: ngrok URLs change every time you restart
   - Update Pipefile webhook URL when ngrok URL changes
   - In production, use a permanent domain

## 🐛 Common Issues

### "Zoho authentication failed"
→ Check your credentials in `.env`
→ Generate a new refresh token if needed

### "Field does not exist"
→ Check Zoho field API names
→ Update field names in `webhookHandler.js`

### "Webhook not receiving data"
→ Check ngrok is running
→ Verify webhook URL in Pipefile
→ Check server logs

## 📚 Next Steps

1. ✅ Get Zoho OAuth credentials (see README.md)
2. ✅ Update `.env` with your credentials
3. ✅ Start the server with `npm run dev`
4. ✅ Test with curl command above
5. ✅ Set up ngrok for Pipefile webhooks
6. ✅ Register webhook in Pipefile
7. ✅ Upload a file in Pipefile to test!

---

**Need detailed setup instructions?** See `README.md`

**Ready to test?** Run `npm run dev` and upload a file in Pipefile!
