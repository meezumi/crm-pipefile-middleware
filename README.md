# Pipefile to Zoho CRM Webhook Integration

A simple Node.js webhook receiver that captures file upload events from Pipefile and sends the data to Zoho CRM.

## 🎯 What This Does

```
Pipefile File Upload → Webhook → This Server → Zoho CRM API
```

When a file is uploaded in Pipefile:
1. ✅ Pipefile sends a webhook POST request to your server
2. ✅ Your server receives and parses the data
3. ✅ Data is formatted for Zoho CRM
4. ✅ A new record is created in Zoho CRM

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3000

# Get these from Zoho API Console
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
ZOHO_API_DOMAIN=https://www.zohoapis.in

# Which Zoho module to create records in
ZOHO_MODULE=Leads
```

### 3. Get Zoho CRM Credentials

#### Step 1: Create Zoho OAuth App

1. Go to [Zoho API Console](https://api-console.zoho.in/)
2. Click **Add Client** → **Server-based Applications**
3. Fill in:
   - **Client Name**: Pipefile Integration
   - **Homepage URL**: http://localhost:3000
   - **Authorized Redirect URI**: http://localhost:3000/callback
4. Click **Create**
5. Copy your **Client ID** and **Client Secret**

#### Step 2: Generate Refresh Token

Visit this URL in your browser (replace `CLIENT_ID` and `REDIRECT_URI`):

```
https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=http://localhost:3000/callback
```

After authorizing, you'll be redirected to a URL with a `code` parameter. Copy this code.

Then run this command (replace values):

```bash
curl -X POST https://accounts.zoho.in/oauth/v2/token \
  -d "code=YOUR_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "grant_type=authorization_code"
```

Copy the `refresh_token` from the response and add it to your `.env` file.

### 4. Start the Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

You should see:

```
🚀 Webhook receiver running on port 3000
📡 Webhook URL: http://localhost:3000/webhook
🏥 Health check: http://localhost:3000/health
```

### 5. Expose Your Local Server (for Pipefile webhooks)

Since Pipefile needs to send webhooks to your server, you need to expose your localhost.

#### Using ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

### 6. Configure Pipefile Webhook

Make a POST request to Pipefile API to create the webhook:

```bash
curl -X POST https://api.pipefile.com/v1/webhooks/ \
  -H "Authorization: Bearer YOUR_PIPEFILE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "file_request.file_uploaded",
    "target": "https://YOUR-NGROK-URL.ngrok.io/webhook"
  }'
```

Response:

```json
{
  "id": 3,
  "event": "file_request.file_uploaded",
  "target": "https://YOUR-NGROK-URL.ngrok.io/webhook",
  "created": "2024-01-17T09:15:00Z"
}
```

## 🧪 Testing

### Test the health endpoint:

```bash
curl http://localhost:3000/health
```

### Test webhook endpoint manually:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "file_request.file_uploaded",
    "data": {
      "file_id": "test123",
      "file_name": "test.csv",
      "file_url": "https://example.com/file.csv",
      "uploaded_at": "2025-11-11T10:00:00Z",
      "uploader_name": "John Doe",
      "uploader_email": "john@example.com"
    }
  }'
```

Expected response:

```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "zohoRecordId": "4567890123456"
}
```

## 📁 Project Structure

```
.
├── src/
│   ├── server.js           # Express app & routes
│   ├── webhookHandler.js   # Receives & processes Pipefile webhooks
│   └── zohoClient.js       # Handles Zoho CRM API calls
├── .env.example            # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Customization

### Change Zoho Module

Edit `.env`:

```env
ZOHO_MODULE=Contacts  # or Deals, Accounts, etc.
```

### Customize Field Mapping

Edit `src/webhookHandler.js` in the `parseDataForZoho` function:

```javascript
const zohoRecord = {
  First_Name: uploader_name?.split(' ')[0] || 'Unknown',
  Last_Name: uploader_name?.split(' ').slice(1).join(' ') || 'User',
  Email: uploader_email || null,
  
  // Add your custom fields here
  Custom_Field_1: pipefileData.some_field,
  Custom_Field_2: pipefileData.another_field,
};
```

## 📊 Monitoring

Watch the console logs to see what's happening:

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

## 🐛 Troubleshooting

### "Zoho authentication failed"

- Check your `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, and `ZOHO_REFRESH_TOKEN`
- Make sure the refresh token is valid
- Try generating a new refresh token

### "Webhook not receiving data"

- Check if ngrok is still running
- Verify the webhook URL in Pipefile is correct
- Check server logs for errors

### "Field does not exist" error from Zoho

- The field names in `parseDataForZoho()` must match your Zoho CRM setup
- Go to Zoho CRM → Settings → Modules → Your Module → Fields
- Check the **API Name** of each field
- Update the field names in the code accordingly

## 🔐 Security Best Practices

- ✅ Never commit `.env` file
- ✅ Use HTTPS in production (not HTTP)
- ✅ Consider adding webhook signature verification
- ✅ Add rate limiting for production
- ✅ Validate all incoming data

## 📚 API Documentation

- [Pipefile API](https://pipefile.com/docs/api)
- [Pipefile Webhooks](https://api.pipefile.com/v1/webhooks/)
- [Zoho CRM API v8](https://www.zoho.com/crm/developer/docs/api/v8/)
- [Zoho OAuth Guide](https://www.zoho.com/crm/developer/docs/api/v8/auth-request.html)

## 🚀 Deployment

For production deployment:

1. Deploy to a cloud platform (Heroku, AWS, DigitalOcean, etc.)
2. Set environment variables in your hosting platform
3. Update Pipefile webhook URL to your production URL
4. Enable HTTPS
5. Add proper error handling and retry logic
6. Set up monitoring and alerts

## ❓ FAQ

**Q: Can I process multiple files at once?**  
A: Yes! Modify `parseDataForZoho()` to handle arrays and batch create records in Zoho.

**Q: Can I update existing records instead of creating new ones?**  
A: Yes! Use the `searchZoho()` function to find existing records, then use Zoho's update API.

**Q: What if Zoho is down?**  
A: The webhook returns an error. You can implement a queue system to retry later.

**Q: Can I use this with other events besides file uploads?**  
A: Yes! Just modify the event check in `webhookHandler.js` to handle other Pipefile events.

---

Need help? Check the console logs - they show exactly what's happening at each step!
