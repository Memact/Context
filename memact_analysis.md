# Memact Organization Analysis

## Vision and Values
Memact is focused on creating a standardized schema registry and protocol for user data. Its vision is to create a consistent language (schema) for different applications to understand and categorize user data, ensuring interoperability. Values involve passive registry management—meaning it defines the shape of data without directly validating consent, running checks, matching profiles, or storing user data itself. It champions open-source collaboration, licensing under Apache 2.0.

## Architecture and Structure
Memact consists of multiple repositories.
- **Memact/Context**: The main repository registered under SSoC. It acts as the central schema registry, defining categories (like fitness, shopping, travel, etc.), allowed fields, field sensitivity, and valid value shapes.
- **Other repositories**: Contributors are encouraged to work on other repositories in the Memact organization. Contributions are linked back to `Memact/Context` via "dummy PRs" for SSoC tracking.
- **Protocol**: Suggestions for new categories or fields are managed via RFC issues in the `Protocol` repository.

## Contribution Process (SSoC)
Contributors create issues and PRs across the organization. For SSoC, they create dummy PRs in `Memact/Context` that reference their actual work in other repositories.
