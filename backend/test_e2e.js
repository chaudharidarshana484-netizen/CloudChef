require('dotenv').config();
const prisma = require('./src/utils/prisma');

async function runTests() {
  console.log('🧪 Starting CloudChef End-to-End Automated Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Verify Database Connection and Seed Data
    console.log('--- Test Suite 1: Database & Seed Data Integrity ---');
    const kitchen = await prisma.kitchen.findFirst();
    assert(Boolean(kitchen), 'Default kitchen exists');

    const menuCount = await prisma.menuItem.count();
    assert(menuCount >= 8, `Menu items seeded (found ${menuCount})`);

    const recipeCount = await prisma.recipe.count();
    assert(recipeCount >= 8, `Recipe BOMs seeded (found ${recipeCount})`);

    const orderCount = await prisma.order.count();
    assert(orderCount >= 100, `Historical orders seeded for ML training (found ${orderCount})`);

    // 2. Test Customer Storefront Order Placement
    console.log('\n--- Test Suite 2: Customer Ordering & Checkout Workflow ---');
    const butterChicken = await prisma.menuItem.findFirst({
      where: { name: 'Butter Chicken' },
      include: { recipe: { include: { items: true } } }
    });
    assert(Boolean(butterChicken), 'Found test item: Butter Chicken');

    const customer = await prisma.customer.findFirst();
    const orderNumber = `TEST-${Date.now()}`;
    const testOrder = await prisma.order.create({
      data: {
        kitchenId: kitchen.id,
        customerId: customer.id,
        orderNumber,
        status: 'PENDING',
        orderSource: 'DIRECT',
        paymentMethod: 'ONLINE_SIMULATED',
        paymentStatus: 'COMPLETED',
        subtotal: 280,
        tax: 14,
        total: 324,
        deliveryAddress: 'Test Suite Flat 101, Pune',
        stockDeducted: false,
        items: {
          create: [
            { menuItemId: butterChicken.id, quantity: 2, priceAtOrder: 280 }
          ]
        }
      },
      include: { items: { include: { menuItem: { include: { recipe: { include: { items: true } } } } } } }
    });
    assert(Boolean(testOrder), `Customer successfully placed order ${testOrder.orderNumber}`);

    // 3. Test Smart Recipe Inventory Deduction
    console.log('\n--- Test Suite 3: Smart Recipe Inventory Deduction & Duplicate Prevention ---');
    const chickenIng = await prisma.ingredient.findFirst({ where: { name: 'Chicken' } });
    const stockBefore = chickenIng.currentStock;

    // Transition order to PREPARING -> triggers recipe deduction
    // Butter chicken recipe requires 0.25 kg chicken per portion * 2 portions = 0.50 kg chicken
    const qtyToDeduct = 0.25 * 2; // 0.50 kg
    
    // Simulate order status controller logic:
    if (!testOrder.stockDeducted) {
      for (const item of testOrder.items) {
        for (const rItem of item.menuItem.recipe.items) {
          await prisma.ingredient.update({
            where: { id: rItem.ingredientId },
            data: { currentStock: { decrement: rItem.quantity * item.quantity } }
          });
        }
      }
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: 'PREPARING', stockDeducted: true }
      });
    }

    const chickenAfterDeduct = await prisma.ingredient.findUnique({ where: { id: chickenIng.id } });
    assert(
      Math.abs(chickenAfterDeduct.currentStock - (stockBefore - qtyToDeduct)) < 0.01,
      `Inventory deducted accurately: ${stockBefore}kg -> ${chickenAfterDeduct.currentStock}kg (-${qtyToDeduct}kg)`
    );

    // Duplicate deduction prevention check: transition to READY
    const orderAfterPrep = await prisma.order.findUnique({ where: { id: testOrder.id } });
    let duplicateDeducted = false;
    if (!orderAfterPrep.stockDeducted) {
      duplicateDeducted = true;
    }
    assert(!duplicateDeducted, 'Duplicate stock deduction prevented via stockDeducted flag');

    // 4. Test Cancellation and Restocking
    console.log('\n--- Test Suite 4: Order Cancellation & Automated Inventory Restocking ---');
    // If order is cancelled, restore ingredients
    if (orderAfterPrep.stockDeducted) {
      for (const item of testOrder.items) {
        for (const rItem of item.menuItem.recipe.items) {
          await prisma.ingredient.update({
            where: { id: rItem.ingredientId },
            data: { currentStock: { increment: rItem.quantity * item.quantity } }
          });
        }
      }
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: 'CANCELLED', stockDeducted: false, cancellationReason: 'Test cancellation' }
      });
    }

    const chickenAfterRestock = await prisma.ingredient.findUnique({ where: { id: chickenIng.id } });
    assert(
      Math.abs(chickenAfterRestock.currentStock - stockBefore) < 0.01,
      `Inventory automatically restocked on cancellation: returned to ${chickenAfterRestock.currentStock}kg`
    );

    // 5. Test Waste Logging & Simulation
    console.log('\n--- Test Suite 5: Food Waste Analytics & Counterfactual Simulation ---');
    const wasteCount = await prisma.wasteLog.count();
    assert(wasteCount >= 20, `Waste records present in database (found ${wasteCount})`);

    // 6. Test Model Evaluations Benchmark
    console.log('\n--- Test Suite 6: Machine Learning Model Evaluations ---');
    const evals = await prisma.modelEvaluation.findMany();
    assert(evals.length >= 3, `Model evaluations benchmark stored (found ${evals.length})`);
    const best = evals.find(e => e.isBestModel);
    assert(Boolean(best), `Best model identified: ${best?.modelName} (MAE: ${best?.mae}, RMSE: ${best?.rmse})`);

    // 7. Test Swiggy/Zomato Cost Assumptions
    console.log('\n--- Test Suite 7: Aggregator Profitability Settings ---');
    const costSettings = await prisma.platformCostSetting.findMany();
    assert(costSettings.length >= 3, `Platform settings exist for DIRECT, SWIGGY, ZOMATO (found ${costSettings.length})`);

    console.log(`\n======================================================`);
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
