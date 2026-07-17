# Memact Context

Context defines the categories and schema shapes for user data.

## What Context Does

<!-- Tracking SDK PR #98 -->
Context is a schema registry. It defines:
- The registered categories (such as fitness, shopping, travel, and productivity).
- The fields allowed inside each category (the words apps use when suggesting observations).
- Which fields are sensitive and require extra protection.
- What valid values look like (types, sizes, and formats).

## Development

To install and run tests:
```sh
npm install
npm test
```

## License

Context is open source under the Apache 2.0 license.