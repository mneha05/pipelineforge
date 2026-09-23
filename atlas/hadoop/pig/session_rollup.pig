-- Legacy Pig batch path retained for organizations that still operate Hadoop-era jobs.
events = LOAD '$INPUT'
  USING PigStorage(',')
  AS (
    pipeline_id:chararray,
    event_ts:chararray,
    rows_per_sec:double,
    p95_ms:double,
    error_rate:double,
    cpu_pct:double,
    backpressure_ms:double
  );

healthy = FILTER events BY error_rate < 0.05;
by_pipeline = GROUP healthy BY pipeline_id;

rollup = FOREACH by_pipeline GENERATE
  group AS pipeline_id,
  COUNT(healthy) AS samples,
  AVG(healthy.rows_per_sec) AS avg_rows_per_sec,
  AVG(healthy.p95_ms) AS avg_p95_ms,
  MAX(healthy.backpressure_ms) AS max_backpressure_ms;

STORE rollup INTO '$OUTPUT' USING PigStorage(',');
