import { supabaseServer } from './supabaseServer';

// Interface for notification template
interface NotificationTemplate {
  id: string;
  name: string;
  title_template: string;
  message_template: string;
  type: 'info' | 'success' | 'warning' | 'error';
  channels: string[];
  is_active: boolean;
}

// Interface for template variables
interface TemplateVariables {
  [key: string]: string;
}

/**
 * Replace template variables in a string
 * Variables are in the format {{variable_name}}
 */
function replaceTemplateVariables(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

/**
 * Get notification template by name
 */
async function getNotificationTemplate(templateName: string): Promise<NotificationTemplate | null> {
  try {
    const { data: template, error } = await supabaseServer
      .from('notification_templates')
      .select('*')
      .eq('name', templateName)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      console.error(`Notification template '${templateName}' not found:`, error);
      return null;
    }

    return template;
  } catch (error) {
    console.error(`Error fetching notification template '${templateName}':`, error);
    return null;
  }
}

/**
 * Create notification from template
 */
export async function createNotificationFromTemplate(
  templateName: string,
  userId: string,
  variables: TemplateVariables,
  linkUrl?: string
): Promise<boolean> {
  try {
    // Get the template
    const template = await getNotificationTemplate(templateName);
    if (!template) {
      console.error(`Template '${templateName}' not found or inactive`);
      return false;
    }

    // Replace variables in title and message
    const title = replaceTemplateVariables(template.title_template, variables);
    const message = replaceTemplateVariables(template.message_template, variables);

    // Create notification record
    const notification = {
      user_id: userId,
      type: template.type,
      title,
      message,
      link: linkUrl || variables.listing_url || null,
      is_read: false,
      created_at: new Date().toISOString()
    };

    // Insert notification
    const { error: insertError } = await supabaseServer
      .from('notifications')
      .insert(notification);

    if (insertError) {
      console.error(`Error creating notification from template '${templateName}':`, insertError);
      return false;
    }

    console.log(`Notification created successfully from template '${templateName}' for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error in createNotificationFromTemplate for '${templateName}':`, error);
    return false;
  }
}

/**
 * Create multiple notifications from template
 */
export async function createBulkNotificationsFromTemplate(
  templateName: string,
  userIds: string[],
  variables: TemplateVariables,
  linkUrl?: string
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (const userId of userIds) {
    const success = await createNotificationFromTemplate(templateName, userId, variables, linkUrl);
    if (success) {
      successful++;
    } else {
      failed++;
    }
    
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return { successful, failed };
}

/**
 * Get available notification templates
 */
export async function getAvailableTemplates(): Promise<NotificationTemplate[]> {
  try {
    const { data: templates, error } = await supabaseServer
      .from('notification_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching notification templates:', error);
      return [];
    }

    return templates || [];
  } catch (error) {
    console.error('Error in getAvailableTemplates:', error);
    return [];
  }
}

/**
 * Create or update notification template
 */
export async function upsertNotificationTemplate(
  name: string,
  titleTemplate: string,
  messageTemplate: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  channels: string[] = ['inapp'],
  isActive: boolean = true
): Promise<boolean> {
  try {
    const { error } = await supabaseServer
      .from('notification_templates')
      .upsert({
        name,
        title_template: titleTemplate,
        message_template: messageTemplate,
        type,
        channels,
        is_active: isActive,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'name'
      });

    if (error) {
      console.error(`Error upserting notification template '${name}':`, error);
      return false;
    }

    console.log(`Notification template '${name}' upserted successfully`);
    return true;
  } catch (error) {
    console.error(`Error in upsertNotificationTemplate for '${name}':`, error);
    return false;
  }
}

/**
 * Initialize default notification templates
 */
export async function initializeNotificationTemplates(): Promise<void> {
  try {
    console.log('Initializing default notification templates...');

    // Inspection reminder template
    await upsertNotificationTemplate(
      'inspection_reminder',
      'Inspection Reminder - {{listing_title}}',
      'Hi {{buyer_name}}, your inspection for "{{listing_title}}" ({{material}}) is scheduled in {{hours_until}} hours on {{inspection_date}} at {{inspection_time}}. Location: {{location_address}}. Duration: {{duration_minutes}} minutes. Seller contact: {{seller_name}} ({{seller_phone}}).',
      'info',
      ['inapp', 'email'],
      true
    );

    // Inspection booked template
    await upsertNotificationTemplate(
      'inspection_booked',
      'Inspection Booked - {{listing_title}}',
      'Your inspection for "{{listing_title}}" has been confirmed for {{inspection_date}} at {{inspection_time}}. Location: {{location_address}}.',
      'success',
      ['inapp', 'email'],
      true
    );

    // Inspection cancelled template
    await upsertNotificationTemplate(
      'inspection_cancelled',
      'Inspection Cancelled - {{listing_title}}',
      'Your inspection for "{{listing_title}}" scheduled for {{inspection_date}} at {{inspection_time}} has been cancelled.',
      'info',
      ['inapp', 'email'],
      true
    );

    // New inspection booking (for seller) template
    await upsertNotificationTemplate(
      'new_inspection_booking',
      'New Inspection Booking - {{listing_title}}',
      '{{buyer_name}} has booked an inspection for your listing "{{listing_title}}" on {{inspection_date}} at {{inspection_time}}. Buyer contact: {{buyer_email}}.',
      'info',
      ['inapp', 'email'],
      true
    );

    console.log('Default notification templates initialized successfully');
  } catch (error) {
    console.error('Error initializing notification templates:', error);
  }
}
