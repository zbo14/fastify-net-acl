# fastify-net-acl

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

Fastify plugin that restricts access according to IP address/subnet allow and block lists.

## Install

`npm i fastify-net-acl`

## Usage

### Blocking

**Block IP address:**

```js
fastify.register(require('fastify-net-acl'), {
  blockList: '1.2.3.4'
})
```

**Block multiple IP addresses:**

```js
fastify.register(require('fastify-net-acl'), {
  blockList: [
    '1.2.3.4',
    '2.3.4.5'
  ]
})
```

**Block subnet:**

```js
fastify.register(require('fastify-net-acl'), {
  blockList: '1.2.3.4/24'
})
```

**Block a bunch of stuff:**

```js
fastify.register(require('fastify-net-acl'), {
  blockList: [
    '::1',
    '4.3.2.1',
    '4.2.3.4',
    '1.2.3.4/24',
    '2.3.4.5/16'
  ]
})
```

### Allowing

**Only allow 1 IP address:**

```js
fastify.register(require('fastify-net-acl'), {
  allowList: '1.2.3.4'
})
```

**Only allow 1 subnet:**

```js
fastify.register(require('fastify-net-acl'), {
  allowList: '1.2.3.4/24'
})
```

**Only allow specified IP addresses and subnets:**

```js
fastify.register(require('fastify-net-acl'), {
  allowList: [
    '::1',
    '2.3.4.5',
    '1.2.3.4/24'
  ]
})
```

### Route specific rules

**Note:** you must `await` the plugin registration so the decorator function is accessible for the route definition.

```js
await fastify.register(require('fastify-net-acl'), {
  blockList: '1.2.3.4/24',
  global: false
})

const onRequest = fastify.createNetAclRequestHandler()

fastify.get('/has-blocking', { onRequest }, (req, reply) => {})
fastify.get('/no-blocking', (req, reply) => {})
```

**Use multiple allow/block lists:**

```js
await fastify.register(require('fastify-net-acl'), {
  allowList: {
    foo: '1.2.3.4/24'
  },

  blockList: {
    bar: '2.3.4.5/24'
  },

  global: false
})

{
  const onRequest = fastify.createNetAclRequestHandler('allow:foo')
  fastify.get('/foo', { onRequest }, (req, reply) => {})
}

{
  const onRequest = fastify.createNetAclRequestHandler('block:bar')
  fastify.get('/bar', { onRequest }, (req, reply) => {})
}

fastify.get('/no-blocking', (req, reply) => {})
```

## Reference

This plugin decorates the `fastify` instance with `allowList` and/or `blockList`, depending on which properties are specified in `options`. Both are instances of [`net.BlockList`](https://nodejs.org/docs/latest-v16.x/api/net.html#class-netblocklist) and determine which IP addresses/subnets are allowed or blocked, respectively.

**Note:** `fastify-net-acl` requires Node >= 15.0.0 since `net.Blocklist` was introduced in 15.0.0.

The `options` object has the following properties. Either `allowList` xor `blockList` must be specified if `global` is `true`. Both may be specified if `global` is `false` since you may want to use different allow/block lists on different routes.

* `allowList` is an array of IPv4/IPv6 addresses and/or subnets in CIDR format indicating which IPs should be allowed
* `blockList` is an array of IPv4/IPv6 addresses and/or subnets in CIDR format indicating which IPs should be blocked
* `errorCode` is the HTTP status code when an IP is blocked/not allowed (default: `403`)
* `errorMessage` is the status message when an IP is blocked/not allowed (default: generic status message for `errorCode`)
* `global` is a boolean indicating whether the ACL applies globally, i.e. for all routes (default: `true`)

## Test

`npm test`

## Lint

`npm run lint` or `npm run lint:fix`

## License

Licensed under [MIT](./LICENSE).
