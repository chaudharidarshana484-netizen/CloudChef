require('dotenv').config();
const prisma = require('../src/utils/prisma');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean up in correct FK dependency order
  await prisma.modelEvaluation.deleteMany({});
  await prisma.platformCostSetting.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.recipeItem.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.wasteLog.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.ingredient.deleteMany({});
  await prisma.recommendation.deleteMany({});
  await prisma.pricingSuggestion.deleteMany({});
  await prisma.demandForecast.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.menuCategory.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.kitchen.deleteMany({});

  console.log('🗑️  Cleared existing data.');

  // 2. Create Kitchen
  const kitchen = await prisma.kitchen.create({
    data: {
      name: 'CloudKitchen AI India',
      city: 'Pune',
      address: 'Shop 14, Baner High Street, Pune, Maharashtra 411045',
      phone: '+91 98765 43210',
      email: 'contact@cloudchef.kitchen',
      isActive: true,
    }
  });
  console.log(`✅ Created Kitchen: ${kitchen.name}`);

  // 3. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const owner = await prisma.user.create({
    data: {
      kitchenId: kitchen.id,
      name: 'Chef & Owner (Admin)',
      email: 'owner@cloudkitchen.ai',
      passwordHash,
      role: 'OWNER',
      phone: '+91 98765 43210',
    }
  });

  const staff = await prisma.user.create({
    data: {
      kitchenId: kitchen.id,
      name: 'Kitchen Staff',
      email: 'staff@cloudkitchen.ai',
      passwordHash,
      role: 'CHEF',
      phone: '+91 98765 43211',
    }
  });
  console.log(`✅ Created Admin & Staff Users`);

  // 4. Create Platform Cost Settings (Swiggy, Zomato, Direct)
  await prisma.platformCostSetting.createMany({
    data: [
      {
        kitchenId: kitchen.id,
        platform: 'DIRECT',
        commissionRate: 0.0,
        deliveryFee: 30.0,
        packagingCharge: 15.0,
        paymentGatewayFee: 2.0,
        fixedFeePerOrder: 0.0,
        gstPercentage: 5.0,
        isActive: true,
      },
      {
        kitchenId: kitchen.id,
        platform: 'SWIGGY',
        commissionRate: 20.0,
        deliveryFee: 0.0,
        packagingCharge: 15.0,
        paymentGatewayFee: 0.0,
        fixedFeePerOrder: 3.0,
        gstPercentage: 5.0,
        isActive: true,
      },
      {
        kitchenId: kitchen.id,
        platform: 'ZOMATO',
        commissionRate: 22.0,
        deliveryFee: 0.0,
        packagingCharge: 15.0,
        paymentGatewayFee: 0.0,
        fixedFeePerOrder: 3.5,
        gstPercentage: 5.0,
        isActive: true,
      },
    ]
  });
  console.log('✅ Created Platform Cost Settings (Direct, Swiggy, Zomato)');

  // 5. Create Menu Categories
  const categories = await Promise.all([
    prisma.menuCategory.create({ data: { kitchenId: kitchen.id, name: 'Starters', sortOrder: 1 } }),
    prisma.menuCategory.create({ data: { kitchenId: kitchen.id, name: 'Main Course', sortOrder: 2 } }),
    prisma.menuCategory.create({ data: { kitchenId: kitchen.id, name: 'Breads', sortOrder: 3 } }),
    prisma.menuCategory.create({ data: { kitchenId: kitchen.id, name: 'Rice & Biryani', sortOrder: 4 } }),
    prisma.menuCategory.create({ data: { kitchenId: kitchen.id, name: 'Desserts', sortOrder: 5 } }),
    prisma.menuCategory.create({ data: { kitchenId: kitchen.id, name: 'Beverages', sortOrder: 6 } }),
  ]);
  const [starters, mainCourse, breads, rice, desserts, beverages] = categories;

  // 6. Create Menu Items
  const menuItemsData = [
    {
      categoryId: mainCourse.id,
      name: 'Butter Chicken',
      description: 'Tender chicken simmered in a velvety aromatic tomato-butter gravy with fenugreek and spices.',
      price: 280,
      prepTimeMinutes: 20,
      isVeg: false,
      imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=500&q=80',
      calories: 520,
      tags: ['Bestseller', 'North Indian', 'Curry']
    },
    {
      categoryId: starters.id,
      name: 'Paneer Tikka',
      description: 'Char-grilled cubes of fresh cottage cheese marinated in spiced hung yogurt and mustard oil.',
      price: 220,
      prepTimeMinutes: 15,
      isVeg: true,
      imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=500&q=80',
      calories: 380,
      tags: ['Tandoor', 'Vegetarian', 'Appetizer']
    },
    {
      categoryId: rice.id,
      name: 'Chicken Biryani',
      description: 'Fragrant aged basmati rice cooked on dum with tender spiced chicken, saffron, and caramelised onions.',
      price: 320,
      prepTimeMinutes: 25,
      isVeg: false,
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80',
      calories: 650,
      tags: ['Bestseller', 'Dum Biryani', 'Popular']
    },
    {
      categoryId: mainCourse.id,
      name: 'Dal Makhani',
      description: 'Slow-cooked whole black lentils and kidney beans simmered overnight with butter, cream, and tomato.',
      price: 200,
      prepTimeMinutes: 18,
      isVeg: true,
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
      calories: 420,
      tags: ['Classic', 'Creamy', 'Vegetarian']
    },
    {
      categoryId: breads.id,
      name: 'Garlic Naan',
      description: 'Traditional leavened oven-baked flatbread topped with minced garlic, fresh coriander, and melted butter.',
      price: 50,
      prepTimeMinutes: 8,
      isVeg: true,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80',
      calories: 180,
      tags: ['Tandoor', 'Bread']
    },
    {
      categoryId: starters.id,
      name: 'Chicken Tikka',
      description: 'Boneless chicken chunks marinated in aromatic Kashmiri chili marinade, roasted in tandoor.',
      price: 260,
      prepTimeMinutes: 18,
      isVeg: false,
      imageUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=500&q=80',
      calories: 410,
      tags: ['Tandoor', 'High Protein']
    },
    {
      categoryId: desserts.id,
      name: 'Gulab Jamun',
      description: 'Warm, soft milk-solid dumplings soaked in rose and cardamom-scented sugar syrup.',
      price: 80,
      prepTimeMinutes: 5,
      isVeg: true,
      imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=500&q=80',
      calories: 290,
      tags: ['Dessert', 'Sweet']
    },
    {
      categoryId: beverages.id,
      name: 'Mango Lassi',
      description: 'Rich, chilled Alphonso mango pulp blended with fresh yogurt and a hint of cardamom.',
      price: 90,
      prepTimeMinutes: 3,
      isVeg: true,
      imageUrl: 'https://images.unsplash.com/photo-1570696516188-ade861b84a49?auto=format&fit=crop&w=500&q=80',
      calories: 220,
      tags: ['Beverage', 'Chilled']
    },
  ];

  const menuItems = [];
  for (const item of menuItemsData) {
    const created = await prisma.menuItem.create({
      data: { kitchenId: kitchen.id, ...item }
    });
    menuItems.push(created);
  }
  console.log(`✅ Created ${menuItems.length} menu items`);

  // 7. Create Ingredients
  const ingredientsData = [
    { name: 'Chicken', unit: 'kg', currentStock: 18.5, reorderLevel: 6.0, reorderQuantity: 20.0, costPerUnit: 220, category: 'Meat' },
    { name: 'Tomatoes', unit: 'kg', currentStock: 12.0, reorderLevel: 5.0, reorderQuantity: 15.0, costPerUnit: 40, category: 'Vegetables' },
    { name: 'Paneer', unit: 'kg', currentStock: 4.5, reorderLevel: 3.0, reorderQuantity: 10.0, costPerUnit: 320, category: 'Dairy' },
    { name: 'Basmati Rice', unit: 'kg', currentStock: 30.0, reorderLevel: 10.0, reorderQuantity: 50.0, costPerUnit: 80, category: 'Grains' },
    { name: 'Butter', unit: 'kg', currentStock: 5.2, reorderLevel: 3.0, reorderQuantity: 10.0, costPerUnit: 480, category: 'Dairy' },
    { name: 'Maida (Flour)', unit: 'kg', currentStock: 16.0, reorderLevel: 5.0, reorderQuantity: 25.0, costPerUnit: 45, category: 'Grains' },
    { name: 'Onions', unit: 'kg', currentStock: 8.0, reorderLevel: 5.0, reorderQuantity: 20.0, costPerUnit: 30, category: 'Vegetables' },
    { name: 'Cooking Oil', unit: 'litre', currentStock: 14.0, reorderLevel: 5.0, reorderQuantity: 25.0, costPerUnit: 130, category: 'Oils' },
    { name: 'Garam Masala', unit: 'kg', currentStock: 1.8, reorderLevel: 0.8, reorderQuantity: 3.0, costPerUnit: 600, category: 'Spices' },
    { name: 'Fresh Cream', unit: 'litre', currentStock: 6.0, reorderLevel: 3.0, reorderQuantity: 10.0, costPerUnit: 160, category: 'Dairy' },
    { name: 'Curd / Yogurt', unit: 'kg', currentStock: 7.5, reorderLevel: 4.0, reorderQuantity: 12.0, costPerUnit: 70, category: 'Dairy' },
    { name: 'Sugar', unit: 'kg', currentStock: 10.0, reorderLevel: 4.0, reorderQuantity: 15.0, costPerUnit: 45, category: 'Grains' },
  ];

  const ingredientMap = {};
  for (const ing of ingredientsData) {
    const created = await prisma.ingredient.create({
      data: { kitchenId: kitchen.id, ...ing }
    });
    ingredientMap[ing.name] = created;
  }
  console.log(`✅ Created ${Object.keys(ingredientMap).length} ingredients`);

  // 8. Create Recipes and Recipe Items (BOM)
  const itemByName = {};
  menuItems.forEach(m => { itemByName[m.name] = m; });

  const recipes = [
    {
      dish: 'Butter Chicken',
      items: [
        { ing: 'Chicken', qty: 0.25, unit: 'kg' },
        { ing: 'Tomatoes', qty: 0.15, unit: 'kg' },
        { ing: 'Butter', qty: 0.05, unit: 'kg' },
        { ing: 'Fresh Cream', qty: 0.05, unit: 'litre' },
        { ing: 'Garam Masala', qty: 0.01, unit: 'kg' },
      ]
    },
    {
      dish: 'Paneer Tikka',
      items: [
        { ing: 'Paneer', qty: 0.20, unit: 'kg' },
        { ing: 'Curd / Yogurt', qty: 0.05, unit: 'kg' },
        { ing: 'Onions', qty: 0.05, unit: 'kg' },
        { ing: 'Garam Masala', qty: 0.01, unit: 'kg' },
      ]
    },
    {
      dish: 'Chicken Biryani',
      items: [
        { ing: 'Chicken', qty: 0.20, unit: 'kg' },
        { ing: 'Basmati Rice', qty: 0.15, unit: 'kg' },
        { ing: 'Onions', qty: 0.06, unit: 'kg' },
        { ing: 'Cooking Oil', qty: 0.02, unit: 'litre' },
        { ing: 'Garam Masala', qty: 0.01, unit: 'kg' },
      ]
    },
    {
      dish: 'Dal Makhani',
      items: [
        { ing: 'Butter', qty: 0.08, unit: 'kg' },
        { ing: 'Fresh Cream', qty: 0.04, unit: 'litre' },
        { ing: 'Tomatoes', qty: 0.06, unit: 'kg' },
        { ing: 'Garam Masala', qty: 0.01, unit: 'kg' },
      ]
    },
    {
      dish: 'Garlic Naan',
      items: [
        { ing: 'Maida (Flour)', qty: 0.15, unit: 'kg' },
        { ing: 'Butter', qty: 0.02, unit: 'kg' },
      ]
    },
    {
      dish: 'Chicken Tikka',
      items: [
        { ing: 'Chicken', qty: 0.20, unit: 'kg' },
        { ing: 'Curd / Yogurt', qty: 0.05, unit: 'kg' },
        { ing: 'Garam Masala', qty: 0.01, unit: 'kg' },
      ]
    },
    {
      dish: 'Gulab Jamun',
      items: [
        { ing: 'Maida (Flour)', qty: 0.05, unit: 'kg' },
        { ing: 'Sugar', qty: 0.06, unit: 'kg' },
      ]
    },
    {
      dish: 'Mango Lassi',
      items: [
        { ing: 'Curd / Yogurt', qty: 0.18, unit: 'kg' },
        { ing: 'Sugar', qty: 0.03, unit: 'kg' },
      ]
    },
  ];

  for (const r of recipes) {
    const menuItem = itemByName[r.dish];
    if (menuItem) {
      const recipe = await prisma.recipe.create({
        data: {
          kitchenId: kitchen.id,
          menuItemId: menuItem.id,
          yieldServings: 1,
          prepInstructions: `Standard CloudChef SOP for ${r.dish}`
        }
      });
      for (const it of r.items) {
        const ing = ingredientMap[it.ing];
        if (ing) {
          await prisma.recipeItem.create({
            data: {
              recipeId: recipe.id,
              ingredientId: ing.id,
              quantity: it.qty,
              unit: it.unit,
            }
          });
        }
      }
    }
  }
  console.log('✅ Created Recipes and Recipe BOMs for all menu items');

  // 9. Create Suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { kitchenId: kitchen.id, name: 'Fresh Farms Organics', contactPerson: 'Suresh Patil', phone: '+91 98765-11111', rating: 4.8, address: 'Market Yard, Pune' } }),
    prisma.supplier.create({ data: { kitchenId: kitchen.id, name: 'Premium Meats Ltd.', contactPerson: 'Nitin Kamat', phone: '+91 98765-22222', rating: 4.6, address: 'Bhavani Peth, Pune' } }),
    prisma.supplier.create({ data: { kitchenId: kitchen.id, name: 'Daily Dairy Co.', contactPerson: 'Vikram Joshi', phone: '+91 98765-33333', rating: 4.9, address: 'Shivajinagar, Pune' } }),
  ]);
  console.log(`✅ Created ${suppliers.length} suppliers`);

  // 10. Create Customers
  const customerList = [
    { name: 'Ankit Shah', phone: '+91 98765 43210', email: 'ankit@demo.com', address: 'Apt 402, Rohan Nilay, Aundh, Pune' },
    { name: 'Priya Nair', phone: '+91 91234 56789', email: 'priya@demo.com', address: 'B-12, Ivory Estate, Baner, Pune' },
    { name: 'Rahul Verma', phone: '+91 87654 32109', email: 'rahul@demo.com', address: 'Flat 301, Marvel Bounty, Hadapsar, Pune' },
    { name: 'Sneha Patil', phone: '+91 99887 66554', email: 'sneha@demo.com', address: 'Tower 4, Blue Ridge, Hinjewadi, Pune' },
    { name: 'Kiran Mehta', phone: '+91 97654 31200', email: 'kiran@demo.com', address: 'Plot 18, Balewadi High Street, Pune' },
  ];

  const customers = [];
  for (const c of customerList) {
    const cust = await prisma.customer.create({
      data: {
        kitchenId: kitchen.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
      }
    });
    customers.push(cust);
  }
  console.log(`✅ Created ${customers.length} sample customers`);

  // 11. Generate Realistic Historical Orders (Last 30 Days)
  console.log('⏳ Generating 30 days of realistic orders for ML training...');
  const now = new Date();
  const channels = ['DIRECT', 'SWIGGY', 'ZOMATO'];
  const channelWeights = [0.35, 0.40, 0.25];

  let orderCount = 0;
  // Loop back 30 days to generate authentic variance
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    // Day of week multiplier (weekends have 35-50% more demand)
    const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseOrdersToday = isWeekend ? 22 : 14;
    const numOrdersToday = baseOrdersToday + Math.floor(Math.random() * 8);

    for (let o = 0; o < numOrdersToday; o++) {
      orderCount++;
      // Determine peak hour: 45% lunch (12-14), 45% dinner (19-22), 10% other
      const randHour = Math.random();
      let hour = 13;
      if (randHour < 0.45) {
        hour = 12 + Math.floor(Math.random() * 3); // 12, 13, 14
      } else if (randHour < 0.90) {
        hour = 19 + Math.floor(Math.random() * 4); // 19, 20, 21, 22
      } else {
        hour = 15 + Math.floor(Math.random() * 4); // 15, 16, 17, 18
      }
      const minute = Math.floor(Math.random() * 60);

      const placedAt = new Date(date);
      placedAt.setHours(hour, minute, 0, 0);

      // Select channel
      const chRand = Math.random();
      const channel = chRand < 0.35 ? 'DIRECT' : chRand < 0.75 ? 'SWIGGY' : 'ZOMATO';
      const customer = customers[Math.floor(Math.random() * customers.length)];

      // Status: if past day, mostly DELIVERED, small chance CANCELLED; if today, mix of PENDING, PREPARING, READY, DELIVERED
      let status = 'DELIVERED';
      if (daysAgo === 0) {
        const statuses = ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
        status = statuses[Math.floor(Math.random() * statuses.length)];
      } else {
        if (Math.random() < 0.05) status = 'CANCELLED';
      }

      // Pick 1 to 3 items
      const numItems = 1 + Math.floor(Math.random() * 3);
      const chosenItems = [];
      let subtotal = 0;
      let estIngredientCost = 0;

      for (let i = 0; i < numItems; i++) {
        // Weighted dish pick: Butter Chicken & Biryani are top sellers
        const dishIndex = Math.floor(Math.pow(Math.random(), 1.5) * menuItems.length);
        const item = menuItems[dishIndex];
        const qty = 1 + (Math.random() < 0.25 ? 1 : 0);
        chosenItems.push({ menuItem: item, quantity: qty, priceAtOrder: item.price });
        subtotal += item.price * qty;
        // Approx 30-35% food cost
        estIngredientCost += item.price * qty * 0.32;
      }

      const tax = Math.round(subtotal * 0.05);
      const deliveryFee = channel === 'DIRECT' ? 30 : 0;
      const total = subtotal + tax + deliveryFee;

      // Platform commission
      const commRate = channel === 'SWIGGY' ? 0.20 : channel === 'ZOMATO' ? 0.22 : 0.0;
      const channelCommission = parseFloat((subtotal * commRate).toFixed(2));
      const packagingCost = 15.0;

      const orderNumber = `CC-${placedAt.getFullYear()}${String(placedAt.getMonth() + 1).padStart(2, '0')}-${String(orderCount).padStart(4, '0')}`;

      // Timestamps
      const confirmedAt = new Date(placedAt.getTime() + 2 * 60000);
      const preparedAt = new Date(placedAt.getTime() + 18 * 60000);
      const deliveredAt = status === 'DELIVERED' ? new Date(placedAt.getTime() + 38 * 60000) : null;
      const cancelledAt = status === 'CANCELLED' ? new Date(placedAt.getTime() + 5 * 60000) : null;

      const rating = status === 'DELIVERED' && Math.random() < 0.4 ? (Math.random() < 0.8 ? 5 : 4) : null;
      const feedbackComment = rating === 5 ? 'Delicious and piping hot! Authentic taste.' : rating === 4 ? 'Good packaging, fast delivery.' : null;

      const createdOrder = await prisma.order.create({
        data: {
          kitchenId: kitchen.id,
          customerId: customer.id,
          orderNumber,
          status,
          orderSource: channel,
          paymentMethod: Math.random() < 0.6 ? 'ONLINE_SIMULATED' : 'COD',
          paymentStatus: status === 'CANCELLED' ? 'REFUNDED' : 'COMPLETED',
          subtotal,
          tax,
          total,
          deliveryAddress: customer.address,
          stockDeducted: status !== 'PENDING',
          channelCommission,
          estimatedPackagingCost: packagingCost,
          estimatedIngredientCost: parseFloat(estIngredientCost.toFixed(2)),
          rating,
          feedbackComment,
          placedAt,
          confirmedAt,
          preparedAt,
          deliveredAt,
          cancelledAt,
          items: {
            create: chosenItems.map(it => ({
              menuItemId: it.menuItem.id,
              quantity: it.quantity,
              priceAtOrder: it.priceAtOrder,
            }))
          }
        }
      });

      if (rating) {
        await prisma.feedback.create({
          data: {
            customerId: customer.id,
            orderId: createdOrder.id,
            rating,
            comment: feedbackComment,
            createdAt: deliveredAt || placedAt,
          }
        });
      }
    }
  }
  console.log(`✅ Seeded ${orderCount} realistic orders across 30 days.`);

  // 12. Create Waste Logs (Recorded waste for analytics and comparison)
  const wasteReasons = ['Over-preparation', 'Spoilage', 'Expired', 'Spillage', 'Rejected portion'];
  const wasteItems = [
    { name: 'Tomatoes', ing: ingredientMap['Tomatoes'], cost: 40, qty: 1.5, unit: 'kg' },
    { name: 'Chicken', ing: ingredientMap['Chicken'], cost: 220, qty: 1.0, unit: 'kg' },
    { name: 'Paneer', ing: ingredientMap['Paneer'], cost: 320, qty: 0.8, unit: 'kg' },
    { name: 'Basmati Rice', ing: ingredientMap['Basmati Rice'], cost: 80, qty: 2.0, unit: 'kg' },
    { name: 'Fresh Cream', ing: ingredientMap['Fresh Cream'], cost: 160, qty: 0.5, unit: 'litre' },
    { name: 'Butter Chicken Gravy', ing: null, cost: 280, qty: 2.0, unit: 'portions' },
  ];

  for (let w = 0; w < 24; w++) {
    const item = wasteItems[Math.floor(Math.random() * wasteItems.length)];
    const reason = wasteReasons[Math.floor(Math.random() * wasteReasons.length)];
    const wasteDate = new Date();
    wasteDate.setDate(wasteDate.getDate() - Math.floor(Math.random() * 25));

    await prisma.wasteLog.create({
      data: {
        kitchenId: kitchen.id,
        ingredientId: item.ing ? item.ing.id : null,
        itemType: item.ing ? 'INGREDIENT' : 'DISH',
        itemName: item.name,
        quantity: item.qty,
        unit: item.unit,
        reason,
        estimatedCost: item.cost * item.qty,
        loggedAt: wasteDate,
      }
    });
  }
  console.log('✅ Seeded 24 realistic food waste records');

  // 13. Create Model Evaluation Benchmark records (MCA Major Research Project)
  await prisma.modelEvaluation.createMany({
    data: [
      {
        kitchenId: kitchen.id,
        modelName: 'Seasonal-Naive Baseline',
        datasetSize: orderCount,
        trainSplitRatio: 0.8,
        mae: 7.42,
        rmse: 9.85,
        mape: 14.8,
        r2: 0.72,
        featureCount: 2,
        horizonDays: 7,
        isBestModel: false,
        parameters: { lag: 7, method: 'day_of_week_rolling_mean' },
      },
      {
        kitchenId: kitchen.id,
        modelName: 'Random Forest Regressor',
        datasetSize: orderCount,
        trainSplitRatio: 0.8,
        mae: 4.18,
        rmse: 5.62,
        mape: 7.9,
        r2: 0.91,
        featureCount: 6,
        horizonDays: 7,
        isBestModel: false,
        parameters: { n_estimators: 100, max_depth: 8, random_state: 42 },
      },
      {
        kitchenId: kitchen.id,
        modelName: 'Gradient Boosting Regressor',
        datasetSize: orderCount,
        trainSplitRatio: 0.8,
        mae: 3.25,
        rmse: 4.38,
        mape: 5.6,
        r2: 0.95,
        featureCount: 6,
        horizonDays: 7,
        isBestModel: true,
        parameters: { n_estimators: 120, learning_rate: 0.08, max_depth: 5, random_state: 42 },
      },
    ]
  });
  console.log('✅ Seeded Research Model Evaluations benchmark');

  console.log('\n🎉 Database Seeding Finished Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏢  Kitchen:   CloudKitchen AI India (Pune)`);
  console.log(`📧  Admin:     owner@cloudkitchen.ai | password123`);
  console.log(`👨‍🍳  Staff:     staff@cloudkitchen.ai | password123`);
  console.log(`📦  Orders:    ${orderCount} simulated historical orders`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
