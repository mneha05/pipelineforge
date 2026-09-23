ClusterDashboard = SC.Application.create({
  NAMESPACE: 'ClusterDashboard',
  VERSION: '1.0.0'
});

ClusterDashboard.statusController = SC.Object.create({
  ingestPerSec: 0,
  raftTerm: 0,
  statusText: 'waiting for telemetry'
});
