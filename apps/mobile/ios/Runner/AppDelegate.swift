import Flutter
import UIKit
import FirebaseCore
import WatchConnectivity

@main
@objc class AppDelegate: FlutterAppDelegate, WCSessionDelegate {

  // MARK: - Properties

  private var watchChannel: FlutterMethodChannel?

  // MARK: - App lifecycle

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()
    setupWatchConnectivity()
    GeneratedPluginRegistrant.register(with: self)
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    if let controller = window?.rootViewController as? FlutterViewController {
      setupWatchChannel(messenger: controller.binaryMessenger)
    }
    return result
  }

  // MARK: - Watch Connectivity setup

  private func setupWatchConnectivity() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  private func setupWatchChannel(messenger: FlutterBinaryMessenger) {
    watchChannel = FlutterMethodChannel(
      name: "henzo/watch",
      binaryMessenger: messenger
    )
    watchChannel?.setMethodCallHandler { [weak self] call, result in
      guard let self else { return }
      switch call.method {
      case "sendWorkoutToWatch":
        self.handleSendWorkout(call: call, result: result)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  // MARK: - Workout message to watch

  private func handleSendWorkout(call: FlutterMethodCall, result: @escaping FlutterResult) {
    guard let args = call.arguments as? [String: Any],
          let workoutType = args["workoutType"] as? String else {
      result(FlutterError(code: "INVALID_ARGS", message: "workoutType required", details: nil))
      return
    }

    let minutesBefore = args["minutesBefore"] as? Int ?? 10
    let session = WCSession.default

    guard session.activationState == .activated else {
      result("not_activated")
      return
    }

    let payload: [String: Any] = [
      "action": "startWorkout",
      "workoutType": workoutType,
      "minutesBefore": minutesBefore,
    ]

    if session.isReachable {
      // Watch app is running in foreground — send immediately
      session.sendMessage(
        payload,
        replyHandler: { _ in result("sent") },
        errorHandler: { _ in
          // sendMessage failed — fall back to transferUserInfo
          session.transferUserInfo(payload)
          result("queued")
        }
      )
    } else {
      // Watch not reachable (screen off / app not running) — queue for delivery
      // transferUserInfo works even if the watch app is not yet installed;
      // the message will be delivered once the app is installed and launched.
      session.transferUserInfo(payload)
      result("sent")
    }
  }

  // MARK: - WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {}

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    WCSession.default.activate()
  }

  // Receive "workoutStarted" confirmation from watch
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    guard message["action"] as? String == "workoutStarted" else { return }
    DispatchQueue.main.async { [weak self] in
      self?.watchChannel?.invokeMethod("onWorkoutStarted", arguments: message)
    }
  }
}
