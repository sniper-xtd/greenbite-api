import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const categorySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    image: z.string().url(),
  }),
});

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load categories' });
  }
});

// GET /api/categories/:id
router.get('/:id', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { products: true },
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// POST /api/categories (Admin only)
router.post(
  '/',
  authenticate,
  validate(categorySchema),
  async (req, res) => {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { name, image } = req.body;

      const category = await prisma.category.create({
        data: { name, image },
      });

      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create category' });
    }
  }
);

export default router;
