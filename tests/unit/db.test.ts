import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';

// Use unique collection names per test to avoid data leaking between tests
let testCounter = 0;
function freshCollection() {
  return db.collection<any>(`test_col_${++testCounter}_${Date.now()}`);
}

describe('db (JSON file database)', () => {
  describe('create', () => {
    it('creates a record with auto-generated id and timestamps', () => {
      const col = freshCollection();
      const item = col.create({ name: 'Test Item', value: 42 });
      expect(item.id).toBeTruthy();
      expect(item.name).toBe('Test Item');
      expect(item.value).toBe(42);
      expect(item.createdAt).toBeTruthy();
      expect(item.updatedAt).toBeTruthy();
    });

    it('allows custom id', () => {
      const col = freshCollection();
      const item = col.create({ id: 'custom-id', name: 'Custom' });
      expect(item.id).toBe('custom-id');
    });
  });

  describe('findById', () => {
    it('finds existing record', () => {
      const col = freshCollection();
      const created = col.create({ name: 'Find Me' });
      const found = col.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Find Me');
    });

    it('returns null for nonexistent id', () => {
      const col = freshCollection();
      expect(col.findById('does-not-exist')).toBeNull();
    });
  });

  describe('findFirst', () => {
    it('returns first matching record', () => {
      const col = freshCollection();
      col.create({ name: 'Alice', role: 'admin' });
      col.create({ name: 'Bob', role: 'user' });
      const found = col.findFirst({ where: { role: 'admin' } });
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Alice');
    });

    it('returns null when no match', () => {
      const col = freshCollection();
      col.create({ name: 'Alice', role: 'admin' });
      expect(col.findFirst({ where: { role: 'superadmin' } })).toBeNull();
    });
  });

  describe('findMany', () => {
    it('returns all records without filter', () => {
      const col = freshCollection();
      col.create({ name: 'A' });
      col.create({ name: 'B' });
      col.create({ name: 'C' });
      expect(col.findMany()).toHaveLength(3);
    });

    it('filters by where clause', () => {
      const col = freshCollection();
      col.create({ name: 'A', status: 'active' });
      col.create({ name: 'B', status: 'inactive' });
      col.create({ name: 'C', status: 'active' });
      const active = col.findMany({ where: { status: 'active' } });
      expect(active).toHaveLength(2);
    });

    it('supports orderBy ascending', () => {
      const col = freshCollection();
      col.create({ name: 'B', priority: 2 });
      col.create({ name: 'A', priority: 1 });
      col.create({ name: 'C', priority: 3 });
      const sorted = col.findMany({ orderBy: { priority: 'asc' } });
      expect(sorted.map((i: any) => i.name)).toEqual(['A', 'B', 'C']);
    });

    it('supports orderBy descending', () => {
      const col = freshCollection();
      col.create({ name: 'B', priority: 2 });
      col.create({ name: 'A', priority: 1 });
      col.create({ name: 'C', priority: 3 });
      const sorted = col.findMany({ orderBy: { priority: 'desc' } });
      expect(sorted.map((i: any) => i.name)).toEqual(['C', 'B', 'A']);
    });

    it('supports take (limit)', () => {
      const col = freshCollection();
      col.create({ name: 'A' });
      col.create({ name: 'B' });
      col.create({ name: 'C' });
      expect(col.findMany({ take: 2 })).toHaveLength(2);
    });

    it('supports skip (offset)', () => {
      const col = freshCollection();
      col.create({ name: 'A' });
      col.create({ name: 'B' });
      col.create({ name: 'C' });
      const result = col.findMany({ skip: 1 });
      expect(result).toHaveLength(2);
    });

    it('supports contains operator', () => {
      const col = freshCollection();
      col.create({ name: 'John Smith' });
      col.create({ name: 'Jane Doe' });
      const result = col.findMany({ where: { name: { contains: 'john' } } });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Smith');
    });

    it('supports in operator', () => {
      const col = freshCollection();
      col.create({ name: 'A', status: 'active' });
      col.create({ name: 'B', status: 'inactive' });
      col.create({ name: 'C', status: 'pending' });
      const result = col.findMany({ where: { status: { in: ['active', 'pending'] } } });
      expect(result).toHaveLength(2);
    });

    it('supports not operator', () => {
      const col = freshCollection();
      col.create({ name: 'A', status: 'active' });
      col.create({ name: 'B', status: 'inactive' });
      const result = col.findMany({ where: { status: { not: 'active' } } });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('B');
    });

    it('supports gte operator', () => {
      const col = freshCollection();
      col.create({ name: 'A', score: 10 });
      col.create({ name: 'B', score: 20 });
      col.create({ name: 'C', score: 30 });
      const result = col.findMany({ where: { score: { gte: 20 } } });
      expect(result).toHaveLength(2);
    });

    it('supports lte operator', () => {
      const col = freshCollection();
      col.create({ name: 'A', score: 10 });
      col.create({ name: 'B', score: 20 });
      col.create({ name: 'C', score: 30 });
      const result = col.findMany({ where: { score: { lte: 20 } } });
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('updates existing record', () => {
      const col = freshCollection();
      const item = col.create({ name: 'Original' });
      const updated = col.update(item.id, { name: 'Updated' });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated');
    });

    it('sets updatedAt timestamp', () => {
      const col = freshCollection();
      const item = col.create({ name: 'Test' });
      const updated = col.update(item.id, { name: 'Changed' });
      expect(updated!.updatedAt).toBeTruthy();
    });

    it('returns null for nonexistent id', () => {
      const col = freshCollection();
      expect(col.update('nonexistent', { name: 'X' })).toBeNull();
    });
  });

  describe('updateMany', () => {
    it('updates all matching records', () => {
      const col = freshCollection();
      col.create({ name: 'A', status: 'pending' });
      col.create({ name: 'B', status: 'pending' });
      col.create({ name: 'C', status: 'active' });
      const count = col.updateMany({ status: 'pending' }, { status: 'active' });
      expect(count).toBe(2);
      expect(col.findMany({ where: { status: 'active' } })).toHaveLength(3);
    });
  });

  describe('delete', () => {
    it('deletes existing record', () => {
      const col = freshCollection();
      const item = col.create({ name: 'Delete Me' });
      expect(col.delete(item.id)).toBe(true);
      expect(col.findById(item.id)).toBeNull();
    });

    it('returns false for nonexistent id', () => {
      const col = freshCollection();
      expect(col.delete('nonexistent')).toBe(false);
    });
  });

  describe('deleteMany', () => {
    it('deletes all matching records', () => {
      const col = freshCollection();
      col.create({ name: 'A', status: 'old' });
      col.create({ name: 'B', status: 'old' });
      col.create({ name: 'C', status: 'current' });
      const count = col.deleteMany({ status: 'old' });
      expect(count).toBe(2);
      expect(col.findMany()).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('counts all records without filter', () => {
      const col = freshCollection();
      col.create({ name: 'A' });
      col.create({ name: 'B' });
      expect(col.count()).toBe(2);
    });

    it('counts records matching where clause', () => {
      const col = freshCollection();
      col.create({ name: 'A', active: true });
      col.create({ name: 'B', active: false });
      col.create({ name: 'C', active: true });
      expect(col.count({ active: true })).toBe(2);
    });

    it('returns 0 for empty collection', () => {
      expect(db.collection('empty_collection_unique').count()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles concurrent reads of same collection', () => {
      const col = freshCollection();
      col.create({ name: 'Shared' });
      const a = col.findMany();
      const b = col.findMany();
      expect(a).toEqual(b);
    });

    it('handles empty where clause', () => {
      const col = freshCollection();
      col.create({ name: 'A' });
      const result = col.findMany({ where: {} });
      expect(result).toHaveLength(1);
    });
  });
});
