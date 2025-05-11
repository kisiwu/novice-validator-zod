# @novice1/validator-zod

Zod validator to use with [@novice1/routing](https://www.npmjs.com/package/@novice1/routing).

It provides a middleware that can validate `req.params`, `req.body`, `req.query`, `req.headers`, `req.cookies` and `req.files` against a schema using [Zod 4](https://www.npmjs.com/package/zod).

## Installation

```bash
npm install @novice1/validator-zod
```

## Usage

### Set validator

```ts
// router.ts

import routing from '@novice1/routing'
import { validatorZod } from '@novice1/validator-zod'

export default const router = routing()

router.setValidators(
  validatorTypebox(
    // compile options
    { references: [] },
    // middleware in case validation fails
    function onerror(err, req, res, next) {
      res.status(400).json(err)
    }
    // name of the property containing the schema
    'schema'
  )
)
```