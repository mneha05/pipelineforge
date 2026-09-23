# PipelineForge Mobile — SwiftUI + Objective-C

A native iOS observer for the Atlas control plane.

The app is intentionally small but complete enough to close the **iOS toolchain/interoperability** gap:

- **SwiftUI** navigation, list rendering, pull-to-refresh and async tasks
- **URLSession + Codable** for the live Atlas JSON endpoint
- **Objective-C** `PFHeartbeatBridge` compiled into the same target
- a **bridging header** proving Swift ↔ Objective-C interoperability
- `project.yml` for reproducible Xcode project generation with XcodeGen

```text
SwiftUI View
    │
    ├── AtlasAPI.swift ── URLSession ──► /api/atlas/status
    │
    └── bridging header ──► PFHeartbeatBridge.m (Objective-C)
```

## Open in Xcode

```bash
brew install xcodegen
cd atlas/ios
xcodegen generate
open PipelineForgeMobile.xcodeproj
```

An actual iOS binary is not claimed from the Linux/Railway build environment; this source is meant to be built with Xcode on macOS.
