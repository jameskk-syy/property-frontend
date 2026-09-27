# WhatsApp Integration Guide for Nest Property Management

> A comprehensive guide for integrating WhatsApp messaging capabilities into Nest using WAClient API.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Quick Setup Guide](#quick-setup-guide)
3. [WAClient API Overview](#waclient-api-overview)
4. [Backend Implementation](#backend-implementation)
5. [Use Cases & Message Types](#use-cases--message-types)
6. [Webhook Configuration](#webhook-configuration)
7. [Message Templates](#message-templates)
8. [Interactive Buttons & Payment Links](#interactive-buttons--payment-links)
9. [Configuration & Environment Variables](#configuration--environment-variables)
10. [Testing](#testing)
11. [Security Considerations](#security-considerations)
12. [Compliance & Best Practices](#compliance--best-practices)

---

## Executive Summary

### What is WAClient?

WAClient (waclient.com) is a WhatsApp Business API service that provides two integration options for sending and receiving WhatsApp messages programmatically:

| API Type | Description | Best For |
|----------|-------------|----------|
| **WhatsApp Web API** | Session-based messaging via WhatsApp Web | Quick setups, no Meta verification required |
| **WhatsApp Cloud API** | Official Meta Business Platform integration | Production scale, template messages, official support |

### Key Capabilities

- **Broadcast Messaging**: Send personalized messages to large lists with delivery/read tracking
- **Message Types**: Text, media, buttons, lists, location, and contact messages
- **Template Messages**: Pre-approved templates for outbound messaging (required outside 24-hour window)
- **Webhooks**: Receive incoming messages and delivery status updates in real-time
- **Interactive Buttons**: Pay Now buttons that trigger M-Pesa STK push

---

## Quick Setup Guide

### Step 1: Configure WAClient in Meta Developer Portal

1. Copy the **Callback URL** and **Verify Token** from WAClient dashboard
2. Go to [developers.facebook.com](https://developers.facebook.com) → Your App → WhatsApp → Configuration
3. Paste in Webhook section and click **Verify and Save**
4. Enable webhook fields: `messages`, `message_template_status_update`

### Step 2: Configure Forward Webhook (WAClient → Nest Backend)

In WAClient dashboard under "Forward to your app":
1. Set to **Enable**
2. Enter your backend webhook URL:

```
https://YOUR_NGROK_URL/api/method/property_management.api.whatsapp.webhook
```

Example with ngrok:
```
https://e339-154-159-238-162.ngrok-free.app/api/method/property_management.api.whatsapp.webhook
```

### Step 3: Configure Nest Backend (Organization Settings)

In Nest Admin → Organization Settings → Messaging:

| Field | Value |
|-------|-------|
| WhatsApp Enabled | ✓ |
| WhatsApp Provider | WAClient |
| Phone Number ID | From Meta Developer Portal |
| WABA ID | From Meta Developer Portal |
| Access Token | Permanent token from Meta Business Suite |
| WAClient Instance ID | From WAClient dashboard (e.g. META6A8073R86630) |
| Webhook Verify Token | Random token you set in Meta |

### Step 4: Run Database Migration

```bash
cd ~/property
bench --site property.localhost migrate
```

---

## WAClient API Overview

### Important: 24-Hour Messaging Rule

WhatsApp enforces a customer service window:

| Timing | What You Can Send |
|--------|-------------------|
| **Within 24 hours** of customer's last message | Any free-form message (text, media, buttons) |
| **After 24 hours** | Only pre-approved Template Messages |

**Impact on Nest**: For proactive notifications (rent reminders, due dates), you need template messages approved by Meta, OR the tenant must have messaged recently.

---

## Backend Implementation

### Files Modified/Created

| File | Purpose |
|------|---------|
| `api/whatsapp.py` | Webhook endpoint, send functions, button handlers |
| `api/messaging.py` | Multi-channel dispatch (SMS, Email, WhatsApp) |
| `api/mpesa.py` | Payment confirmation via WhatsApp |
| `tasks.py` | Automated rent reminders |
| `doctype/whatsapp_message_log` | Message tracking with status |
| `doctype/messaging_settings` | WhatsApp credentials storage |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/method/property_management.api.whatsapp.webhook` | GET | Meta webhook verification |
| `/api/method/property_management.api.whatsapp.webhook` | POST | Receive messages & status updates |
| `/api/method/property_management.api.whatsapp.send_message` | POST | Send text message |
| `/api/method/property_management.api.whatsapp.send_template` | POST | Send template message |
| `/api/method/property_management.api.whatsapp.send_buttons` | POST | Send interactive buttons |
| `/api/method/property_management.api.whatsapp.get_messages` | GET | Get message history |

### Python Functions

```python
from property_management.api.whatsapp import (
    send_text_message,
    send_template_message,
    send_interactive_buttons,
    send_rent_reminder,
    send_overdue_notice,
    send_payment_confirmation,
    send_invoice_notification,
)

# Send a text message
send_text_message("+254712345678", "Hello from Nest!", organization="ORG-001")

# Send interactive buttons with Pay Now
send_interactive_buttons(
    phone="+254712345678",
    header_text="📅 Rent Reminder",
    body_text="Your rent of KES 15,000 is due tomorrow.",
    buttons=[
        {"id": "pay_stk_INV-001", "title": "Pay Now"},
        {"id": "contact_support", "title": "Contact Support"}
    ],
    organization="ORG-001"
)

# High-level rent reminder (composes message automatically)
send_rent_reminder(tenant="TEN-001", invoice="INV-001")
```

---

## Use Cases & Message Types

### 1. Rent Due Alerts (Automated)

**Trigger**: Daily scheduler, 3 days and 1 day before due date  
**Message Type**: Interactive buttons  

```
📅 Rent Reminder

Hello John Doe,

This is a reminder that your rent payment is due soon.

💰 Amount: KES 15,000
📅 Due Date: October 5, 2026

Tap 'Pay Now' to pay instantly via M-Pesa.

[Pay Now] [Contact Support]
```

### 2. Overdue Notifications (Automated)

**Trigger**: Daily scheduler, day 1, 7, 14 after due date  
**Message Type**: Interactive buttons  

```
⚠️ Payment Overdue

Hello John Doe,

Your rent payment is 7 days overdue.

💰 Outstanding: KES 15,500

Please pay immediately to avoid late fees.

[Pay Now] [Contact Support]
```

### 3. Payment Confirmation (Automatic after M-Pesa)

**Trigger**: After successful M-Pesa STK callback  
**Message Type**: Text  

```
✅ Payment Received!

Thank you, John Doe!

💰 Amount: KES 15,000
📝 M-Pesa Ref: QKJ7XXXXX
📊 New Balance: KES 0

Your payment has been recorded.
```

### 4. Pay Button Click → STK Push

**Trigger**: Tenant clicks "Pay Now" in WhatsApp  
**Flow**:
1. WAClient forwards button click to webhook
2. Backend parses `pay_stk_INV-001` button ID
3. Looks up invoice, triggers M-Pesa STK push
4. Sends confirmation message

---

## Webhook Configuration

### Your Webhook URL

```
https://YOUR_DOMAIN/api/method/property_management.api.whatsapp.webhook
```

### Webhook Verification (GET)

Meta sends a GET request to verify ownership:

```
GET /webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

The endpoint returns the challenge if the token matches.

### Incoming Message Payload (POST)

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "254712345678",
          "type": "interactive",
          "interactive": {
            "type": "button_reply",
            "button_reply": {
              "id": "pay_stk_INV-2024-001",
              "title": "Pay Now"
            }
          }
        }]
      }
    }]
  }]
}
```

### Status Updates Payload (POST)

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [{
          "id": "wamid.xxx",
          "status": "delivered",
          "timestamp": "1704067200"
        }]
      }
    }]
  }]
}
```

---

## Message Templates

Templates must be approved by Meta before use. Submit these in Meta Business Suite:

### Template 1: `rent_reminder`

```
Header: 📅 Rent Reminder
Body: Hello {{1}}, your rent of KES {{2}} for {{3}} is due on {{4}}.
Footer: Nest Property Management
Button: [Pay Now]
```

### Template 2: `payment_overdue`

```
Header: ⚠️ Payment Overdue
Body: Hello {{1}}, your rent of KES {{2}} is {{3}} days overdue. Please pay immediately.
Footer: Nest Property Management
Buttons: [Pay Now] [Contact Us]
```

### Template 3: `payment_received`

```
Header: ✅ Payment Confirmed
Body: Thank you {{1}}! We received KES {{2}}. M-Pesa Ref: {{3}}. Balance: KES {{4}}.
Footer: Nest Property Management
```

---

## Interactive Buttons & Payment Links

### Button Types

| Type | Max | Title Length | Description |
|------|-----|--------------|-------------|
| Reply Button | 3 | 20 chars | Quick action buttons |

### Pay Button Flow

```
┌──────────────────┐
│  Rent Reminder   │
│  with Pay Button │
└────────┬─────────┘
         │ Tenant taps "Pay Now"
         ▼
┌──────────────────┐
│  WAClient sends  │
│  button_reply    │
│  to webhook      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Backend parses  │
│  pay_stk_INV-001 │
│  → find invoice  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Trigger M-Pesa  │
│  STK Push        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Tenant enters   │
│  M-Pesa PIN      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Payment success │
│  → WhatsApp      │
│  confirmation    │
└──────────────────┘
```

---

## Configuration & Environment Variables

### Messaging Settings Fields (Database)

| Field | Description |
|-------|-------------|
| `whatsapp_enabled` | Toggle integration on/off |
| `whatsapp_provider` | WAClient, Meta Cloud API, or Twilio |
| `whatsapp_phone_number_id` | Phone Number ID from Meta |
| `whatsapp_waba_id` | WhatsApp Business Account ID |
| `whatsapp_access_token` | Permanent token (encrypted) |
| `whatsapp_base_url` | API URL (default: graph.facebook.com/v19.0) |
| `whatsapp_instance_id` | WAClient instance ID |
| `whatsapp_webhook_verify_token` | Token for Meta verification |

### Frontend (.env)

```bash
# No WhatsApp keys needed in frontend
# All calls go through backend API
VITE_API_URL=https://your-backend-url/api
```

---

## Testing

### Test Webhook Endpoint

```bash
# Verify webhook (should return the challenge)
curl "https://YOUR_URL/api/method/property_management.api.whatsapp.webhook_verify?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# Response: test123
```

### Test Send Message

```bash
curl -X POST "https://YOUR_URL/api/method/property_management.api.whatsapp.send_message" \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+254712345678", "message": "Test from Nest"}'
```

### Test Button Message

```bash
curl -X POST "https://YOUR_URL/api/method/property_management.api.whatsapp.send_buttons" \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+254712345678",
    "header": "Test Header",
    "body": "Test body with buttons",
    "buttons": [{"id": "test_btn", "title": "Test"}]
  }'
```

### Trigger Reminders Manually

```bash
# Pre-due reminders
curl -X POST "https://YOUR_URL/api/method/property_management.tasks.trigger_predue_reminders" \
  -H "Authorization: token YOUR_TOKEN"

# Overdue reminders
curl -X POST "https://YOUR_URL/api/method/property_management.tasks.trigger_overdue_reminders" \
  -H "Authorization: token YOUR_TOKEN"
```

### Check Message Logs

In Frappe:
```
Desk → WhatsApp Message Log
```

Or via API:
```bash
curl "https://YOUR_URL/api/method/property_management.api.whatsapp.get_messages" \
  -H "Authorization: token YOUR_TOKEN"
```

---

## Security Considerations

### Token Storage

- Access tokens stored encrypted in `Messaging Settings` doctype
- Never logged or returned in API responses
- Use `get_password()` to decrypt

### Webhook Security

- Verify webhook comes from Meta/WAClient
- Use verify token for initial setup
- Log all webhooks for audit trail

### Rate Limiting

- WhatsApp may throttle bulk sends
- Queue messages via Frappe's enqueue
- Implement exponential backoff on failures

---

## Compliance & Best Practices

### WhatsApp Business Policy

1. **Opt-in Required**: Get consent before sending
2. **No Spam**: Only send relevant messages
3. **Template Approval**: Required for messages outside 24-hour window
4. **Opt-out**: Honor unsubscribe requests

### Message Frequency

| Type | Frequency |
|------|-----------|
| Rent Reminder | 2x/month max (3 days, 1 day before) |
| Overdue | 3x max (day 1, 7, 14) |
| Payment Confirm | After each payment |
| Invoice | 1x/month |

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Webhook not receiving | Check ngrok is running, URL matches |
| Messages not sending | Verify access token, phone number ID |
| Buttons not working | Ensure button ID < 256 chars, title < 20 chars |
| STK not triggering | Check M-Pesa credentials in Mpesa Settings |

### Debug Logs

```bash
# View webhook logs
tail -f ~/property/logs/whatsapp.log

# View Frappe error logs
bench --site property.localhost show-logs
```

---

*Document Version: 2.0*  
*Last Updated: September 25, 2026*  
*Implementation Status: Complete*
