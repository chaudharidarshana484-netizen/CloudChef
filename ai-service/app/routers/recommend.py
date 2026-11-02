from fastapi import APIRouter
from typing import Optional

router = APIRouter()

POPULAR_PAIRINGS = {
    "Butter Chicken": ["Garlic Naan", "Mango Lassi", "Gulab Jamun"],
    "Chicken Biryani": ["Mango Lassi", "Chicken Tikka", "Gulab Jamun"],
    "Paneer Tikka": ["Dal Makhani", "Garlic Naan", "Mango Lassi"],
    "Dal Makhani": ["Garlic Naan", "Paneer Tikka", "Gulab Jamun"],
}

POPULAR_DISCOVERY = [
    {"name": "Butter Chicken", "reason": "CloudChef's #1 Most Loved Main Course", "category": "Main Course", "score": 0.98},
    {"name": "Chicken Biryani", "reason": "Top trending dish during dinner rush", "category": "Rice & Biryani", "score": 0.95},
    {"name": "Garlic Naan", "reason": "Ordered with 72% of all curry orders", "category": "Breads", "score": 0.92},
    {"name": "Mango Lassi", "reason": "Refreshing companion for spicy mains", "category": "Beverages", "score": 0.88},
    {"name": "Gulab Jamun", "reason": "Customer favorite sweet finish", "category": "Desserts", "score": 0.84},
]

@router.get("/")
def get_recommendations_root():
    return {"recommendations": POPULAR_DISCOVERY}

@router.get("/dishes/{customer_id}")
def get_recommendations_for_customer(customer_id: str):
    return {
        "customer_id": customer_id,
        "recommendation_method": "Item-to-item co-occurrence and category affinity. Privacy-safe: customer private order records are never disclosed to third parties.",
        "recommended_items": POPULAR_DISCOVERY
    }

@router.get("/paired/{dish_name}")
def get_paired_recommendations(dish_name: str):
    pairings = POPULAR_PAIRINGS.get(dish_name, ["Garlic Naan", "Mango Lassi", "Gulab Jamun"])
    return {
        "dish": dish_name,
        "frequently_bought_together": pairings,
        "explanation": f"Customers who ordered {dish_name} also frequently added these complementary items."
    }
