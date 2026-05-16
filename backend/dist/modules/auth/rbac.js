export function roleAllowsPermission(role, permission) {
    switch (permission) {
        case 'read':
            return role === 'VIEWER' || role === 'ENGINEER' || role === 'ADMIN';
        case 'write':
            return role === 'ENGINEER' || role === 'ADMIN';
        case 'admin':
            return role === 'ADMIN';
        default:
            return false;
    }
}
