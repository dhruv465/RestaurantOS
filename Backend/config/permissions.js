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
    'loyalty.adjust',   // add or remove a customer's points by hand
    'inventory.manage', // ingredients, recipes, suppliers, purchase orders, stock counts
    'inventory.waste',  // log wasted stock
    'hr.manage',        // attendance fixes, rota, approve leave
    'payroll.manage',   // pay rates and payroll runs
    'accounting.manage', // expenses, cash close, P&L and GST summary
    'delivery.manage',  // delivery zones, assign riders, delivery board
    'delivery.rider',   // sees and updates their own deliveries
];

const ROLES = {
    Admin: PERMISSIONS.filter((p) => p !== 'delivery.rider'),
    Manager: PERMISSIONS.filter((p) => !['staff.manage', 'settings.manage', 'payroll.manage', 'delivery.rider'].includes(p)),
    Cashier: ['orders.view', 'orders.manage', 'payments.collect', 'delivery.manage'],
    Waiter: ['orders.view', 'orders.manage'],
    Chef: ['orders.view', 'orders.manage', 'kitchen.manage', 'inventory.waste'],
    Rider: ['delivery.rider'],
};

const permissionsFor = (role) => ROLES[role] || [];
const can = (user, permission) => permissionsFor(user?.role).includes(permission);

module.exports = { PERMISSIONS, ROLES, permissionsFor, can };
