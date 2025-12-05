# System Architecture & Flow Diagram

## 🎯 Overview

This document explains exactly how the Pipefile to Zoho CRM webhook integration works.

## 📊 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                      PIPEFILE PLATFORM                           │
│                                                                  │
│  User uploads file → file_request.file_uploaded event            │
│                                                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ HTTP POST Webhook
                             │ https://your-server.com/webhook
                             │
                             │ Payload:
                             │ {
                             │   "event": "file_request.file_uploaded",
                             │   "data": {
                             │     "file_id": "...",
                             │     "file_name": "...",
                             │     "uploader_email": "..."
                             │   }
                             │ }
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                   YOUR WEBHOOK RECEIVER                          │
│                   (Node.js + Express)                            │ 
│                   localhost:3000                                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  POST /webhook  (src/server.js)                        │      │
│  │                                                        │      │
│  │  Receives the POST request from Pipefile               │      │
│  └──────────────────────┬─────────────────────────────────┘      │
│                         │                                        │
│                         ▼                                        │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  handlePipefileWebhook  (src/webhookHandler.js)        │      │
│  │                                                        │      │
│  │  1. Validate payload (check event & data exist)        │      │
│  │  2. Check if event is "file_request.file_uploaded"     │      │
│  │  3. Parse the data from Pipefile                       │      │
│  └──────────────────────┬─────────────────────────────────┘      │
│                         │                                        │
│                         ▼                                        │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  parseDataForZoho()  (src/webhookHandler.js)           │      │
│  │                                                        │      │
│  │  Transform Pipefile data → Zoho format:                │      │
│  │                                                        │      │
│  │  Pipefile:                  Zoho:                      │      │
│  │  {                          {                          │      │
│  │    "uploader_name": "..."     "First_Name": "..."      │      │
│  │    "uploader_email": "..."    "Last_Name": "..."       │      │
│  │    "file_id": "..."           "Email": "..."           │      │
│  │  }                            "Pipefile_File_ID": "..."│      │
│  │                             }                          │      │
│  └──────────────────────┬─────────────────────────────────┘      │
│                         │                                        │
│                         ▼                                        │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  sendToZoho()  (src/zohoClient.js)                     │      │
│  │                                                        │      │
│  │  1. Get/Refresh OAuth access token                     │      │
│  │  2. POST to Zoho CRM API v8                            │      │
│  │  3. Create record in specified module                  │      │
│  └──────────────────────┬─────────────────────────────────┘      │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ HTTPS POST
                          │ POST /crm/v8/Leads
                          │ Authorization: Zoho-oauthtoken {token}
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                        ZOHO CRM API v8                           │
│                   https://www.zohoapis.com/crm/v8/               │
│                                                                  │
│  Creates new record in Leads module                              │
│                                                                  │
│  Returns:                                                        │
│  {                                                               │
│    "data": [{                                                    │
│      "code": "SUCCESS",                                          │
│      "details": {                                                │
│        "id": "4567890123456"                                     │
│      }                                                           │
│    }]                                                            │
│  }                                                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 Detailed Flow with Example

### Step 1: File Upload in Pipefile

User uploads `customers.csv` to Pipefile

### Step 2: Pipefile Sends Webhook

```json
POST http://localhost:3000/webhook
Content-Type: application/json

{
  "event": "file_request.file_uploaded",
  "data": {
    "file_id": "file_abc123",
    "file_name": "customers.csv",
    "file_url": "https://pipefile.com/files/abc123",
    "uploaded_at": "2025-11-11T10:30:00Z",
    "uploader_name": "John Doe",
    "uploader_email": "john@example.com"
  }
}
```

### Step 3: Your Server Receives Webhook

**File**: `src/server.js`

```javascript
app.post('/webhook', handlePipefileWebhook);
```

Routes the request to the handler function.

### Step 4: Webhook Handler Processes Request

**File**: `src/webhookHandler.js`

