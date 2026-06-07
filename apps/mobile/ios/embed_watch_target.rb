#!/usr/bin/env ruby
# Embeds HenzoWatch.app inside Runner.app so iOS auto-installs it on paired Watch.
# Run from ios/ directory:
#   ruby embed_watch_target.rb

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

PROJECT_PATH = File.expand_path('../Runner.xcodeproj', __FILE__)
project = Xcodeproj::Project.open(PROJECT_PATH)

runner = project.targets.find { |t| t.name == 'Runner' }
watch  = project.targets.find { |t| t.name == 'HenzoWatch' }

abort('❌  Runner target not found') unless runner
abort('❌  HenzoWatch target not found — run add_watch_target.rb first') unless watch

# ── 1. Target dependency Runner → HenzoWatch ──────────────────────────────────

already_depends = runner.dependencies.any? do |dep|
  dep.target&.name == 'HenzoWatch'
end

unless already_depends
  dep = runner.add_dependency(watch)
  puts "🔗  Added target dependency Runner → HenzoWatch"
end

# ── 2. Embed Watch Content build phase ────────────────────────────────────────

embed_phase = runner.build_phases.find do |p|
  p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) &&
    p.name == 'Embed Watch Content'
end

unless embed_phase
  embed_phase = runner.new_copy_files_build_phase('Embed Watch Content')
  embed_phase.dst_subfolder_spec = '16'   # Watch content
  embed_phase.dst_path = '$(CONTENTS_FOLDER_PATH)/Watch'
  puts "📦  Created 'Embed Watch Content' build phase"
end

# ── 3. Add HenzoWatch.app to the embed phase ──────────────────────────────────

watch_app_ref = project.products_group.files.find { |f| f.path == 'HenzoWatch.app' }
abort('❌  HenzoWatch.app product reference not found in project') unless watch_app_ref

already_added = embed_phase.files_references.any? { |f| f.uuid == watch_app_ref.uuid }

unless already_added
  build_file = embed_phase.add_file_reference(watch_app_ref)
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  puts "  + HenzoWatch.app → Embed Watch Content"
end

# ── 4. Save ───────────────────────────────────────────────────────────────────

project.save
puts "\n✅  Done! HenzoWatch.app will now be embedded in Runner.app"
puts "\nNext steps:"
puts "  1. flutter clean"
puts "  2. cd ios && pod install"
puts "  3. flutter run  (Watch app will install automatically on paired Watch)"
