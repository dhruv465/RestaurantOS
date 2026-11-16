// Single source of truth for who can do what. Roles are fixed in code for now.
// shortcut: no per-role toggles or per-user overrides; move ROLES into a Role collection when owners need to edit them.
const PERMISSIONS = [
    'orders.view',      // see orders, tables and bills
    'orders.manage',    // create/update orders, change table status
    'payments.collect', // take cash or online payment
    'menu.manage',      // categories and items
    'tables.manage',    // add/delete tables
    'dashboard.view',
    'staff.manage',
    'settings.manage',
    'audit.view',
    'kitchen.manage',   // kitchen display: see and move tickets
    'orders.cancel',    // cancel an unpaid order (with a reason)
    'refunds.process',  // give money back on a paid order
    'inventory.manage', // ingredients, recipes, suppliers, purchase orders, stock counts
    'inventory.waste',  // log wasted stock
    'hr.manage',        // attendance fixes, rota, approve leave
    'payroll.manage',   // pay rates and payroll runs
    'accounting.manage', // expenses, cash close, P&L and GST summary
];

const ROLES = {
    Admin: PERMISSIONS,
    Manager: PERMISSIONS.filter((p) => !['staff.manage', 'settings.manage', 'payroll.manage'].includes(p)),
    Cashier: ['orders.view', 'orders.manage', 'payments.collect'],
    Waiter: ['orders.view', 'orders.manage'],
    Chef: ['orders.view', 'orders.manage', 'kitchen.manage', 'inventory.waste'],
};

const permissionsFor = (role) => ROLES[role] || [];
const can = (user, permission) => permissionsFor(user?.role).includes(permission);

module.exports = { PERMISSIONS, ROLES, permissionsFor, can };