```javascript
// Extract data
const { event, data } = req.body;

// Validate
if (event !== 'file_request.file_uploaded') {
  return res.status(200).json({ message: 'Event ignored' });
}

// Parse data
const zohoData = parseDataForZoho(data);
```

Console output:
```
📥 Webhook received from Pipefile
Event: file_request.file_uploaded
✅ Valid file upload event received
🔄 Parsing data for Zoho CRM...
```

### Step 5: Data Transformation

**File**: `src/webhookHandler.js` - `parseDataForZoho()`

**Input** (from Pipefile):
```json
{
  "file_id": "file_abc123",
  "file_name": "customers.csv",
  "uploader_name": "John Doe",
  "uploader_email": "john@example.com"
}
```

**Output** (for Zoho):
```json
{
  "First_Name": "John",
  "Last_Name": "Doe",
  "Email": "john@example.com",
  "Description": "File uploaded via Pipefile: customers.csv",
  "Lead_Source": "Pipefile",
  "Pipefile_File_ID": "file_abc123",
  "Pipefile_File_Name": "customers.csv"
}
```

Console output:
```
✅ Data parsed successfully
Zoho record: {
  "First_Name": "John",
  "Last_Name": "Doe",
  ...
}
```

### Step 6: Send to Zoho CRM

**File**: `src/zohoClient.js` - `sendToZoho()`

#### 6a: Get Access Token

```javascript
// Check if cached token is still valid
if (accessToken && Date.now() < tokenExpiry) {
  return accessToken;
}

// Refresh token
POST https://accounts.zoho.com/oauth/v2/token
{
  refresh_token: "...",
  client_id: "...",
  client_secret: "...",
  grant_type: "refresh_token"
}
```

Console output:
```
🔑 Refreshing Zoho access token...
✅ Access token refreshed successfully
```

#### 6b: Create Record in Zoho

```javascript
POST https://www.zohoapis.com/crm/v8/Leads
Authorization: Zoho-oauthtoken {access_token}
Content-Type: application/json

{
  "data": [{
    "First_Name": "John",
    "Last_Name": "Doe",
    "Email": "john@example.com",
    "Description": "File uploaded via Pipefile: customers.csv",
    "Lead_Source": "Pipefile",
    "Pipefile_File_ID": "file_abc123",
    "Pipefile_File_Name": "customers.csv"
  }]
}
```

Console output:
```
📤 Sending to Zoho CRM module: Leads
URL: https://www.zohoapis.com/crm/v8/Leads
✅ Record created successfully in Zoho CRM
Record ID: 4567890123456
```

### Step 7: Response to Pipefile

**File**: `src/webhookHandler.js`

```javascript
res.status(200).json({
  success: true,
  message: 'Webhook processed successfully',
  zohoRecordId: '4567890123456'
});
```

Console output:
```
✅ Successfully sent to Zoho CRM
Zoho Record ID: 4567890123456
```

## 🔑 OAuth Token Flow

```
┌─────────────────────────────────────────────┐
│  Token Lifecycle                            │
│                                             │
│  Initial State:                             │
│  ├─ accessToken = null                      │
│  └─ tokenExpiry = null                      │
│                                             │
│  First API Call:                            │
│  ├─ Check: token expired?                   │
│  ├─ Yes → Refresh token                     │
│  ├─ POST /oauth/v2/token                    │
│  ├─ Get new access_token                    │
│  ├─ Cache token + expiry (55 min)           │
│  └─ Use token for API call                  │
│                                             │
│  Subsequent Calls (within 55 min):          │
│  ├─ Check: token expired?                   │
│  ├─ No → Use cached token                   │
│  └─ Make API call                           │
│                                             │
│  After 55 minutes:                          │
│  ├─ Check: token expired?                   │
│  ├─ Yes → Refresh token again               │
│  └─ Repeat cycle                            │
│                                             │
└─────────────────────────────────────────────┘
```

## 🛠️ Code Structure

