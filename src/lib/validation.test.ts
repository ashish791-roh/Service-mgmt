import { describe, expect, it } from 'vitest';
import {
  CustomerCreateSchema,
  JobCreateSchema,
  JobUpdateSchema,
  SaleItemSchema
} from './validation';

describe('Validation Schemas', () => {
  describe('CustomerCreateSchema', () => {
    it('passes valid inputs and lowercases email', () => {
      const validCustomer = {
        name: 'Jane Doe',
        phone: '+1234567890',
        address: '123 Main St',
        email: 'JANE@example.com',
      };
      const parsed = CustomerCreateSchema.safeParse(validCustomer);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe('Jane Doe');
        expect(parsed.data.phone).toBe('+1234567890');
        expect(parsed.data.email).toBe('jane@example.com');
      }
    });

    it('performs trimming on input fields', () => {
      const customer = {
        name: '  John Smith  ',
        phone: '  9876543210  ',
        address: '  456 Oak Rd  ',
        email: '  JOHN@EXAMPLE.CO.UK  ',
      };
      const parsed = CustomerCreateSchema.safeParse(customer);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe('John Smith');
        expect(parsed.data.phone).toBe('9876543210');
        expect(parsed.data.address).toBe('456 Oak Rd');
        expect(parsed.data.email).toBe('john@example.co.uk');
      }
    });

    it('fails with a specific error message if name is too short', () => {
      const customer = {
        name: 'A',
        phone: '1234567890',
      };
      const parsed = CustomerCreateSchema.safeParse(customer);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe('Name must be at least 2 characters.');
      }
    });

    it('rejects invalid phone numbers based on phone regex', () => {
      const invalidPhones = ['123', 'abc', '12345678901234567'];
      for (const phone of invalidPhones) {
        const customer = {
          name: 'Jane Doe',
          phone,
        };
        const parsed = CustomerCreateSchema.safeParse(customer);
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.issues[0].message).toBe('Phone number must be between 7 and 15 digits.');
        }
      }
    });
  });

  describe('JobCreateSchema & JobUpdateSchema', () => {
    it('uses z.coerce.number() to handle strings correctly for costs', () => {
      const job = {
        customerId: 'cust-123',
        deviceId: 'dev-123',
        problemDescription: 'Broken screen',
        estimatedCost: '150.50',
        advanceAmount: '50',
      };
      const parsed = JobCreateSchema.safeParse(job);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.estimatedCost).toBe(150.5);
        expect(parsed.data.advanceAmount).toBe(50);
      }
    });

    it('handles estimatedCost and actualCost correctly in JobUpdateSchema', () => {
      const update = {
        status: 'In Progress',
        estimatedCost: '200',
        actualCost: '180.75',
      };
      const parsed = JobUpdateSchema.safeParse(update);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.estimatedCost).toBe(200);
        expect(parsed.data.actualCost).toBe(180.75);
      }
    });
  });

  describe('SaleItemSchema', () => {
    it('enforces SaleItemSchema minimum quantity', () => {
      const invalidItem = {
        inventoryItemId: 'inv-123',
        quantity: 0,
      };
      const parsed = SaleItemSchema.safeParse(invalidItem);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe('Item quantity must be at least 1.');
      }
    });

    it('enforces SaleItemSchema negative quantity rejection', () => {
      const invalidItem = {
        inventoryItemId: 'inv-123',
        quantity: -5,
      };
      const parsed = SaleItemSchema.safeParse(invalidItem);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe('Item quantity must be at least 1.');
      }
    });

    it('accepts valid quantities in SaleItemSchema', () => {
      const validItem = {
        inventoryItemId: 'inv-123',
        quantity: '3',
        unitPrice: '10.50',
      };
      const parsed = SaleItemSchema.safeParse(validItem);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.quantity).toBe(3);
        expect(parsed.data.unitPrice).toBe(10.5);
      }
    });
  });
});
