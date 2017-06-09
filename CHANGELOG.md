## [1.0.3] - 2017-06-09
### Fixed
- Issue #5, empty rules in webpack under PostCSS 6.

### Changed
- Replaced PostCSS 6 deprecated methods for v5 & v6 compatible alternatives.
- Switched to Yarn from NPM.
- Updated PostCSS dependency to include wide range of supported versions.

## [1.0.2] - 2016-11-15
### Fixed
- Registered plugin name is now correct.
- `?if media` parser tripping on CSS properties with a URL that contains query (?) parameters (this could be more robust).

### Added
- Additional tests for CSS properties with URL query params.
- Additional tests for malformed block `?if media` queries.

### Changed
- Malformed `?if media` errors have been replaced with warnings.
- Swapped error tests for warning tests.

## [1.0.1] - 2016-03-02
### Fixed
- Failing on comments within nested block queries, comments are now copied to @media rule.

## [1.0.0] - 2016-02-10
### Changed
- Plugin functionality and API stable, and passing tests.

### Added
- Inline `?if media` declarations.
- Nested block `?if media` rules.
- Completed adding tests.
