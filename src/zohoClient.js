import axios from 'axios';

/**
 * Zoho CRM API Client
 * 
 * This module handles all communication with Zoho CRM API v8
 * - Manages OAuth authentication
 * - Refreshes access tokens automatically
 * - Sends data to Zoho CRM
 */

// Token cache
let accessToken = null;
let tokenExpiry = null;

/**
 * Get a valid Zoho access token
 * 
 * Zoho uses OAuth 2.0:
 * - Access tokens expire after 1 hour
 * - We use a refresh token to get new access tokens
 * - Refresh tokens never expire
 */
async function getAccessToken() {
  // Return cached token if still valid
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('🔑 Using cached access token');
    return accessToken;
  }

  console.log('🔑 Refreshing Zoho access token...');

  try {
    // Use the correct OAuth domain based on API domain
    // If API domain is .in (India), use accounts.zoho.in
    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
    const oauthDomain = apiDomain.includes('.in') 
      ? 'https://accounts.zoho.in' 
      : 'https://accounts.zoho.com';

    const response = await axios.post(
      `${oauthDomain}/oauth/v2/token`,
      null,
      {
        params: {
          refresh_token: process.env.ZOHO_REFRESH_TOKEN,
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          grant_type: 'refresh_token'
        }
      }
    );

    accessToken = response.data.access_token;
    // Set expiry to 55 minutes (5 min buffer before actual 60 min expiry)
    tokenExpiry = Date.now() + (55 * 60 * 1000);

    console.log('✅ Access token refreshed successfully');
    return accessToken;

  } catch (error) {
    console.error('❌ Failed to refresh access token:', error.response?.data || error.message);
    throw new Error('Zoho authentication failed');
  }
}

/**
 * Send data to Zoho CRM
 * 
 * Creates a new record in the specified Zoho module
 * 
 * @param {Object} recordData - The data to send to Zoho
 * @returns {Object} Response with record ID
 */
export async function sendToZoho(recordData) {
  try {
    // Get valid access token
    const token = await getAccessToken();

    // Get the module to create record in (Leads, Contacts, Deals, etc.)
    const module = process.env.ZOHO_MODULE || 'Leads';
    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

    // Prepare the request
    const url = `${apiDomain}/crm/v8/${module}`;
    const payload = {
      data: [recordData]
    };

    console.log(`📤 Sending to Zoho CRM module: ${module}`);
    console.log(`URL: ${url}`);

    // Make API request to Zoho
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Check response
    if (response.data.data && response.data.data[0].code === 'SUCCESS') {
      const recordId = response.data.data[0].details.id;
      console.log('✅ Record created successfully in Zoho CRM');
      console.log(`Record ID: ${recordId}`);
      
      return {
        success: true,
        recordId: recordId,
        module: module
      };
    } else {
      console.error('❌ Zoho API returned error:', response.data);
      throw new Error('Failed to create record in Zoho');
    }

  } catch (error) {
    console.error('❌ Error sending to Zoho CRM:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Search for existing records in Zoho
 * Useful to avoid creating duplicates
 * 
 * @param {string} module - Zoho module name (Leads, Contacts, etc.)
 * @param {string} field - Field to search by
 * @param {string} value - Value to search for
 * @returns {Array} Array of matching records
 */
export async function searchZoho(module, field, value) {
  try {
    const token = await getAccessToken();
    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

    console.log(`🔍 Searching Zoho for ${field}=${value} in ${module}`);

    const response = await axios.get(
      `${apiDomain}/crm/v8/${module}/search`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        },
        params: {
          criteria: `(${field}:equals:${value})`
        }
      }
    );

    const results = response.data.data || [];
    console.log(`✅ Found ${results.length} matching record(s)`);
    return results;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️  No matching records found');
      return []; // No records found
    }
    throw error;
  }
}

/**
 * Update an existing record in Zoho CRM
 * 
 * @param {string} recordId - The ID of the record to update
 * @param {Object} recordData - The data to update
 * @returns {Object} Response with record ID
 */
