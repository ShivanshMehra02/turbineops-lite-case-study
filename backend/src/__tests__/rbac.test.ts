import { describe, expect, it } from '@jest/globals';
import { roleAllowsPermission } from '../modules/auth/rbac';

describe('RBAC', () => {
  it('viewer read-only', () => {
    expect(roleAllowsPermission('VIEWER', 'read')).toBe(true);
    expect(roleAllowsPermission('VIEWER', 'write')).toBe(false);
    expect(roleAllowsPermission('VIEWER', 'admin')).toBe(false);
  });

  it('engineer read/write', () => {
    expect(roleAllowsPermission('ENGINEER', 'read')).toBe(true);
    expect(roleAllowsPermission('ENGINEER', 'write')).toBe(true);
    expect(roleAllowsPermission('ENGINEER', 'admin')).toBe(false);
  });

  it('admin full', () => {
    expect(roleAllowsPermission('ADMIN', 'read')).toBe(true);
    expect(roleAllowsPermission('ADMIN', 'write')).toBe(true);
    expect(roleAllowsPermission('ADMIN', 'admin')).toBe(true);
  });
});
