import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const productSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    price: z.number().positive(),
    image: z.string().url(),
    categoryId: z.string(),
    stock: z.number().int().positive(),
  }),
});

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

router.post(
  '/',
  authenticate,
  validate(productSchema),
  async (req, res) => {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const product = await prisma.product.create({
        data: req.body,
        include: {
          category: true,
        },
      });

      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
);

export default router;