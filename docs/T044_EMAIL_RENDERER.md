# T044: Email Renderer

## Overview
Implement an email template rendering system that compiles markdown templates from the database with simple variable substitution (Handlebars-like) and sends emails via nodemailer with a stub provider configuration.

## Implementation Details

### Email Template Renderer
Create a template rendering system that processes markdown templates with variable substitution.

```typescript
// src/lib/email-renderer.ts
import { createClient } from '@/lib/supabaseServer';
import nodemailer from 'nodemailer';

export interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

export interface EmailTemplate {
  code: string;
  channel: string;
  subject: string;
  body_md: string;
  is_active: boolean;
}

export class EmailRenderer {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure nodemailer with stub/development settings
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined,
      // For development - log emails instead of sending
      streamTransport: process.env.NODE_ENV === 'development',
      newline: 'unix',
      buffer: true
    });
  }

  /**
   * Simple template variable substitution
   * Replaces {{variable}} with values from data object
   */
  private renderTemplate(template: string, data: EmailTemplateData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Convert markdown to basic HTML
   * Simple implementation for common markdown features
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n/gim, '<br>')
      // Paragraphs (simple implementation)
      .split('<br><br>')
      .map(p => p.trim() ? `<p>${p}</p>` : '')
      .join('');
  }

  /**
   * Get email template from database
   */
  async getTemplate(templateCode: string): Promise<EmailTemplate | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('code', templateCode)
      .eq('channel', 'email')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Failed to get email template:', error);
      return null;
    }

    return data;
  }

  /**
   * Render and send email
   */
  async sendEmail(
    templateCode: string,
    to: string,
    data: EmailTemplateData,
    options?: {
      from?: string;
      replyTo?: string;
    }
  ): Promise<boolean> {
    try {
      const template = await this.getTemplate(templateCode);
      if (!template) {
        console.error(`Email template not found: ${templateCode}`);
        return false;
      }

      // Render subject and body with data
      const subject = this.renderTemplate(template.subject, data);
      const bodyMarkdown = this.renderTemplate(template.body_md, data);
      const bodyHtml = this.markdownToHtml(bodyMarkdown);

      // Create email options
      const mailOptions = {
        from: options?.from || process.env.SMTP_FROM || 'noreply@matex.ca',
        to,
        subject,
        html: this.wrapInEmailLayout(bodyHtml, subject),
        text: bodyMarkdown, // Plain text fallback
        replyTo: options?.replyTo
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Email would be sent:', {
          to,
          subject,
          body: bodyMarkdown
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Wrap email content in basic HTML layout
   */
  private wrapInEmailLayout(content: string, subject: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-bottom: 2px solid #007bff;
        }
        .content {
            padding: 20px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
        }
        a {
            color: #007bff;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>MatEx</h1>
        <p>Canadian Waste Materials Exchange</p>
    </div>
    <div class="content">
        ${content}
    </div>
    <div class="footer">
        <p>This email was sent by MatEx. If you no longer wish to receive these emails, please contact support.</p>
        <p>&copy; 2024 MatEx. All rights reserved.</p>
    </div>
</body>
</html>`;
  }
}

