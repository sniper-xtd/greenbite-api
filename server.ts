import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categories from './routes/categories';
import productDetailsRoutes from './routes/productdetails';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';

const app = express();

// Middleware
app.use(helmet());
app.use(cookieParser()); // ✅ parse cookies
app.use(express.json());

// ✅ CORS with credentials enabled
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://greenbite-frontend.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categories);
app.use('/api/productdetails', productDetailsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

// Start server
const port = env.PORT;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
