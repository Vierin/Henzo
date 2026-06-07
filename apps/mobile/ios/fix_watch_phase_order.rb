#!/usr/bin/env ruby
# Moves "Embed Watch Content" phase to right after "Embed Frameworks"
# to break the build cycle caused by script phases running after the copy.
# Run from ios/ directory:
#   ruby fix_watch_phase_order.rb

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
abort('❌  Runner target not found') unless runner

phases = runner.build_phases

puts "Current phase order:"
phases.each_with_index { |p, i| puts "  #{i}: #{p.display_name}" }

embed_watch = phases.find do |p|
  p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) &&
    p.display_name == 'Embed Watch Content'
end
abort('❌  "Embed Watch Content" phase not found') unless embed_watch

embed_frameworks = phases.find do |p|
  p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) &&
    p.display_name == 'Embed Frameworks'
end
abort('❌  "Embed Frameworks" phase not found') unless embed_frameworks

current_idx = phases.index(embed_watch)
target_idx  = phases.index(embed_frameworks)

if current_idx == target_idx + 1
  puts "\n✅  Phase already in correct position — nothing to do."
  exit 0
end

# Reorder: remove from current position, insert after Embed Frameworks
phases.delete_at(current_idx)
insert_at = phases.index(embed_frameworks) + 1
phases.insert(insert_at, embed_watch)

puts "\nNew phase order:"
phases.each_with_index { |p, i| puts "  #{i}: #{p.display_name}" }

project.save
puts "\n✅  Done! 'Embed Watch Content' moved to position #{insert_at} (after Embed Frameworks)"