// Singleton instance
export const emailRenderer = new EmailRenderer();
```

### Email Template Seeding
Create default email templates in the database.

```typescript
// scripts/seed-email-templates.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const emailTemplates = [
  {
    code: 'bid_received',
    channel: 'email',
    subject: 'New Bid Received - {{listingTitle}}',
    body_md: `# New Bid Received

Hello {{sellerName}},

Great news! **{{bidderName}}** has placed a bid of **${{bidAmount}}** on your listing "{{listingTitle}}".

## Listing Details
- **Item**: {{listingTitle}}
- **New Bid**: ${{bidAmount}}
- **Bidder**: {{bidderName}}
- **Time**: {{bidTime}}

[View Listing]({{listingUrl}})

Keep an eye on your auction - more bids might be coming in!

Best regards,  
The MatEx Team`,
    is_active: true
  },
  {
    code: 'outbid_notification',
    channel: 'email',
    subject: 'You\'ve Been Outbid - {{listingTitle}}',
    body_md: `# You've Been Outbid

Hello {{bidderName}},

Someone has placed a higher bid on "{{listingTitle}}".

## Current Status
- **Item**: {{listingTitle}}
- **Your Bid**: ${{yourBid}}
- **Current Highest Bid**: ${{currentBid}}
- **Time Remaining**: {{timeRemaining}}

Don't let this opportunity slip away! You can place a new bid to stay in the running.

[Place New Bid]({{listingUrl}})

Good luck!  
The MatEx Team`,
    is_active: true
  },
  {
    code: 'auction_won',
    channel: 'email',
    subject: 'Congratulations! You Won - {{listingTitle}}',
    body_md: `# Congratulations! You Won the Auction

Hello {{winnerName}},

🎉 **Congratulations!** You have won the auction for "{{listingTitle}}" with a winning bid of **${{winningBid}}**.

## Next Steps
1. **Payment**: Complete your payment within 48 hours
2. **Inspection**: Schedule an inspection if required
3. **Pickup**: Coordinate pickup with the seller

## Order Details
- **Item**: {{listingTitle}}
- **Winning Bid**: ${{winningBid}}
- **Seller**: {{sellerName}}
- **Order ID**: {{orderId}}

[Complete Payment]({{paymentUrl}})

Thank you for using MatEx!  
The MatEx Team`,
    is_active: true
  },
  {
    code: 'inspection_booked',
    channel: 'email',
    subject: 'Inspection Booked - {{listingTitle}}',
    body_md: `# Inspection Booked

Hello {{sellerName}},

**{{buyerName}}** has booked an inspection for your listing "{{listingTitle}}".

## Inspection Details
- **Date & Time**: {{inspectionDate}}
- **Buyer**: {{buyerName}}
- **Contact**: {{buyerContact}}
- **Listing**: {{listingTitle}}

Please ensure the item is available for inspection at the scheduled time.

[View Inspection Details]({{inspectionUrl}})

Best regards,  
The MatEx Team`,
    is_active: true
  },
  {
    code: 'deposit_authorized',
    channel: 'email',
    subject: 'Deposit Authorized - {{listingTitle}}',
    body_md: `# Deposit Authorized

Hello {{buyerName}},

Your deposit of **${{depositAmount}}** for "{{listingTitle}}" has been successfully authorized.

## What This Means
- You can now place bids on this auction
- Your deposit will be applied to your final payment if you win
- If you don't win, your deposit will be automatically refunded

## Auction Details
- **Item**: {{listingTitle}}
- **Deposit**: ${{depositAmount}}
- **Auction Ends**: {{auctionEndTime}}

[View Auction]({{listingUrl}})

Happy bidding!  
The MatEx Team`,
    is_active: true
  },
  {
    code: 'inspection_reminder',
    channel: 'email',
    subject: 'Inspection Reminder - {{listingTitle}}',
    body_md: `# Inspection Reminder

Hello {{userName}},

This is a reminder that you have an inspection scheduled for "{{listingTitle}}" in **{{hoursUntil}} hours**.

## Inspection Details
- **Date & Time**: {{inspectionDate}}
- **Location**: {{inspectionLocation}}
- **Contact**: {{contactInfo}}

Please arrive on time and bring any necessary equipment for your inspection.

[View Details]({{inspectionUrl}})

See you there!  
The MatEx Team`,
    is_active: true
  }
];

async function seedEmailTemplates() {
  console.log('Seeding email templates...');
  
  for (const template of emailTemplates) {
    const { error } = await supabase
      .from('notification_templates')
      .upsert(template, { onConflict: 'code,channel' });
    
    if (error) {
      console.error(`Failed to seed template ${template.code}:`, error);
    } else {
      console.log(`✓ Seeded template: ${template.code}`);
    }
  }
  
  console.log('Email template seeding complete!');
}

seedEmailTemplates().catch(console.error);
```

### Integration with Notification System
Update notification helpers to send emails alongside in-app notifications.

```typescript
// src/lib/notification-helpers.ts (updated)
import { emailRenderer } from '@/lib/email-renderer';

