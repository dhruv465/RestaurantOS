const express = require('express');
const router = express.Router();
const c = require('../controllers/inventoryController');
const { isVerifiedUser, requirePermission, requireAnyPermission } = require('../middlewares/tokenVerification');

const manage = requirePermission('inventory.manage');
router.use(isVerifiedUser);

router.get('/ingredients', requireAnyPermission('inventory.manage', 'inventory.waste'), c.listIngredients);
router.post('/ingredients', manage, c.createIngredient);
router.patch('/ingredients/:id', manage, c.updateIngredient);
router.post('/ingredients/:id/adjust', manage, c.adjustStock);
router.post('/waste', requireAnyPermission('inventory.manage', 'inventory.waste'), c.logWaste);
router.post('/stock-take', manage, c.stockTake);
router.get('/movements', manage, c.listMovements);
router.get('/shopping-list', manage, c.shoppingList);
router.get('/recipes', manage, c.listRecipes);
router.put('/recipes/:itemId', manage, c.saveRecipe);
router.get('/suppliers', manage, c.listSuppliers);
router.post('/suppliers', manage, c.createSupplier);
router.patch('/suppliers/:id', manage, c.updateSupplier);
router.get('/purchase-orders', manage, c.listPurchaseOrders);
router.post('/purchase-orders', manage, c.createPurchaseOrder);
router.patch('/purchase-orders/:id', manage, c.updatePurchaseOrder);
router.post('/purchase-orders/:id/receive', manage, c.receivePurchaseOrder);

module.exports = router;
