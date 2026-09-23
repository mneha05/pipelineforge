"""PyFlink streaming job: parse telemetry, window by pipeline, emit anomaly-ready features.

Run with:
  flink run -py atlas/streaming/flink_anomaly_job.py
"""

import json
from datetime import datetime

from pyflink.common import Time, Types, WatermarkStrategy
from pyflink.common.serialization import SimpleStringSchema
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.connectors.kafka import (
    KafkaOffsetsInitializer,
    KafkaRecordSerializationSchema,
    KafkaSink,
    KafkaSource,
)
from pyflink.datastream.window import TumblingEventTimeWindows


def parse(raw: str):
    event = json.loads(raw)
    ts = int(datetime.fromisoformat(event["ts"].replace("Z", "+00:00")).timestamp() * 1000)
    return (
        event["pipeline_id"],
        ts,
        float(event["rows_per_sec"]),
        float(event["p95_ms"]),
        float(event["error_rate"]),
        float(event["cpu_pct"]),
        float(event["backpressure_ms"]),
    )


def summarize(a, b):
    # tuple layout: pipeline_id, count, rows, p95, errors, cpu, backpressure
    return (
        a[0],
        a[1] + b[1],
        a[2] + b[2],
        max(a[3], b[3]),
        a[4] + b[4],
        a[5] + b[5],
        a[6] + b[6],
    )


def to_json(row):
    count = max(row[1], 1)
    return json.dumps(
        {
            "pipeline_id": row[0],
            "rows_per_sec": row[2] / count,
            "p95_ms": row[3],
            "error_rate": row[4] / count,
            "cpu_pct": row[5] / count,
            "backpressure_ms": row[6] / count,
            "window_events": count,
        },
        separators=(",", ":"),
    )


def main():
    env = StreamExecutionEnvironment.get_execution_environment()
    env.enable_checkpointing(10_000)

    source = (
        KafkaSource.builder()
        .set_bootstrap_servers("localhost:9092")
        .set_topics("pipeline-telemetry")
        .set_group_id("atlas-flink")
        .set_starting_offsets(KafkaOffsetsInitializer.latest())
        .set_value_only_deserializer(SimpleStringSchema())
        .build()
    )

    sink = (
        KafkaSink.builder()
        .set_bootstrap_servers("localhost:9092")
        .set_record_serializer(
            KafkaRecordSerializationSchema.builder()
            .set_topic("pipeline-features")
            .set_value_serialization_schema(SimpleStringSchema())
            .build()
        )
        .build()
    )

    watermark = WatermarkStrategy.for_bounded_out_of_orderness(Time.seconds(4))

    features = (
        env.from_source(source, watermark, "telemetry-kafka")
        .map(parse)
        .assign_timestamps_and_watermarks(
            watermark.with_timestamp_assigner(lambda row, _: row[1])
        )
        .map(lambda row: (row[0], 1, row[2], row[3], row[4], row[5], row[6]))
        .key_by(lambda row: row[0])
        .window(TumblingEventTimeWindows.of(Time.seconds(10)))
        .reduce(summarize)
        .map(to_json, output_type=Types.STRING())
    )

    features.sink_to(sink)
    env.execute("pipelineforge-atlas-features")


if __name__ == "__main__":
    main()