export async function notifyNewBid(auctionId: string, bidAmount: number, bidderName: string) {
  const supabase = createClient();
  
  // Get auction and listing details
  const { data: auction } = await supabase
    .from('auctions')
    .select(`
      listing_id,
      end_at,
      listings!inner(
        title,
        seller_id,
        profiles!seller_id(full_name, email)
      )
    `)
    .eq('listing_id', auctionId)
    .single();

  if (!auction) return;

  // Create in-app notification
  await createNotification({
    userId: auction.listings.seller_id,
    type: 'info',
    title: 'New Bid Received',
    message: `${bidderName} placed a bid of $${bidAmount.toFixed(2)} on "${auction.listings.title}"`,
    link: `/listings/${auctionId}`
  });

  // Send email notification
  if (auction.listings.profiles.email) {
    await emailRenderer.sendEmail('bid_received', auction.listings.profiles.email, {
      sellerName: auction.listings.profiles.full_name || 'Seller',
      bidderName,
      bidAmount: bidAmount.toFixed(2),
      listingTitle: auction.listings.title,
      bidTime: new Date().toLocaleString(),
      listingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${auctionId}`
    });
  }
}

export async function notifyOutbid(auctionId: string, previousBidderId: string, newBidAmount: number, listingTitle: string) {
  const supabase = createClient();
  
  // Get previous bidder details
  const { data: bidder } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', previousBidderId)
    .single();

  // Get their previous bid amount
  const { data: previousBid } = await supabase
    .from('bids')
    .select('amount_cad')
    .eq('auction_id', auctionId)
    .eq('bidder_id', previousBidderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Create in-app notification
  await createNotification({
    userId: previousBidderId,
    type: 'warning',
    title: 'You\'ve Been Outbid',
    message: `Someone placed a higher bid of $${newBidAmount.toFixed(2)} on "${listingTitle}"`,
    link: `/listings/${auctionId}`
  });

  // Send email notification
  if (bidder?.email) {
    await emailRenderer.sendEmail('outbid_notification', bidder.email, {
      bidderName: bidder.full_name || 'Bidder',
      listingTitle,
      yourBid: previousBid?.amount_cad.toFixed(2) || '0.00',
      currentBid: newBidAmount.toFixed(2),
      timeRemaining: 'Check auction page',
      listingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${auctionId}`
    });
  }
}

// Similar updates for other notification functions...
```

### Environment Variables
Add email configuration to environment template.

```bash
# .env.example (updated)
# Email Configuration
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@matex.ca
```

## Files Created/Modified

### New Files
- `src/lib/email-renderer.ts` - Email template rendering and sending system
- `scripts/seed-email-templates.js` - Seed default email templates

### Modified Files
- `src/lib/notification-helpers.ts` - Add email sending to notification functions
- `.env.example` - Add SMTP configuration variables

## Dependencies
Add nodemailer to package.json:

```json
{
  "dependencies": {
    "nodemailer": "^6.9.7"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14"
  }
}
```

## Database Requirements
- Existing `notification_templates` table from T012
- Email templates seeded with default content

## Success Metrics
- [ ] Email templates stored and retrieved from database
- [ ] Variable substitution works correctly in templates
- [ ] Markdown converted to HTML properly
- [ ] Emails sent for bid notifications
- [ ] Emails sent for outbid notifications
- [ ] Emails sent for auction wins
- [ ] Emails sent for inspection bookings
- [ ] Emails sent for deposit confirmations
- [ ] Development mode logs emails instead of sending
- [ ] Production mode sends actual emails via SMTP

## Testing Checklist
- [ ] Template rendering with variables works
- [ ] Markdown to HTML conversion is correct
- [ ] Email layout wrapping is applied
- [ ] SMTP configuration loads from environment
- [ ] Development mode logs emails to console
- [ ] Email sending doesn't block main operations
- [ ] Failed email sends are logged but don't crash app
- [ ] Email templates can be updated via admin interface
