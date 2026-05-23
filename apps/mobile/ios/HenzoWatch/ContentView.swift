import SwiftUI
import HealthKit

struct ContentView: View {
  @EnvironmentObject var workoutManager: WorkoutManager
  @EnvironmentObject var phoneConnectivity: PhoneConnectivityManager

  var body: some View {
    Group {
      if let workoutType = phoneConnectivity.pendingWorkoutType, !workoutManager.isActive {
        WorkoutPromptView(
          workoutType: workoutType,
          minutesBefore: phoneConnectivity.pendingMinutesBefore
        )
      } else if workoutManager.isActive {
        ActiveWorkoutView()
      } else {
        IdleView()
      }
    }
  }
}

// MARK: - Prompt: "Yoga in 10 min — Start?"

struct WorkoutPromptView: View {
  @EnvironmentObject var workoutManager: WorkoutManager
  @EnvironmentObject var phoneConnectivity: PhoneConnectivityManager

  let workoutType: String
  let minutesBefore: Int

  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: workoutIcon(for: workoutType))
        .font(.system(size: 32))
        .foregroundStyle(.red)

      Text(workoutType)
        .font(.headline)
        .multilineTextAlignment(.center)

      Text("через \(minutesBefore) мин")
        .font(.caption)
        .foregroundStyle(.secondary)

      Button {
        let activityType = workoutManager.activityType(from: workoutType)
        workoutManager.startWorkout(type: activityType, name: workoutType)
        phoneConnectivity.pendingWorkoutType = nil
        phoneConnectivity.confirmWorkoutStarted(workoutType: workoutType)
      } label: {
        Label("Начать", systemImage: "play.fill")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.borderedProminent)
      .tint(.red)

      Button("Отмена") {
        phoneConnectivity.pendingWorkoutType = nil
      }
      .buttonStyle(.bordered)
      .foregroundStyle(.secondary)
    }
    .padding()
  }

  private func workoutIcon(for type: String) -> String {
    switch type.lowercased() {
    case "yoga":     return "figure.yoga"
    case "running":  return "figure.run"
    case "cycling":  return "figure.outdoor.cycle"
    case "swimming": return "figure.pool.swim"
    case "walking":  return "figure.walk"
    default:         return "figure.highintensity.intervaltraining"
    }
  }
}

// MARK: - Active workout screen

struct ActiveWorkoutView: View {
  @EnvironmentObject var workoutManager: WorkoutManager

  var body: some View {
    VStack(spacing: 8) {
      Text(workoutManager.workoutTypeName)
        .font(.caption)
        .foregroundStyle(.secondary)

      Text(workoutManager.formattedElapsed)
        .font(.system(size: 36, weight: .bold, design: .rounded))
        .monospacedDigit()

      HStack(spacing: 16) {
        Label(
          String(format: "%.0f", workoutManager.heartRate),
          systemImage: "heart.fill"
        )
        .foregroundStyle(.red)

        Label(
          String(format: "%.0f kcal", workoutManager.activeCalories),
          systemImage: "flame.fill"
        )
        .foregroundStyle(.orange)
      }
      .font(.caption)

      Button(role: .destructive) {
        workoutManager.endWorkout()
      } label: {
        Label("Завершить", systemImage: "stop.fill")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.borderedProminent)
      .tint(.red)
      .padding(.top, 8)
    }
    .padding()
  }
}

// MARK: - Idle (no pending workout)

struct IdleView: View {
  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: "figure.run.circle")
        .font(.system(size: 40))
        .foregroundStyle(.secondary)
      Text("Henzo")
        .font(.headline)
      Text("Ожидание тренировки...")
        .font(.caption)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
  }
}
