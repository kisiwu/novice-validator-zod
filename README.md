# @novice1/validator-zod

Zod validator to use with [@novice1/routing](https://www.npmjs.com/package/@novice1/routing).

It provides a middleware that can validate `req.params`, `req.body`, `req.query`, `req.headers`, `req.cookies` and `req.files` against a schema using [Zod 4](https://www.npmjs.com/package/zod).

## Installation

```bash
npm install @novice1/validator-zod
```

### Requirements

Zod4

```bash
npm install zod@next
```

## Usage

### Set validator

```ts
// router.ts

import routing from '@novice1/routing'
import { validatorZod } from '@novice1/validator-zod'

export default const router = routing()

router.setValidators(
  validatorZod(
    // parseAsync params
    { },
    // middleware in case validation fails
    function onerror(err, req, res, next) {
      res.status(400).json(err)
    }
    // name of the property containing the schema
    'schema'
  )
)
```

### Create schema 

```ts
// schema.ts

import { z } from 'zod/v4'
import { ValidatorZodSchema } from '@novice1/validator-zod'
import router from './router'

// schema for "req.body"
const bodySchema = z.object({                
  name: z.string()
})

// type for "req.body"
export type BodyItem = z.infer<typeof bodySchema>

export const routeSchema: ValidatorZodSchema = z.object({
    body: bodySchema
})

// or
/*
export const routeSchema: ValidatorZodSchema = {
    body: bodySchema
}
*/

// or
/*
export const routeSchema: ValidatorZodSchema = {
    body: {                
        name: z.string()
    }
}
*/
```

### Create route

```ts
import routing from '@novice1/routing'
import express from 'express'
import router from './router'
import { BodyItem, routeSchema } from './schema'

router.post(
  {
    name: 'Post item',
    path: '/items',

    parameters: {
        // the schema to validate
        schema: routeSchema
    },

    // body parser
    preValidators: express.json()
  },
  function (req: routing.Request<unknown, { name: string }, BodyItem>, res) {
    res.json({ name: req.body.name })
  }
)
```

### Overrides

Override the validator's options and the error handler for a route.

```ts
import routing from '@novice1/routing'
import { ValidatorZodOptions } from '@novice1/validator-zod'
import router from './router'

const onerror: routing.ErrorRequestHandler = (err, req, res) => {
  res.status(400).json(err)
}

const validatorZodOptions: ValidatorZodOptions = { }

router.get(
  {
    path: '/override',
    parameters: {
      // overrides
      onerror, 
      validatorZodOptions

    },
  },
  function (req, res) {
    // ...
  }
)
```

## References

- [Zod 4](https://v4.zod.dev/v4)
- [@novice1/routing](https://www.npmjs.com/package/@novice1/routing)