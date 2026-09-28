import csv
import importlib.util
from pathlib import Path

MODULE = Path(__file__).parents[1] / "data" / "generate_synthetic_cdr.py"
spec = importlib.util.spec_from_file_location("cdrgen", MODULE)
cdrgen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cdrgen)

def test_generator_is_deterministic():
    a = list(cdrgen.generate(20, 10, 4, 7))
    b = list(cdrgen.generate(20, 10, 4, 7))
    assert a == b

def test_generator_has_network_and_subscriber_fields():
    row = next(cdrgen.generate(1, 10, 4, 42))
    required = {
        "subscriber_id","tower_id","event_type","latency_ms","jitter_ms",
        "packet_loss_pct","dropped","handover_failures","plan_tier"
    }
    assert required.issubset(row)
    assert -125 <= row["signal_dbm"] <= -48
    assert row["latency_ms"] > 0
