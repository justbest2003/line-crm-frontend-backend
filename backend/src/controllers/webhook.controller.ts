import { Request, Response } from 'express';
import * as lineService from '../services/line.service';
import * as customerService from '../services/customer.service';
import * as conversationService from '../services/conversation.service';
import * as messageService from '../services/message.service';
import * as geminiService from '../services/gemini.service';
import * as notificationService from '../services/notification.service';
import type { LineWebhookBody, LineWebhookEvent } from '../types';

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-line-signature'] as string;
    const body = req.body as Buffer;

    // Verify LINE signature
    if (!signature || !lineService.verifySignature(body, signature)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const parsed: LineWebhookBody = JSON.parse(body.toString());

    // Process events asynchronously — respond 200 immediately
    res.status(200).json({ ok: true });

    for (const event of parsed.events) {
      try {
        await processEvent(event);
      } catch (err) {
        console.error('Error processing event:', err);
      }
    }
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function processEvent(event: LineWebhookEvent): Promise<void> {
  const userId = event.source.userId;
  if (!userId) return;

  switch (event.type) {
    case 'follow':
      await handleFollow(userId);
      break;
    case 'message':
      await handleMessage(event);
      break;
    case 'unfollow':
      // Optional: mark customer as inactive
      break;
  }
}

/** Handle new follower — create customer + notification */
async function handleFollow(userId: string): Promise<void> {
  let profile;
  try {
    profile = await lineService.getProfile(userId);
  } catch {
    // Profile fetch failed, create with userId only
  }

  const customer = await customerService.findOrCreateByLineUserId(userId, {
    displayName: profile?.displayName,
    pictureUrl: profile?.pictureUrl,
  });

  await notificationService.create({
    customerId: customer.id,
    type: 'new_lead',
    message: `Lead ใหม่: ${customer.displayName || userId} เพิ่มเพื่อนแล้ว`,
  });
}

/** Handle incoming message — save, route to bot or create notification */
async function handleMessage(event: LineWebhookEvent): Promise<void> {
  const userId = event.source.userId;
  const messageText = event.message?.text;

  // Only handle text messages for now
  if (!messageText || event.message?.type !== 'text') return;

  // Find or create customer
  let profile;
  try {
    profile = await lineService.getProfile(userId);
  } catch {
    // Proceed without profile
  }

  const customer = await customerService.findOrCreateByLineUserId(userId, {
    displayName: profile?.displayName,
    pictureUrl: profile?.pictureUrl,
  });

  // Check if this is a brand-new lead (just created)
  const isNewLead = customer.status === 'new_lead' && !customer.lastMessageAt;
  if (isNewLead) {
    await notificationService.create({
      customerId: customer.id,
      type: 'new_lead',
      message: `Lead ใหม่: ${customer.displayName || userId} ทักมาครั้งแรก`,
    });
  }

  // Find or create active conversation
  const conversation = await conversationService.findOrCreateActive(customer.id);

  // Save customer message
  await messageService.save({
    conversationId: conversation.id,
    senderType: 'customer',
    content: messageText,
    lineMessageId: event.message?.id,
  });

  // Route based on handled_by
  if (conversation.handledBy === 'bot') {
    await handleBotReply(event, customer, conversation);
  } else {
    // Human mode — notify admin
    await notificationService.create({
      customerId: customer.id,
      type: 'needs_human',
      message: `${customer.displayName || userId}: "${messageText.slice(0, 80)}"`,
    });
  }

  // Update last_message_at
  await customerService.updateLastMessageAt(customer.id);
}

/** Generate bot reply via Gemini and send back through LINE */
async function handleBotReply(
  event: LineWebhookEvent,
  customer: any,
  conversation: any,
): Promise<void> {
  const messageText = event.message?.text || '';

  try {
    // Get conversation history for context
    const history = await messageService.formatHistoryForAI(conversation.id, 10);

    // Call Gemini
    const reply = await geminiService.generateReplyWithRetry(history, messageText);

    // Check for escalation
    if (reply.startsWith('[ESCALATE]')) {
      const cleanReply = reply.replace('[ESCALATE]', '').trim();

      // Switch to human mode
      await conversationService.takeover(conversation.id);

      // Notify admin
      await notificationService.create({
        customerId: customer.id,
        type: 'needs_human',
        message: `บอทส่งต่อ: ${customer.displayName || customer.lineUserId} — ${cleanReply.slice(0, 80)}`,
      });

      // Tell customer
      if (event.replyToken) {
        const escalateMsg = cleanReply || 'ขอส่งต่อให้แอดมินดูแลนะคะ รอสักครู่ค่ะ';
        await lineService.replyMessage(event.replyToken, escalateMsg);
        await messageService.save({
          conversationId: conversation.id,
          senderType: 'bot',
          content: escalateMsg,
        });
      }
    } else {
      // Normal bot reply
      if (event.replyToken) {
        await lineService.replyMessage(event.replyToken, reply);
      }
      await messageService.save({
        conversationId: conversation.id,
        senderType: 'bot',
        content: reply,
      });
    }
  } catch (err: any) {
    if (err.message === 'RATE_LIMITED') {
      // Gemini rate limited — fallback to human
      await conversationService.takeover(conversation.id);

      await notificationService.create({
        customerId: customer.id,
        type: 'needs_human',
        message: `Rate limit: ${customer.displayName || customer.lineUserId} ต้องการความช่วยเหลือ`,
      });

      if (event.replyToken) {
        const fallbackMsg = 'ขออภัยค่ะ ระบบไม่ว่างในขณะนี้ กรุณารอสักครู่ แอดมินจะติดต่อกลับค่ะ';
        await lineService.replyMessage(event.replyToken, fallbackMsg);
        await messageService.save({
          conversationId: conversation.id,
          senderType: 'bot',
          content: fallbackMsg,
        });
      }
    } else {
      console.error('Gemini error:', err);
    }
  }
}
