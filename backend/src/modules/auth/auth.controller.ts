import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../users/user.model.js';
import { generateToken } from '../../utils/jwt.js';
import { logAuditEvent } from '../audit/audit.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { env } from '../../config/env.js';

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, dateOfBirth, gender, bloodGroup, preferredLanguage } = req.body;

  const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(400).json({ success: false, error: 'An account with this email already exists' });
    return;
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await UserModel.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    gender,
    bloodGroup,
    preferredLanguage: preferredLanguage || 'en',
  });

  const token = generateToken({ userId: user._id.toString(), email: user.email });

  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await logAuditEvent(req, 'REGISTER', 'USER', user._id.toString(), { email: user.email });

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      bloodGroup: user.bloodGroup,
      mockAbhaId: user.mockAbhaId,
      preferredLanguage: user.preferredLanguage,
      allergies: user.allergies,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    await logAuditEvent(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'AUTH', undefined, {
      reason: 'User not found',
      email,
    });
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    await logAuditEvent(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'AUTH', user._id.toString(), {
      reason: 'Password mismatch',
      email,
    });
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const token = generateToken({ userId: user._id.toString(), email: user.email });

  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await logAuditEvent(req, 'LOGIN', 'USER', user._id.toString(), { email: user.email });

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      bloodGroup: user.bloodGroup,
      mockAbhaId: user.mockAbhaId,
      preferredLanguage: user.preferredLanguage,
      allergies: user.allergies,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.clearCookie('token');
  await logAuditEvent(req, 'LOGOUT', 'USER', (req as any)?.user?.userId);
  res.json({ success: true, message: 'Logged out successfully' });
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = await UserModel.findById(req.user!.userId).select('-passwordHash');
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      bloodGroup: user.bloodGroup,
      mockAbhaId: user.mockAbhaId,
      allergies: user.allergies,
      emergencyContact: user.emergencyContact,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
    },
  });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = await UserModel.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const allowedFields = ['name', 'dateOfBirth', 'gender', 'bloodGroup', 'allergies', 'emergencyContact', 'preferredLanguage'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      (user as any)[field] = req.body[field];
    }
  });

  await user.save();
  await logAuditEvent(req, 'UPDATE_PROFILE', 'USER', user._id.toString(), { updatedFields: Object.keys(req.body) });

  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      bloodGroup: user.bloodGroup,
      mockAbhaId: user.mockAbhaId,
      allergies: user.allergies,
      emergencyContact: user.emergencyContact,
      preferredLanguage: user.preferredLanguage,
    },
  });
}
