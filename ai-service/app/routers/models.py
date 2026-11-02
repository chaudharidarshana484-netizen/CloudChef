from fastapi import APIRouter
from app.services.ml_engine import engine

router = APIRouter()

@router.get("/")
def list_models():
    return {
        "models": list(engine.evaluation_results.values()),
        "best_model": "Gradient Boosting Regressor",
        "dataset_records": len(engine.dataset) if engine.dataset is not None else 0
    }

@router.post("/compare")
def compare_models():
    return {
        "evaluation_metrics": list(engine.evaluation_results.values()),
        "test_split_ratio": 0.20,
        "train_split_ratio": 0.80,
        "evaluation_methodology": "Chronological temporal hold-out split (80% train, 20% test). Avoids data leakage across future timestamps.",
        "metrics_explanation": {
            "MAE": "Mean Absolute Error: Average absolute error in portion counts",
            "RMSE": "Root Mean Squared Error: Penalizes larger variance predictions",
            "MAPE": "Mean Absolute Percentage Error (evaluated exclusively on non-zero demands)",
            "R2": "Coefficient of determination (proportion of variance explained by model)"
        }
    }

@router.post("/retrain")
def retrain_models():
    engine._initialize_models()
    return {
        "message": "Models retrained successfully using updated chronological order records.",
        "updated_metrics": list(engine.evaluation_results.values())
    }
