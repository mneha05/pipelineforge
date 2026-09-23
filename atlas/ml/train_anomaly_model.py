"""Train a compact TensorFlow autoencoder for pipeline telemetry anomalies."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf


FEATURES = ("rows_per_sec", "p95_ms", "error_rate", "cpu_pct", "backpressure_ms")


def build_model(width: int) -> tf.keras.Model:
    inputs = tf.keras.Input(shape=(width,), name="telemetry")
    x = tf.keras.layers.Dense(16, activation="relu")(inputs)
    x = tf.keras.layers.Dense(6, activation="relu", name="embedding")(x)
    x = tf.keras.layers.Dense(16, activation="relu")(x)
    outputs = tf.keras.layers.Dense(width, name="reconstruction")(x)
    model = tf.keras.Model(inputs, outputs, name="atlas_autoencoder")
    model.compile(optimizer="adam", loss="mse")
    return model


def synthetic_training_set(rows: int, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    centers = np.array([12000.0, 28.0, 0.003, 56.0, 4.0], dtype=np.float32)
    spread = np.array([1800.0, 7.0, 0.0015, 10.0, 2.0], dtype=np.float32)
    data = rng.normal(centers, spread, size=(rows, len(FEATURES))).astype(np.float32)
    return data


def normalize(data: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    mean = data.mean(axis=0)
    std = data.std(axis=0) + 1e-6
    return (data - mean) / std, mean, std


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rows", type=int, default=12000)
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--out", type=Path, default=Path("artifacts/atlas-anomaly"))
    args = parser.parse_args()

    tf.keras.utils.set_random_seed(7)
    raw = synthetic_training_set(args.rows)
    x, mean, std = normalize(raw)

    model = build_model(x.shape[1])
    model.fit(x, x, epochs=args.epochs, batch_size=128, validation_split=0.15, verbose=2)

    reconstruction = model.predict(x, verbose=0)
    errors = np.mean(np.square(x - reconstruction), axis=1)
    threshold = float(np.quantile(errors, 0.995))

    args.out.mkdir(parents=True, exist_ok=True)
    model.export(args.out / "saved_model")
    np.savez(args.out / "normalization.npz", mean=mean, std=std)
    (args.out / "metadata.txt").write_text(
        "\n".join(
            [
                f"features={','.join(FEATURES)}",
                f"threshold={threshold:.8f}",
                f"training_rows={len(x)}",
            ]
        )
        + "\n"
    )
    print(f"exported={args.out} threshold={threshold:.6f}")


if __name__ == "__main__":
    main()
