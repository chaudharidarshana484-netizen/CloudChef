from fastapi import APIRouter

router = APIRouter()

DYNAMIC_PRICING_SUGGESTIONS = [
    {
        "item_name": "Chicken Biryani",
        "current_price": 320,
        "suggested_price": 340,
        "change": "+₹20",
        "confidence": "94%",
        "reason": "High demand surge during 8–10 PM dinner peak; kitchen capacity utilization exceeds 85%."
    },
    {
        "item_name": "Butter Chicken",
        "current_price": 280,
        "suggested_price": 295,
        "change": "+₹15",
        "confidence": "91%",
        "reason": "Top bestseller with low price elasticity on Friday and Saturday evenings."
    },
    {
        "item_name": "Veg Pulao",
        "current_price": 180,
        "suggested_price": 165,
        "change": "-₹15",
        "confidence": "82%",
        "reason": "Under-ordered during weekday lunch slots; promotional discount recommended to stimulate volume."
    }
]

@router.get("/")
def get_pricing():
    return {"suggestions": DYNAMIC_PRICING_SUGGESTIONS}

@router.post("/suggest")
def get_pricing_suggestions():
    return {"suggestions": DYNAMIC_PRICING_SUGGESTIONS}
