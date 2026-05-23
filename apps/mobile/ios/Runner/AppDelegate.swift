import Flutter
import UIKit
import FirebaseCore
import WatchConnectivity

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate, WCSessionDelegate {

  // MARK: - Properties

  private var watchChannel: FlutterMethodChannel?

  // MARK: - App lifecycle

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()
    setupWatchConnectivity()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    guard let controller = window?.rootViewController as? FlutterViewController else { return }
    setupWatchChannel(messenger: controller.binaryMessenger)
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

    guard session.isWatchAppInstalled else {
      result("not_installed")
      return
    }

    guard session.isReachable else {
      // Watch not reachable right now — use transferUserInfo (queued delivery)
      session.transferUserInfo([
        "action": "startWorkout",
        "workoutType": workoutType,
        "minutesBefore": minutesBefore,
      ])
      result("queued")
      return
    }

    // Watch is reachable — send immediately
    session.sendMessage(
      [
        "action": "startWorkout",
        "workoutType": workoutType,
        "minutesBefore": minutesBefore,
      ],
      replyHandler: { _ in result("sent") },
      errorHandler: { error in
        result(FlutterError(code: "SEND_FAILED", message: error.localizedDescription, details: nil))
      }
    )
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
