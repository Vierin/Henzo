import Foundation
import WatchConnectivity
import Combine

final class PhoneConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {

  @Published var pendingWorkoutType: String? = nil
  @Published var pendingMinutesBefore: Int = 10

  weak var workoutManager: WorkoutManager?

  override init() {
    super.init()
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }

  // MARK: - WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {}

  // Real-time message from phone (watch is awake)
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handleWorkoutMessage(message)
  }

  // Queued delivery (watch was not reachable when phone sent)
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    handleWorkoutMessage(userInfo)
  }

  private func handleWorkoutMessage(_ message: [String: Any]) {
    guard message["action"] as? String == "startWorkout",
          let workoutType = message["workoutType"] as? String else { return }

    let minutes = message["minutesBefore"] as? Int ?? 10
    DispatchQueue.main.async { [weak self] in
      self?.pendingWorkoutType = workoutType
      self?.pendingMinutesBefore = minutes
    }
  }

  func confirmWorkoutStarted(workoutType: String) {
    guard WCSession.default.isReachable else { return }
    WCSession.default.sendMessage(
      ["action": "workoutStarted", "workoutType": workoutType],
      replyHandler: nil,
      errorHandler: nil
    )
  }
}
