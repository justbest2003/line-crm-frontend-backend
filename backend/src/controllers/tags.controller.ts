import { Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../types';

/** GET /api/tags */
export async function list(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { customerTags: true } } },
    });
    res.json(tags);
  } catch (err) {
    console.error('List tags error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST /api/tags */
export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, color } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const tag = await prisma.tag.create({
      data: { name, color: color || '#808080' },
    });
    res.status(201).json(tag);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Tag name already exists' });
      return;
    }
    console.error('Create tag error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** DELETE /api/tags/:id */
export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.tag.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete tag error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
