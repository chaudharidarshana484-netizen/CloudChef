const prisma = require('../utils/prisma');
const sseService = require('../services/sse.service');
const asyncHandler = require('../utils/asyncHandler');

// Helper to get kitchen ID
const getKitchenId = async (req) => {
  if (req.user && req.user.kitchenId) return req.user.kitchenId;
  const firstKitchen = await prisma.kitchen.findFirst();
  return firstKitchen ? firstKitchen.id : null;
};

// @desc    Get all menu items and categories
// @route   GET /api/menu
// @access  Public / Private
const getMenu = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  
  const [categories, items] = await prisma.$transaction([
    prisma.menuCategory.findMany({
      where: { kitchenId, isActive: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.menuItem.findMany({
      where: { kitchenId },
      include: {
        category: true,
        recipe: {
          include: {
            items: {
              include: { ingredient: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })
  ]);

  res.json({ categories, items });
});

// @desc    Create a new menu item
// @route   POST /api/menu
// @access  Private
const createMenuItem = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { categoryName, name, description, price, prepTimeMinutes, isVeg, tags, imageUrl } = req.body;

  // 1. Duplicate Check
  const existingItem = await prisma.menuItem.findFirst({
    where: { kitchenId, name: { equals: name, mode: 'insensitive' } }
  });

  if (existingItem) {
    res.status(409);
    throw new Error(`Menu item '${name}' already exists.`);
  }

  // 2. Find or create the category
  let category = await prisma.menuCategory.findFirst({
    where: { kitchenId, name: categoryName }
  });

  if (!category) {
    category = await prisma.menuCategory.create({
      data: { kitchenId, name: categoryName }
    });
  }

  // 3. Create Item
  const menuItem = await prisma.menuItem.create({
    data: {
      kitchenId,
      categoryId: category.id,
      name,
      description,
      price: parseFloat(price),
      prepTimeMinutes: parseInt(prepTimeMinutes) || 15,
      isVeg: isVeg ?? true,
      imageUrl: imageUrl || null,
      tags: tags || []
    },
    include: { category: true }
  });

  sseService.broadcast('MENU_UPDATED', { action: 'CREATED', data: menuItem }, kitchenId);
  res.status(201).json(menuItem);
});

// @desc    Update a menu item
// @route   PUT /api/menu/:id
// @access  Private
const updateMenuItem = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { id } = req.params;
  const updates = req.body;

  if (updates.price !== undefined) updates.price = parseFloat(updates.price);
  if (updates.prepTimeMinutes !== undefined) updates.prepTimeMinutes = parseInt(updates.prepTimeMinutes);

  const menuItem = await prisma.menuItem.update({
    where: { id, kitchenId },
    data: {
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.price !== undefined && { price: updates.price }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.isAvailable !== undefined && { isAvailable: updates.isAvailable }),
      ...(updates.isVeg !== undefined && { isVeg: updates.isVeg }),
      ...(updates.imageUrl !== undefined && { imageUrl: updates.imageUrl }),
      ...(updates.tags !== undefined && { tags: updates.tags })
    },
    include: { category: true, recipe: { include: { items: { include: { ingredient: true } } } } }
  });

  sseService.broadcast('MENU_UPDATED', { action: 'UPDATED', data: menuItem }, kitchenId);
  res.json(menuItem);
});

// @desc    Toggle menu item availability
// @route   PATCH /api/menu/:id/availability
// @access  Private
const toggleAvailability = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { id } = req.params;

  const current = await prisma.menuItem.findUnique({ where: { id, kitchenId } });
  if (!current) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  const updated = await prisma.menuItem.update({
    where: { id, kitchenId },
    data: { isAvailable: !current.isAvailable }
  });

  sseService.broadcast('MENU_UPDATED', { action: 'AVAILABILITY_CHANGED', data: updated }, kitchenId);
  res.json(updated);
});

// @desc    Delete a menu item
// @route   DELETE /api/menu/:id
// @access  Private
const deleteMenuItem = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { id } = req.params;

  await prisma.menuItem.delete({
    where: { id, kitchenId }
  });

  sseService.broadcast('MENU_UPDATED', { action: 'DELETED', id }, kitchenId);
  res.json({ message: 'Menu item deleted successfully' });
});

// @desc    Get recipes for all items
// @route   GET /api/menu/recipes
// @access  Private
const getRecipes = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const recipes = await prisma.recipe.findMany({
    where: { kitchenId },
    include: {
      menuItem: { select: { id: true, name: true, price: true, category: true } },
      items: {
        include: { ingredient: true }
      }
    }
  });
  res.json(recipes);
});

// @desc    Create or update recipe for a menu item
// @route   POST /api/menu/recipes
// @access  Private
const saveRecipe = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { menuItemId, yieldServings = 1, prepInstructions, items } = req.body;

  if (!menuItemId || !items || !Array.isArray(items)) {
    res.status(400);
    throw new Error('Invalid recipe payload. menuItemId and items array are required.');
  }

  // Upsert Recipe
  let recipe = await prisma.recipe.findUnique({
    where: { menuItemId }
  });

  if (!recipe) {
    recipe = await prisma.recipe.create({
      data: {
        kitchenId,
        menuItemId,
        yieldServings: parseInt(yieldServings) || 1,
        prepInstructions: prepInstructions || null
      }
    });
  } else {
    recipe = await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        yieldServings: parseInt(yieldServings) || 1,
        prepInstructions: prepInstructions || null
      }
    });
    // Remove existing items and recreate
    await prisma.recipeItem.deleteMany({ where: { recipeId: recipe.id } });
  }

  // Create recipe items
  for (const it of items) {
    await prisma.recipeItem.create({
      data: {
        recipeId: recipe.id,
        ingredientId: it.ingredientId,
        quantity: parseFloat(it.quantity),
        unit: it.unit || 'kg'
      }
    });
  }

  const completeRecipe = await prisma.recipe.findUnique({
    where: { id: recipe.id },
    include: {
      menuItem: true,
      items: { include: { ingredient: true } }
    }
  });

  res.json(completeRecipe);
});

// @desc    Get single menu item by ID
// @route   GET /api/menu/:id
// @access  Public
const getMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      category: true,
      recipe: {
        include: {
          items: { include: { ingredient: true } }
        }
      }
    }
  });

  if (!item) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  res.json(item);
});

module.exports = {
  getMenu,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  toggleAvailability,
  deleteMenuItem,
  getRecipes,
  saveRecipe
};

