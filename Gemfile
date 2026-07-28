source "https://rubygems.org"

# Run Jekyll through Bundler so the versions below are the ones that execute:
#
#     bundle exec jekyll serve
#
gem "jekyll", "~> 4.4"

# No theme gem: _layouts, _includes and _sass in this repo cover the whole
# site, so there is nothing left for one to supply.

# kramdown 2.x moved the GitHub-flavoured parser into a separate gem.
# Required by the `kramdown: input: GFM` setting in _config.yml.
gem "kramdown-parser-gfm", "~> 1.1"

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.17"
end

# Windows and JRuby ship no zoneinfo database.
gem "tzinfo-data", platforms: [:windows, :jruby]

# Dropped from the stdlib in Ruby 3.0; `jekyll serve` still wants it.
gem "webrick", "~> 1.9"
