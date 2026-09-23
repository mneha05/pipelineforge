import SwiftUI

struct ContentView: View {
    @StateObject private var api = AtlasAPI()

    var body: some View {
        NavigationStack {
            List {
                Section("Native bridge") {
                    LabeledContent("Objective-C signature", value: PFHeartbeatBridge.legacyNodeSignature())
                }

                if let t = api.snapshot?.telemetry {
                    Section("Atlas telemetry") {
                        LabeledContent("Ingest", value: "\(t.ingestPerSec)/s")
                        LabeledContent("P95", value: "\(t.p95Ms) ms")
                        LabeledContent("Workers", value: "\(t.activeWorkers)")
                        LabeledContent("Raft term", value: "\(t.raftTerm)")
                        LabeledContent("Anomaly", value: t.anomalyScore.formatted(.number.precision(.fractionLength(2))))
                    }
                }

                if let error = api.errorMessage {
                    Text(error).foregroundStyle(.red)
                }
            }
            .navigationTitle("PipelineForge Atlas")
            .refreshable { await api.refresh() }
            .task { await api.refresh() }
        }
    }
}
