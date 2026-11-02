from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_analytics():
    return {
        "status": "ready",
        "description": "ML-driven analytics endpoints"
    }

@router.get("/peak-hours")
def get_peak_hours():
    return {
        "lunch_peak": "12:00 PM - 2:00 PM (45% of daily volume)",
        "dinner_peak": "7:30 PM - 10:00 PM (45% of daily volume)",
        "off_peak": "2:00 PM - 6:00 PM (10% of daily volume)"
    }

@router.get("/revenue")
def get_revenue_forecast():
    return {
        "predicted_weekly_revenue": 195000,
        "growth_projection": "+12.4%",
        "confidence_interval": "₹185,000 - ₹205,000"
    }
