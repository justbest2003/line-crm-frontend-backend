import { Response } from 'express';
import * as customerService from '../services/customer.service';
import * as conversationService from '../services/conversation.service';
import * as messageService from '../services/message.service';
import * as lineService from '../services/line.service';
import type { AuthRequest } from '../types';

/** Safely extract a string from Express param/query (which can be string | string[]) */
function s(val: unknown): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return String(val[0]);
  return '';
}


/** GET /api/customers */
export async function list(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await customerService.list({
      status: s(req.query.status) || undefined,
      tagName: s(req.query.tag) || undefined,
      search: s(req.query.search) || undefined,
      page: req.query.page ? parseInt(s(req.query.page)) : undefined,
      pageSize: req.query.pageSize ? parseInt(s(req.query.pageSize)) : undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** GET /api/customers/:id */
export async function getById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const customer = await customerService.getById(s(req.params.id));
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(customer);
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** PATCH /api/customers/:id */
export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, notes, assignedTo, phone, email } = req.body;
    const data: any = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (assignedTo !== undefined) data.assignedToId = assignedTo;

    const customer = await customerService.update(s(req.params.id), data);
    res.json(customer);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** DELETE /api/customers/:id */
export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    await customerService.softDelete(s(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** GET /api/customers/:id/messages */
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = req.query.page ? parseInt(s(req.query.page)) : 1;
    const result = await messageService.getByCustomerId(s(req.params.id), page);
    res.json(result);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST /api/customers/:id/tags */
export async function addTag(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { tagId } = req.body;
    if (!tagId) {
      res.status(400).json({ error: 'tagId is required' });
      return;
    }
    const result = await customerService.addTag(s(req.params.id), tagId);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Tag already assigned' });
      return;
    }
    console.error('Add tag error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** DELETE /api/customers/:id/tags/:tagId */
export async function removeTag(req: AuthRequest, res: Response): Promise<void> {
  try {
    await customerService.removeTag(s(req.params.id), s(req.params.tagId));
    res.json({ ok: true });
  } catch (err) {
    console.error('Remove tag error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST /api/customers/:id/takeover */
export async function takeover(req: AuthRequest, res: Response): Promise<void> {
  try {
    const conversation = await conversationService.getActiveByCustomerId(s(req.params.id));
    if (!conversation) {
      res.status(404).json({ error: 'No active conversation' });
      return;
    }
    await conversationService.takeover(conversation.id);
    res.json({ ok: true, handledBy: 'human' });
  } catch (err) {
    console.error('Takeover error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST /api/customers/:id/release */
export async function release(req: AuthRequest, res: Response): Promise<void> {
  try {
    const conversation = await conversationService.getActiveByCustomerId(s(req.params.id));
    if (!conversation) {
      res.status(404).json({ error: 'No active conversation' });
      return;
    }
    await conversationService.release(conversation.id);
    res.json({ ok: true, handledBy: 'bot' });
  } catch (err) {
    console.error('Release error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST /api/customers/:id/reply — admin sends message to customer via LINE */
export async function reply(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const customer = await customerService.getById(s(req.params.id));
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Send via LINE Push API
    await lineService.pushMessage(customer.lineUserId, message);

    // Save to database
    const conversation = await conversationService.findOrCreateActive(customer.id);
    const saved = await messageService.save({
      conversationId: conversation.id,
      senderType: 'admin',
      senderId: req.admin!.id,
      content: message,
    });

    // Update last_message_at
    await customerService.updateLastMessageAt(customer.id);

    res.status(201).json(saved);
  } catch (err) {
    console.error('Reply error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
