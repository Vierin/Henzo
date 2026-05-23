import SwiftUI

@main
struct HenzoWatchApp: App {
  @StateObject private var workoutManager = WorkoutManager()
  @StateObject private var phoneConnectivity = PhoneConnectivityManager()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(workoutManager)
        .environmentObject(phoneConnectivity)
        .onAppear {
          phoneConnectivity.workoutManager = workoutManager
        }
    }
  }
}
