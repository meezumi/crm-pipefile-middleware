# 🆕 New Features: Upsert & Attachments

## What's New?

Your webhook now has two powerful new features:

### 1. ✏️ **Upsert Functionality** (Update or Insert)
Instead of always creating new leads, the system now:
- 🔍 **Searches** for existing leads by email
- 📝 **Updates** the lead if found
- ➕ **Creates** a new lead if not found

This prevents duplicate leads!

### 2. 📎 **Automatic Attachment Upload**
When a file is uploaded in Pipefile:
- 🌐 Downloads the file from the `file_url`
- 📤 Uploads it to the Zoho Lead as an attachment
- ✅ Links it to the correct lead record

---

## How It Works

```
Pipefile Webhook
      ↓
[1] Parse webhook data
      ↓
[2] Search Zoho for existing lead by email
      ↓
   ┌─────────┐
   │ Found?  │
   └─────────┘
      ↓           ↓
    YES          NO
      ↓           ↓
   UPDATE      CREATE
   existing     new
   lead         lead
      ↓           ↓
      └───────┬───┘
              ↓
[3] Download file from Pipefile
              ↓
[4] Upload as attachment to Zoho Lead
              ↓
            DONE ✅
```

---

## Test It!

### Test 1: Create a New Lead with Attachment

Run this in a new terminal:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "file_request.file_uploaded",
    "data": {
      "file_id": "abc123",
      "file_name": "contract.pdf",
      "file_url": "https://example.com/sample.pdf",
      "uploaded_at": "2025-11-11T16:00:00Z",
      "uploader_name": "Alice Johnson",
      "uploader_email": "alice@example.com"
    }
  }'
```

**Expected Result:**
- ✅ New Lead created in Zoho
- ✅ File attached to the Lead
- Console shows: `action: "created"`

---

### Test 2: Update the Same Lead

Run the **same email** again with different data:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "file_request.file_uploaded",
    "data": {
      "file_id": "xyz789",
      "file_name": "invoice.pdf",
      "file_url": "https://example.com/sample.pdf",
      "uploaded_at": "2025-11-11T17:00:00Z",
      "uploader_name": "Alice Johnson",
      "uploader_email": "alice@example.com"
    }
  }'
```

**Expected Result:**
- ✅ **Existing** Lead updated (no duplicate created)
- ✅ New file attached to the **same** Lead
- Console shows: `action: "updated"`

Check Zoho - Alice's lead should have **2 attachments** now!

---

## What Gets Updated?

When updating an existing lead, these fields are refreshed:

- `First_Name` / `Last_Name` (if name changed)
- `Description` (updated with latest file name)
- `Pipefile_File_ID` (latest file ID)
- `Pipefile_File_Name` (latest file name)
- `Pipefile_File_URL` (latest file URL)
- `Pipefile_Upload_Date` (latest upload timestamp)

**Note:** Email is used for searching, so if the email changes, a new lead will be created.

---

## Configuration Options

### Change the Search Field

By default, the system searches by `Email`. To use a different field (e.g., `Phone`), edit `src/webhookHandler.js`:

```javascript
// Line ~43: Change 'Email' to your preferred field
const zohoResponse = await upsertToZoho(zohoData, 'Phone');
```

### Disable Upsert (Always Create New)

If you want to always create new leads without checking for duplicates, edit `src/webhookHandler.js`:

```javascript
// Replace this line:
const zohoResponse = await upsertToZoho(zohoData, 'Email');

// With this:
const zohoResponse = await sendToZoho(zohoData);
```

Don't forget to import `sendToZoho`:
```javascript
import { sendToZoho, uploadAttachment } from './zohoClient.js';
```

---

## New API Functions Added

### `upsertToZoho(recordData, searchField)`
Creates or updates a record based on search field.

```javascript
const result = await upsertToZoho(zohoData, 'Email');
// Returns: { success: true, recordId: "123", action: "created" or "updated" }
```

### `updateZohoRecord(recordId, recordData)`
Updates an existing Zoho record by ID.

```javascript
await updateZohoRecord('123456789', { First_Name: 'Updated' });
```

### `uploadAttachment(recordId, fileUrl, fileName)`
Downloads a file from URL and uploads it to Zoho record.

```javascript
await uploadAttachment('123456789', 'https://example.com/file.pdf', 'file.pdf');
```

### `searchZoho(module, field, value)`
Searches for records matching criteria.

```javascript
const results = await searchZoho('Leads', 'Email', 'test@example.com');
```

---

## Error Handling

### If Attachment Upload Fails

The system continues processing even if the attachment fails. You'll see:

```
⚠️  Failed to upload attachment: <error message>
```

The lead is still created/updated successfully!

### Common Issues

**File URL not accessible:**
- Ensure Pipefile's `file_url` is publicly accessible
- Check if authentication is required for file downloads

**File too large:**
- Zoho has a 20MB limit per attachment
- Large files may timeout during download

**Network issues:**
- The server needs internet access to download files
- Check firewall/proxy settings

---

## Checking Attachments in Zoho

1. Go to **Zoho CRM**
2. Open the **Lead** record
3. Scroll to the **Attachments** section
4. You'll see all uploaded files with:
   - File name
   - Upload date
   - Download link

---

## Production Considerations

### File Download Security

Currently, the system downloads files without authentication. If your Pipefile files require authentication:

```javascript
// In zohoClient.js, modify the download request:
const fileResponse = await axios.get(fileUrl, {
  responseType: 'arraybuffer',
  headers: {
    'Authorization': 'Token YOUR_PIPEFILE_TOKEN'
  }
});
```

### Large Files

For large files, consider:
- Adding progress tracking
- Implementing retry logic
- Using streaming instead of loading entire file in memory

### Rate Limits

Zoho API has rate limits:
- 5,000 API calls per organization per day
- Each upsert = 1 search + 1 create/update = 2 API calls
- Each attachment upload = 1 API call

**Total per webhook: 3 API calls**

---

## Next Steps

✅ Features Working:
- Upsert functionality (no duplicates)
- Automatic attachment uploads

📋 Optional Enhancements:
- Add duplicate detection by other fields (Phone, Name, etc.)
- Implement batch processing for multiple files
- Add attachment validation (file type, size checks)
- Store attachment IDs in custom fields

---

## Summary

Your integration now intelligently handles leads:

| Before | After |
|--------|-------|
| Always creates new leads | Updates existing leads by email |
| File URLs stored as text | Files automatically attached |
| Manual duplicate checking | Automatic duplicate prevention |

**Result:** Cleaner CRM data and better file management! 🎉

---

Need help? Check the console logs - they show exactly what's happening at each step!
