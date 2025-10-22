# Sonarr Changelog

## [Comprehensive Rewrite] - 2025-10-22

### Major Features

- **Multi-Instance Support**: Manage multiple Sonarr servers simultaneously with easy instance switching
- **Series Management**: Full CRUD operations for series with add/remove functionality
- **Enhanced Views**: 7 specialized commands for complete TV collection management

### New Commands

- **Search Series**: Search and add TV series with full configuration options (quality profiles, language profiles, root folders)
- **Upcoming Shows**: Enhanced calendar view with monitoring status filters (all/monitored/unmonitored)
- **Series Library**: Grid-based library browser with series management and removal options
- **Download Queue**: Real-time download monitoring with auto-refresh every 5 seconds
- **Missing Episodes**: Track and search for missing or wanted episodes
- **Unmonitored Series**: View series that aren't being monitored
- **Instance Status**: Monitor connection health across multiple instances
- **System Status**: Check Sonarr system health

### Series Removal

- Remove series from library (keep files on disk)
- Delete series and all associated files
- Confirmation dialogs with clear warnings for destructive actions

### Technical Improvements

- Complete rewrite with modern React patterns and TypeScript
- Unified type system replacing fragmented type definitions
- Comprehensive Sonarr API v3 integration through custom hooks
- Instance manager with automatic preference loading
- Utility functions for formatting dates, file sizes, and display data
- Proper error handling with user-friendly toast notifications
- Auto-refresh for active downloads

### Breaking Changes

- Removed old basic calendar view (`index.tsx`)
- Replaced with feature-rich upcoming shows component
- Updated command structure in package.json
- Modernized type definitions

## [Update] - 2024-04-26

- Updated dependencies
- Changed url to v3 of the api

## [1.1] - 2023-01-10

- Added support for HTTPS configuration
- Added support for URL Base configuration

## [Initial Version] - 2022-07-19
