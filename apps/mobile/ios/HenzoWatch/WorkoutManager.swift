import Foundation
import HealthKit
import Combine

final class WorkoutManager: NSObject, ObservableObject {

  // MARK: - Published state

  @Published var isActive = false
  @Published var elapsedSeconds: Int = 0
  @Published var heartRate: Double = 0
  @Published var activeCalories: Double = 0
  @Published var workoutTypeName: String = ""

  // MARK: - Private

  private let healthStore = HKHealthStore()
  private var workoutSession: HKWorkoutSession?
  private var workoutBuilder: HKLiveWorkoutBuilder?
  private var timer: AnyCancellable?

  // MARK: - Request authorization

  func requestAuthorization() async {
    let types: Set<HKSampleType> = [
      HKObjectType.workoutType(),
      HKQuantityType(.heartRate),
      HKQuantityType(.activeEnergyBurned),
    ]
    try? await healthStore.requestAuthorization(toShare: types, read: types)
  }

  // MARK: - Start

  func startWorkout(type: HKWorkoutActivityType, name: String) {
    workoutTypeName = name
    Task {
      await requestAuthorization()
      let config = HKWorkoutConfiguration()
      config.activityType = type
      config.locationType = .indoor

      do {
        let session = try HKWorkoutSession(
          healthStore: healthStore,
          configuration: config
        )
        let builder = session.associatedWorkoutBuilder()
        builder.dataSource = HKLiveWorkoutDataSource(
          healthStore: healthStore,
          workoutConfiguration: config
        )

        session.delegate = self
        builder.delegate = self

        workoutSession = session
        workoutBuilder = builder

        let startDate = Date()
        session.startActivity(with: startDate)
        try await builder.beginCollection(at: startDate)

        await MainActor.run {
          self.isActive = true
          self.elapsedSeconds = 0
          self.startTimer()
        }
      } catch {
        print("[WorkoutManager] start error: \(error)")
      }
    }
  }

  // MARK: - End

  func endWorkout() {
    workoutSession?.end()
    stopTimer()
  }

  // MARK: - Timer

  private func startTimer() {
    timer = Timer.publish(every: 1, on: .main, in: .default)
      .autoconnect()
      .sink { [weak self] _ in
        self?.elapsedSeconds += 1
      }
  }

  private func stopTimer() {
    timer?.cancel()
    timer = nil
  }

  // MARK: - Helpers

  func activityType(from name: String) -> HKWorkoutActivityType {
    switch name.lowercased() {
    case "yoga":       return .yoga
    case "running":    return .running
    case "cycling":    return .cycling
    case "swimming":   return .swimming
    case "strength", "weights": return .traditionalStrengthTraining
    case "hiit":       return .highIntensityIntervalTraining
    case "pilates":    return .pilates
    case "dance":      return .dance
    case "walking":    return .walking
    default:           return .other
    }
  }

  var formattedElapsed: String {
    let h = elapsedSeconds / 3600
    let m = (elapsedSeconds % 3600) / 60
    let s = elapsedSeconds % 60
    if h > 0 {
      return String(format: "%d:%02d:%02d", h, m, s)
    }
    return String(format: "%02d:%02d", m, s)
  }
}

// MARK: - HKWorkoutSessionDelegate

extension WorkoutManager: HKWorkoutSessionDelegate {
  func workoutSession(
    _ workoutSession: HKWorkoutSession,
    didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState,
    date: Date
  ) {
    DispatchQueue.main.async { [weak self] in
      self?.isActive = (toState == .running)
    }
    if toState == .ended {
      Task { try? await workoutBuilder?.endCollection(at: date) }
    }
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    print("[WorkoutManager] session error: \(error)")
  }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  func workoutBuilder(
    _ workoutBuilder: HKLiveWorkoutBuilder,
    didCollectDataOf collectedTypes: Set<HKSampleType>
  ) {
    for type in collectedTypes {
      guard let quantityType = type as? HKQuantityType else { continue }
      let stats = workoutBuilder.statistics(for: quantityType)
      DispatchQueue.main.async { [weak self] in
        switch quantityType {
        case HKQuantityType(.heartRate):
          let bpm = stats?.mostRecentQuantity()?.doubleValue(for: .count().unitDivided(by: .minute())) ?? 0
          self?.heartRate = bpm
        case HKQuantityType(.activeEnergyBurned):
          let kcal = stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
          self?.activeCalories = kcal
        default:
          break
        }
      }
    }
  }
}
