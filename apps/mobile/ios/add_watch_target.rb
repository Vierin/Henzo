#!/usr/bin/env ruby
# Adds a watchOS companion app target "HenzoWatch" to Runner.xcodeproj.
# Run from ios/ directory:
#   ruby add_watch_target.rb

# Load xcodeproj from CocoaPods gems if not available system-wide
unless defined?(Xcodeproj)
  gems_root = '/opt/homebrew/Cellar/cocoapods/1.16.2_2/libexec/gems'
  %w[
    xcodeproj-1.27.0 claide-1.1.0 colored2-3.1.2
    atomos-0.1.3 nanaimo-0.4.0 CFPropertyList-3.0.8
  ].each do |gem_dir|
    $LOAD_PATH.unshift File.join(gems_root, gem_dir, 'lib')
  end
end

require 'xcodeproj'
require 'fileutils'

PROJECT_PATH     = File.expand_path('../Runner.xcodeproj', __FILE__)
WATCH_DIR        = File.expand_path('../HenzoWatch', __FILE__)
WATCH_TARGET     = 'HenzoWatch'
IOS_BUNDLE_ID    = 'com.henzo.vn.Henzo'
WATCH_BUNDLE_ID  = "#{IOS_BUNDLE_ID}.watchkitapp"
TEAM_ID          = 'PR2HAF6344'
WATCHOS_MIN      = '7.0'
SWIFT_VERSION    = '5.0'

WATCH_SOURCES = %w[
  HenzoWatchApp.swift
  ContentView.swift
  WorkoutManager.swift
  PhoneConnectivityManager.swift
].freeze

# ── Helpers ────────────────────────────────────────────────────────────────────

def abort_if(cond, msg)
  abort("❌  #{msg}") if cond
end

abort_if(!File.exist?(PROJECT_PATH), "Runner.xcodeproj not found at #{PROJECT_PATH}")
abort_if(!File.exist?(WATCH_DIR),    "HenzoWatch/ source folder not found at #{WATCH_DIR}")
WATCH_SOURCES.each do |f|
  abort_if(!File.exist?(File.join(WATCH_DIR, f)), "Missing source file: #{f}")
end

project = Xcodeproj::Project.open(PROJECT_PATH)

if project.targets.any? { |t| t.name == WATCH_TARGET }
  puts "✅  Target '#{WATCH_TARGET}' already exists — nothing to do."
  exit 0
end

puts "📦  Opening #{PROJECT_PATH}"

# ── 1. Create watchOS target ───────────────────────────────────────────────────

watch_target = project.new_target(
  :watch2_app,            # watchOS 2+ native app
  WATCH_TARGET,
  :watchos,
  WATCHOS_MIN,
)
puts "🎯  Created target: #{WATCH_TARGET}"

# ── 2. Build configurations ────────────────────────────────────────────────────

watch_target.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_NAME']                   = WATCH_TARGET
  s['PRODUCT_BUNDLE_IDENTIFIER']      = WATCH_BUNDLE_ID
  s['SDKROOT']                        = 'watchos'
  s['TARGETED_DEVICE_FAMILY']         = '4'
  s['WATCHOS_DEPLOYMENT_TARGET']      = WATCHOS_MIN
  s['SWIFT_VERSION']                  = SWIFT_VERSION
  s['DEVELOPMENT_TEAM']               = TEAM_ID
  s['CODE_SIGN_STYLE']                = 'Automatic'
  s['CODE_SIGN_ENTITLEMENTS']         = "HenzoWatch/HenzoWatch.entitlements"
  s['LD_RUNPATH_SEARCH_PATHS']        = ['$(inherited)', '@executable_path/Frameworks']
  s['INFOPLIST_FILE']                 = 'HenzoWatch/Info.plist'
  s['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
  s['ENABLE_BITCODE']                 = 'NO'
  # WatchKit companion link
  s['WK_COMPANION_APP_BUNDLE_IDENTIFIER'] = IOS_BUNDLE_ID
  s['WK_APP_BUNDLE_IDENTIFIER']       = WATCH_BUNDLE_ID
end

# ── 3. Add source files to project group ──────────────────────────────────────

main_group   = project.main_group
watch_group  = main_group['HenzoWatch'] ||
               main_group.new_group('HenzoWatch', 'HenzoWatch')

source_phase = watch_target.source_build_phase

WATCH_SOURCES.each do |filename|
  file_ref = watch_group.new_file(filename)
  file_ref.set_last_known_file_type('sourcecode.swift')
  source_phase.add_file_reference(file_ref)
  puts "  + #{filename}"
end

# Entitlements (not compiled — just referenced in build settings)
ent_ref = watch_group.new_file('HenzoWatch.entitlements')
ent_ref.set_last_known_file_type('text.plist.entitlements')
puts "  + HenzoWatch.entitlements"

# ── 4. Frameworks: HealthKit + WatchConnectivity ───────────────────────────────

frameworks_group = project.frameworks_group
fw_phase         = watch_target.frameworks_build_phase

['HealthKit.framework', 'WatchConnectivity.framework'].each do |fw|
  ref = frameworks_group.new_file(fw)
  ref.path         = fw
  ref.source_tree  = 'SDKROOT'
  ref.last_known_file_type = 'wrapper.framework'
  fw_phase.add_file_reference(ref)
  puts "  + #{fw}"
end

# ── 5. Companion relationship on Runner target ────────────────────────────────

runner = project.targets.find { |t| t.name == 'Runner' }
if runner
  runner.build_configurations.each do |config|
    config.build_settings['WK_COMPANION_APP_BUNDLE_IDENTIFIER'] ||= IOS_BUNDLE_ID
  end
  puts "🔗  Linked Runner ↔ #{WATCH_TARGET}"
end

# ── 6. Generate Info.plist if missing ─────────────────────────────────────────

info_plist_path = File.join(WATCH_DIR, 'Info.plist')
unless File.exist?(info_plist_path)
  File.write(info_plist_path, <<~XML)
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
      <key>CFBundleDevelopmentRegion</key>
      <string>$(DEVELOPMENT_LANGUAGE)</string>
      <key>CFBundleDisplayName</key>
      <string>Henzo</string>
      <key>CFBundleExecutable</key>
      <string>$(EXECUTABLE_NAME)</string>
      <key>CFBundleIdentifier</key>
      <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
      <key>CFBundleInfoDictionaryVersion</key>
      <string>6.0</string>
      <key>CFBundleName</key>
      <string>$(PRODUCT_NAME)</string>
      <key>CFBundlePackageType</key>
      <string>APPL</string>
      <key>CFBundleShortVersionString</key>
      <string>$(FLUTTER_BUILD_NAME)</string>
      <key>CFBundleVersion</key>
      <string>$(FLUTTER_BUILD_NUMBER)</string>
      <key>UISupportedInterfaceOrientations</key>
      <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
      </array>
      <key>WKApplication</key>
      <true/>
      <key>WKCompanionAppBundleIdentifier</key>
      <string>#{IOS_BUNDLE_ID}</string>
    </dict>
    </plist>
  XML
  puts "📄  Generated HenzoWatch/Info.plist"
end

# ── 7. Save ───────────────────────────────────────────────────────────────────

project.save
puts "\n✅  Done! Target '#{WATCH_TARGET}' added to Runner.xcodeproj"
puts "\nNext steps:"
puts "  1. Open Runner.xcworkspace in Xcode"
puts "  2. Select the HenzoWatch scheme and build once to verify"
puts "  3. Run: cd ios && pod install --repo-update"
