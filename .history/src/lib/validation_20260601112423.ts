import { z } from 'zod';
import { NextResponse } from 'next/server';

const PHONE_RE = /^\+?(\d[\s\-.]?){7,15}\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const CustomerCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120),
  phone: z.string().trim().regex(PHONE_RE, 'Phone number must be between 7 and 15 digits.').max(20),
  address: z.string().trim().max(300).nullable().optional(),
  email: z.union([
    z.string().trim().regex(EMAIL_RE, 'Invalid email address.').max(254).transform(v => v.toLowerCase()),
    z.literal('')
  ]).nullable().optional(),
});

export const CustomerUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120).optional(),
  phone: z.string().trim().regex(PHONE_RE, 'Phone number must be between 7 and 15 digits.').max(20).optional(),
  address: z.string().trim().max(300).nullable().optional(),
  email: z.union([
    z.string().trim().regex(EMAIL_RE, 'Invalid email address.').max(254).transform(v => v.toLowerCase()),
    z.literal('')
  ]).nullable().optional(),
});

export const JobCreateSchema = z.object({
  customerId: z.string(),
  deviceId: z.string(),
  problemDescription: z.string().trim().min(1, 'problemDescription is required.').max(1000),
  estimatedCost: z.coerce.number().min(0, 'estimatedCost must be at least 0.'),
  advanceAmount: z.coerce.number().min(0, 'advanceAmount must be at least 0.').optional().default(0),
  assignedEngineerId: z.string().nullable().optional(),
  linkedJobId: z.string().nullable().optional(),
});

export const JobUpdateSchema = z.object({
  status: z.enum(['New', 'Assigned', 'In Progress', 'Completed', 'Delivered']).optional(),
  problemDescription: z.string().trim().min(1, 'problemDescription is required.').max(1000).optional(),
  estimatedCost: z.coerce.number().min(0).optional(),
  actualCost: z.coerce.number().min(0).nullable().optional(),
  advanceAmount: z.coerce.number().min(0).optional(),
  repairNotes: z.string().trim().max(2000).nullable().optional(),
  assignedEngineerId: z.string().nullable().optional(),
  reassignReason: z.string().trim().max(500).nullable().optional(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string(),
    done: z.boolean(),
  })).optional(),
  rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  feedback: z.string().trim().max(1000).nullable().optional(),
  linkedJobId: z.string().nullable().optional(),
  paymentMethod: z.string().trim().max(50).nullable().optional(),
});

export const JobPatchSchema = z.object({
  status: z.enum(['In Progress', 'Completed']).optional(),
  repairNotes: z.string().trim().max(2000).nullable().optional(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string(),
    done: z.boolean(),
  })).optional(),
});

export const SaleItemSchema = z.object({
  inventoryItemId: z.string(),
  quantity: z.coerce.number().int().min(1, 'Item quantity must be at least 1.'),
  unitPrice: z.coerce.number().min(0).nullable().optional(),
});

export const SaleCreateSchema = z.object({
  customerId: z.string().nullable().optional(),
  companyName: z.string().trim().max(120),
  contactName: z.string().trim().max(120),
  phone: z.string().trim().max(20),
  notes: z.string().trim().max(2000).optional().default(''),
  items: z.array(SaleItemSchema).min(1, 'At least one item is required.'),
});

export async function validateBody<T>(
  request: Request,
  schema: z.Schema<T>
): Promise<{ success: true; data: T } | { success: false; errorResponse: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      const errorMsg = result.error.issues[0]?.message || 'Invalid request body.';
      return {
        success: false,
        errorResponse: NextResponse.json({ error: errorMsg }, { status: 400 }),
      };
    }
    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      errorResponse: NextResponse.json({ error: 'Malformed or missing JSON body.' }, { status: 400 }),
    };
  }
}