export async function updateZohoRecord(recordId, recordData) {
  try {
    const token = await getAccessToken();
    const module = process.env.ZOHO_MODULE || 'Leads';
    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

    const url = `${apiDomain}/crm/v8/${module}/${recordId}`;
    const payload = {
      data: [recordData]
    };

    console.log(`📝 Updating Zoho record: ${recordId}`);

    const response = await axios.put(url, payload, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.data && response.data.data[0].code === 'SUCCESS') {
      console.log('✅ Record updated successfully in Zoho CRM');
      return {
        success: true,
        recordId: recordId,
        module: module,
        action: 'updated'
      };
    } else {
      console.error('❌ Zoho API returned error:', response.data);
      throw new Error('Failed to update record in Zoho');
    }
  } catch (error) {
    console.error('❌ Error updating Zoho record:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Upload attachment to a Zoho CRM record
 * Downloads the file from the provided URL and uploads it to Zoho
 * 
 * @param {string} recordId - The ID of the record to attach the file to
 * @param {string} fileUrl - URL of the file to download and upload
 * @param {string} fileName - Name of the file
 * @returns {Object} Response with attachment ID
 */
export async function uploadAttachment(recordId, fileUrl, fileName) {
  try {
    const token = await getAccessToken();
    const module = process.env.ZOHO_MODULE || 'Leads';
    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

    console.log(`📎 Downloading file from: ${fileUrl}`);

    // Download the file from Pipefile as a buffer
    const fileResponse = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    });

    const fileBuffer = Buffer.from(fileResponse.data);
    console.log(`✅ File downloaded (${fileBuffer.length} bytes)`);

    // Upload to Zoho CRM using form-data
    // According to Zoho API v8 docs: https://www.zoho.com/crm/developer/docs/api/v8/upload-attachment.html
    // Use -F "file=@filename" format
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Append the file buffer as a file upload (mimicking -F "file=@filename")
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: fileResponse.headers['content-type'] || 'application/octet-stream'
    });

    // Zoho CRM v8 attachment endpoint
    const url = `${apiDomain}/crm/v8/${module}/${recordId}/Attachments`;
    console.log(`📤 Uploading attachment to Zoho record: ${recordId}`);
    console.log(`URL: ${url}`);
    console.log(`File: ${fileName} (${fileBuffer.length} bytes)`);

    const response = await axios.post(url, formData, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        ...formData.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data[0].code === 'SUCCESS') {
      const attachmentId = response.data.data[0].details.id;
      console.log(`✅ Attachment uploaded successfully (ID: ${attachmentId})`);
      return {
        success: true,
        attachmentId: attachmentId,
        fileName: fileName
      };
    } else {
      console.error('❌ Zoho API returned error:', response.data);
      throw new Error('Failed to upload attachment');
    }
  } catch (error) {
    console.error('❌ Error uploading attachment:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Upload attachment URL to a Zoho CRM record (link only, no file download)
 * Directly sends the URL to Zoho without downloading the file
 * 
 * @param {string} recordId - The ID of the record to attach the link to
 * @param {string} attachmentUrl - URL to attach
 * @returns {Object} Response with attachment ID
 */
export async function uploadAttachmentUrl(recordId, attachmentUrl) {
  try {
    const token = await getAccessToken();
    const module = process.env.ZOHO_MODULE || 'Leads';
    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

    console.log(`🔗 Uploading attachment URL to Zoho: ${attachmentUrl}`);

    // Upload URL to Zoho CRM using form-data
    // According to Zoho API v8 docs: use -F "attachmentUrl=https://..."
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('attachmentUrl', attachmentUrl);

    const url = `${apiDomain}/crm/v8/${module}/${recordId}/Attachments`;
    console.log(`📤 Uploading attachment URL to Zoho record: ${recordId}`);

    const response = await axios.post(url, formData, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        ...formData.getHeaders()
      }
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data[0].code === 'SUCCESS') {
      const attachmentId = response.data.data[0].details.id;
      console.log(`✅ Attachment URL uploaded successfully (ID: ${attachmentId})`);
      return {
        success: true,
        attachmentId: attachmentId,
        attachmentUrl: attachmentUrl
      };
    } else {
      console.error('❌ Zoho API returned error:', response.data);
      throw new Error('Failed to upload attachment URL');
    }
  } catch (error) {
    console.error('❌ Error uploading attachment URL:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Create or update a record in Zoho (upsert operation)
 * Searches for existing record by email, updates if found, creates if not
 * 
 * @param {Object} recordData - The data to send to Zoho
 * @param {string} searchField - Field to search by (default: Email)
 * @returns {Object} Response with record ID and action taken
 */
export async function upsertToZoho(recordData, searchField = 'Email') {
  try {
    const module = process.env.ZOHO_MODULE || 'Leads';
    const searchValue = recordData[searchField];

    if (!searchValue) {
      console.log('⚠️  No search value provided, creating new record');
      const result = await sendToZoho(recordData);
      return { ...result, action: 'created' };
    }

    // Search for existing record
    const existingRecords = await searchZoho(module, searchField, searchValue);

    if (existingRecords.length > 0) {
      // Update existing record
      const existingRecord = existingRecords[0];
      console.log(`📝 Found existing record (ID: ${existingRecord.id}), updating...`);
      return await updateZohoRecord(existingRecord.id, recordData);
    } else {
      // Create new record
      console.log('➕ No existing record found, creating new one...');
      const result = await sendToZoho(recordData);
      return { ...result, action: 'created' };
    }
  } catch (error) {
    console.error('❌ Error in upsert operation:', error.message);
    throw error;
  }
}
