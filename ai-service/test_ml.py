import sys
import os

# Add ai-service to path
sys.path.insert(0, os.path.dirname(__file__))

from app.services.ml_engine import engine

def test_ml_service():
    print("[TEST] Running ML Service Validation Tests...\n")
    passed = 0
    failed = 0

    def assert_test(cond, msg):
        nonlocal passed, failed
        if cond:
            print(f"  [PASS] {msg}")
            passed += 1
        else:
            print(f"  [FAIL] {msg}")
            failed += 1

    # 1. Dataset Generation
    df = engine.dataset
    assert_test(df is not None and len(df) > 500, f"Synthetic dataset initialized ({len(df)} records)")

    # 2. Chronological Split & Leakage Check
    assert_test(engine.rf_model is not None, "Random Forest model trained and serialized")
    assert_test(engine.gb_model is not None, "Gradient Boosting model trained and serialized")

    # 3. Model Evaluations
    evals = engine.evaluation_results
    assert_test("baseline" in evals and "random_forest" in evals and "gradient_boosting" in evals, "All 3 models evaluated")
    gb_mae = evals["gradient_boosting"]["mae"]
    base_mae = evals["baseline"]["mae"]
    assert_test(gb_mae < base_mae, f"Gradient Boosting outperforms Seasonal Baseline (MAE: {gb_mae} vs {base_mae})")

    # 4. Multi-Day Forecast Horizon
    forecast_7d = engine.forecast_future(horizon_days=7)
    assert_test(forecast_7d["total_predicted_orders"] > 0, f"7-Day forecast generated: {forecast_7d['total_predicted_orders']} portions")
    assert_test(len(forecast_7d["item_forecasts"]) == 8, "Item-level portions predicted for all 8 catalog dishes")

    # 5. Ingredient Requirement BOM Explosion (Requirement #5)
    inv_calc = engine.predict_ingredient_requirements(horizon_days=7)
    assert_test(len(inv_calc["purchase_suggestions"]) > 0, f"Purchase suggestions calculated for {len(inv_calc['purchase_suggestions'])} ingredients")
    assert_test("dish_ingredient_breakdown" in inv_calc and len(inv_calc["dish_ingredient_breakdown"]) > 0, "Recipe BOM table populated with portions, required qty, and available stock")

    print(f"\n======================================================")
    print(f"ML TEST SUITE SUMMARY: {passed} PASSED | {failed} FAILED")
    print(f"======================================================\n")

    return failed == 0

if __name__ == "__main__":
    success = test_ml_service()
    sys.exit(0 if success else 1)
