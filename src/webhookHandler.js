import { upsertToZoho, uploadAttachmentUrl } from './zohoClient.js';

/**
 * Main webhook handler for Pipefile file_request.file_uploaded events
 */
export const handlePipefileWebhook = async (req, res) => {
  try {
    console.log('\n📥 Webhook received from Pipefile');
    console.log('Full payload:', JSON.stringify(req.body, null, 2));

    const { hook, data } = req.body;

    if (!hook || !data) {
      console.log('❌ Invalid webhook payload - missing hook or data');
      return res.status(400).json({ success: false, error: 'Invalid webhook payload' });
    }

    const { event } = hook;
    console.log(`\n📊 Event: ${event}`);

    if (event !== 'file_request.file_uploaded') {
      console.log(`⏭️  Ignoring event: ${event}`);
      return res.status(200).json({ success: true, message: 'Event not processed' });
    }

    console.log('✅ Valid file upload event received');
    console.log('\n📋 Processing webhook data...');

    console.log(`\n🔗 Webhook Info:`);
    console.log(`   ID: ${hook.id}`);
    console.log(`   Event: ${hook.event}`);
    console.log(`   Target: ${hook.target}`);
    console.log(`   Created: ${hook.created}`);

    const zohoData = parseDataForZoho(data);

    console.log('\n📤 Upserting data to Zoho CRM (create or update)...');
    const zohoResponse = await upsertToZoho(zohoData, 'Email');

    console.log(`✅ Successfully ${zohoResponse.action} record in Zoho CRM`);
    console.log('Zoho Record ID:', zohoResponse.recordId);

    // Attach file URL to Zoho if available
    if (data.file_pipe?.key) {
      try {
        // Construct the file pipe URL (user can provide custom URL format)
        const fileUrl = `https://api.pipefile.com/v1/file_pipes/${data.file_pipe.key}`;
        console.log('\n🔗 Attaching file URL to Zoho record...');
        const attachmentResponse = await uploadAttachmentUrl(
          zohoResponse.recordId,
          fileUrl
        );
        console.log('✅ File URL attached successfully');
        console.log('Attachment ID:', attachmentResponse.attachmentId);
      } catch (attachmentError) {
        console.error('⚠️  Failed to attach file URL:', attachmentError.message);
        // Continue even if attachment fails
      }
    }

    console.log('\n✅ ═══════════════════════════════════════════════════════');
    console.log('✅ WEBHOOK PROCESSED SUCCESSFULLY');
    console.log('✅ ═══════════════════════════════════════════════════════');
    console.log(`   Action: ${zohoResponse.action.toUpperCase()}`);
    console.log(`   Zoho Record ID: ${zohoResponse.recordId}`);
    console.log(`   Files Processed: ${data.file_pipe?.num_files || 0}`);
    console.log(`   Unreviewed Files: ${data.unreviewed_files || 0}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log('✅ ═══════════════════════════════════════════════════════\n');

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: {
        action: zohoResponse.action,
        zohoRecordId: zohoResponse.recordId,
        filesProcessed: data.file_pipe?.num_files || 0,
        unreviewedFiles: data.unreviewed_files || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing webhook:', error.message);
    res.status(200).json({ success: false, error: error.message });
  }
};

/**
 * Parse Pipefile webhook data and format for Zoho CRM
 */
function parseDataForZoho(pipefileData) {
  console.log('\n🔄 Parsing Pipefile data for Zoho CRM...');

  // Extract user information
  const user = pipefileData.user || {};
  const uploader_name = user.name || 'Unknown';
  const uploader_email = user.email || null;

  // Extract file pipe information
  const file_pipe = pipefileData.file_pipe || {};
  const num_files = file_pipe.num_files || 0;
  const unreviewed_files = pipefileData.unreviewed_files || 0;

  // Extract request information
  const request_id = pipefileData.id || null;
  const status = pipefileData.status || 'unknown';
  const subject = pipefileData.subject || 'File Request';
  const message = pipefileData.message || '';
  const tags = pipefileData.tags || [];
  const created_at = pipefileData.created_at || new Date().toISOString();
  const last_modified = pipefileData.last_modified || new Date().toISOString();

  // Extract recipients
  const recipients = pipefileData.recipients || [];
  const recipients_count = recipients.length;

  // Extract items
  const items = pipefileData.items || [];
  const items_count = items.length;
  const required_items = items.filter(item => item.required).length;
  const responded_items = items.filter(item => item.responded).length;

  // Log statistics
  console.log(`\n📊 Request Statistics:`);
  console.log(`   Request ID: ${request_id}`);
  console.log(`   Status: ${status}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Total Files in Pipe: ${num_files}`);
  console.log(`   Unreviewed Files: ${unreviewed_files}`);
  console.log(`   Reviewed Files: ${num_files - unreviewed_files}`);
  
  console.log(`\n👥 Recipient Information:`);
  console.log(`   Total Recipients: ${recipients_count}`);
  recipients.forEach((recipient, index) => {
    console.log(`   Recipient ${index + 1}: ${recipient.name} (${recipient.email})`);
  });

  console.log(`\n📄 File Request Items:`);
  console.log(`   Total Items: ${items_count}`);
  console.log(`   Required Items: ${required_items}`);
  console.log(`   Responded Items: ${responded_items}`);
  items.forEach((item, index) => {
    const status = item.responded ? '✅ Responded' : '⏳ Pending';
    const required = item.required ? '[Required]' : '[Optional]';
    console.log(`   Item ${index + 1}: ${item.name} [${status}] ${required}`);
  });

  console.log(`\n🏷️  Tags: ${tags.length > 0 ? tags.join(', ') : 'None'}`);
  console.log(`   Created: ${created_at}`);
  console.log(`   Last Modified: ${last_modified}`);

  // Format for Zoho CRM
  const zohoRecord = {
    First_Name: uploader_name?.split(' ')[0] || 'Unknown',
    Last_Name: uploader_name?.split(' ').slice(1).join(' ') || 'User',
    Email: uploader_email || null,
    Description: `${subject}\n\n${message}\n\nFiles: ${num_files} | Unreviewed: ${unreviewed_files}`,
    Lead_Source: 'Pipefile',
    Pipefile_Request_ID: request_id,
    Pipefile_Status: status,
    Pipefile_Subject: subject,
    Pipefile_Total_Files: num_files,
    Pipefile_Unreviewed_Files: unreviewed_files,
    Pipefile_Recipients_Count: recipients_count,
    Pipefile_Items_Count: items_count,
    Pipefile_Required_Items: required_items,
    Pipefile_Responded_Items: responded_items,
    Pipefile_Tags: tags.join(', '),
    Pipefile_Created_At: created_at,
    Pipefile_Last_Modified: last_modified,
  };

  console.log('\n✅ Data parsed successfully');
  console.log('Zoho record:', JSON.stringify(zohoRecord, null, 2));

  return zohoRecord;
}
