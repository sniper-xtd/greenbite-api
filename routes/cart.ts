import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

// 🛒 GET cart for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  res.json(cart);
});

// ➕ Add item to cart
router.post('/add', async (req, res) => {
  const { userId, productId, quantity } = req.body;

  let cart = await prisma.cart.findUnique({ where: { userId } });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
      },
    });
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + quantity,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });
  }

  res.json({ message: 'Item added to cart' });
});

// 🗑 Remove item
router.delete('/:itemId', async (req, res) => {
  const { itemId } = req.params;

  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  res.json({ message: 'Item removed' });
});

// 🔄 Update quantity
router.patch('/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  res.json({ message: 'Quantity updated' });
});

export default router;
