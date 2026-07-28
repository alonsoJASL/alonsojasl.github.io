# alonsojasl.github.io

Personal site — CV, research interests, publications and code. Built with
[Jekyll](https://jekyllrb.com/), published through GitHub Pages.

## Running locally

The site builds against Ruby 3.3 from Homebrew. Homebrew keeps that formula
keg-only, so it is deliberately **not** on the default `PATH` — macOS still
resolves `ruby` to its own 2.6, which cannot build this site.

Either put it on the path for the session:

```zsh
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
bundle install
bundle exec jekyll serve
```

or call the Homebrew binaries by their full path, which needs no setup:

```zsh
/opt/homebrew/opt/ruby@3.3/bin/bundle install
/opt/homebrew/opt/ruby@3.3/bin/bundle exec jekyll serve
```

Then open <http://localhost:4000>.

The `bundle exec` prefix is what pins Jekyll and its dependencies to the
versions in `Gemfile.lock`; running `jekyll` bare picks up whatever happens to
be installed globally.

## Dependencies

`Gemfile.lock` is generated output. Do not hand-edit it — including to silence
a security alert. Change `Gemfile`, run `bundle install` (or
`bundle update <gem>` for a single dependency), and commit the regenerated
lockfile alongside it.
