import Foundation

struct AtlasSnapshot: Codable {
    let generatedAt: String
    let telemetry: Telemetry

    struct Telemetry: Codable {
        let ingestPerSec: Int
        let p95Ms: Int
        let activeWorkers: Int
        let raftTerm: Int
        let anomalyScore: Double
    }
}

@MainActor
final class AtlasAPI: ObservableObject {
    @Published var snapshot: AtlasSnapshot?
    @Published var errorMessage: String?

    private let endpoint: URL

    init(endpoint: URL = URL(string: "https://pipelineforge-rosy.vercel.app/api/atlas/status")!) {
        self.endpoint = endpoint
    }

    func refresh() async {
        do {
            let (data, response) = try await URLSession.shared.data(from: endpoint)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            snapshot = try JSONDecoder().decode(AtlasSnapshot.self, from: data)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
