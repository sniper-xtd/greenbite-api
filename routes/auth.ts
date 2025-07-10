import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { validate } from '../middleware/validate';

const router = Router();

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// --- SIGNUP ---
router.post('/signup', validate(z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  }),
})), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true },
    });

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    res
      .cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      })
      .status(201)
      .json({ user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// --- SIGNIN ---
router.post('/signin', validate(z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
})), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    res
      .cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      })
      .json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// --- /me ---
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'No token' });

    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, profileImageUrl: true },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('GET /me error:', err);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// --- FORGOT PASSWORD ---
router.post('/forgot-password', validate(z.object({
  body: z.object({
    email: z.string().email(),
  }),
})), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.verificationCode.upsert({
      where: { email },
      update: {
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      create: {
        email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await transporter.sendMail({
      from: env.SMTP_USER,
      to: email,
      subject: 'Your Password Reset Code',
      text: `Your reset code is: ${code}`,
    });

    res.status(200).json({ message: 'Reset code sent to email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// --- VERIFY CODE ---
router.post('/verify-code', validate(z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6),
  }),
})), async (req, res) => {
  try {
    const { email, code } = req.body;

    const record = await prisma.verificationCode.findUnique({ where: { email } });

    if (!record || record.code !== code)
      return res.status(400).json({ message: 'Invalid or expired code' });

    if (record.expiresAt < new Date())
      return res.status(400).json({ message: 'Code has expired' });

    res.status(200).json({ message: 'Code verified' });
  } catch (err) {
    console.error('Verify code error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// --- RESET PASSWORD ---
router.post('/reset-password', validate(z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
})), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await prisma.verificationCode.deleteMany({ where: { email } });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

export default router;