```
src/
│
├── server.js
│   │
│   ├── Sets up Express app
│   ├── Defines routes:
│   │   ├── GET /health → Health check
│   │   └── POST /webhook → Main webhook endpoint
│   └── Starts server on port 3000
│
├── webhookHandler.js
│   │
│   ├── handlePipefileWebhook(req, res)
│   │   ├── Validates webhook payload
│   │   ├── Checks event type
│   │   ├── Calls parseDataForZoho()
│   │   ├── Calls sendToZoho()
│   │   └── Returns response
│   │
│   └── parseDataForZoho(data)
│       ├── Extracts Pipefile fields
│       ├── Maps to Zoho field names
│       └── Returns formatted object
│
└── zohoClient.js
    │
    ├── getAccessToken()
    │   ├── Checks token cache
    │   ├── Refreshes if expired
    │   └── Returns valid token
    │
    ├── sendToZoho(recordData)
    │   ├── Gets access token
    │   ├── Prepares API request
    │   ├── POSTs to Zoho API
    │   └── Returns record ID
    │
    └── searchZoho(module, field, value)
        └── Optional: Find existing records
```

## 📋 Request/Response Examples

### Pipefile → Your Server

```http
POST /webhook HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "event": "file_request.file_uploaded",
  "data": {
    "file_id": "file_abc123",
    "file_name": "customers.csv",
    "uploader_name": "John Doe",
    "uploader_email": "john@example.com"
  }
}
```

### Your Server → Zoho CRM

```http
POST /crm/v8/Leads HTTP/1.1
Host: www.zohoapis.com
Authorization: Zoho-oauthtoken 1000.abc123xyz...
Content-Type: application/json

{
  "data": [{
    "First_Name": "John",
    "Last_Name": "Doe",
    "Email": "john@example.com",
    "Description": "File uploaded via Pipefile: customers.csv",
    "Lead_Source": "Pipefile",
    "Pipefile_File_ID": "file_abc123"
  }]
}
```

### Zoho CRM → Your Server

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [{
    "code": "SUCCESS",
    "details": {
      "id": "4567890123456",
      "created_time": "2025-11-11T10:30:01Z"
    }
  }]
}
```

### Your Server → Pipefile

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Webhook processed successfully",
  "zohoRecordId": "4567890123456"
}
```

## 🔧 Environment Variables

```
.env file:
┌──────────────────────────────────────┐
│ PORT=3000                            │  Server port
│                                      │
│ ZOHO_CLIENT_ID=1000.ABC123           │  From Zoho API Console
│ ZOHO_CLIENT_SECRET=xyz789            │  From Zoho API Console
│ ZOHO_REFRESH_TOKEN=1000.def456       │  Generated via OAuth
│                                      │
│ ZOHO_API_DOMAIN=                     │  Zoho API endpoint
│   https://www.zohoapis.com           │
│                                      │
│ ZOHO_MODULE=Leads                    │  Target Zoho module
└──────────────────────────────────────┘
```

## ⚡ Quick Test Flow

```bash
# 1. Start server
npm run dev

# 2. Send test webhook
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "file_request.file_uploaded",
    "data": {
      "file_id": "test123",
      "file_name": "test.csv",
      "uploader_name": "Test User",
      "uploader_email": "test@example.com"
    }
  }'

# 3. Check console for output:
# 📥 Webhook received from Pipefile
# ✅ Valid file upload event received
# 🔄 Parsing data for Zoho CRM...
# 📤 Sending to Zoho CRM...
# ✅ Record created successfully
```

## 🎯 Summary

1. **Pipefile** sends webhook when file is uploaded
2. **Your server** receives POST request at `/webhook`
3. **Handler** validates and parses the data
4. **Transformer** converts Pipefile format → Zoho format
5. **Zoho client** authenticates and sends data
6. **Zoho CRM** creates the record
7. **Response** confirms success back to Pipefile

Simple, clean, and effective! 🚀
