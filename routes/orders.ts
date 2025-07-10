import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth'; // ✅ Corrected import

const router = express.Router();

// ✅ Get all orders for authenticated user
router.get('/orders', authenticate, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      status: order.status,
      total: order.total,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      date: order.createdAt.toISOString().split('T')[0],
      items: order.items.map((item) => ({
        id: item.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
    }));

    res.json({ orders: formattedOrders });
  } catch (err) {
    console.error('❌ Failed to fetch orders:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
