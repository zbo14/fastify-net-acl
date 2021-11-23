'use strict'

const Fastify = require('fastify')
const t = require('tap')
const fastifyNetAcl = require('.')

t.beforeEach(t => {
  t.context.fastify = new Fastify()
})

t.afterEach(t => {
  t.context.fastify.close()
})

t.test('throws if options not an object literal', async t => {
  try {
    await t.context.fastify.register(fastifyNetAcl, Object.create(null))
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected options to be an object literal')
  }
})

t.test('throws if no list provided', async t => {
  try {
    await t.context.fastify.register(fastifyNetAcl, { errorCode: 1.1 })
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected options.errorCode to be a positive integer')
  }
})

t.test('throws if empty list provided', async t => {
  try {
    await t.context.fastify.register(fastifyNetAcl, { allowList: [] })
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Must specify options.allowList or options.blockList')
  }
})

t.test('throws if no list provided', async t => {
  try {
    await t.context.fastify.register(fastifyNetAcl, {})
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Must specify options.allowList or options.blockList')
  }
})

t.test('throws if errorMessage not a string', async t => {
  try {
    await t.context.fastify.register(fastifyNetAcl, { errorMessage: Symbol(1) })
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected options.errorMessage to be a string')
  }
})

t.test('throws if invalid IP', async t => {
  try {
    await t.context.fastify.register(fastifyNetAcl, {
      allowList: ['1.2.3.']
    })

    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Invalid IP address: 1.2.3.')
  }
})

t.test('rejects IPv4 not on allow list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['1.2.3.4']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 403)
  t.equal((await resp.json()).message, 'Forbidden')
  t.end()
})

t.test('rejects IPv6 not on allow list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['::1']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '::2'
  })

  t.equal(resp.statusCode, 403)
  t.equal((await resp.json()).message, 'Forbidden')
  t.end()
})

t.test('rejects IPv4 on block list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    blockList: ['127.0.0.1']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IPv6 on block list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    blockList: ['::1']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '::1'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IPv4 in subnet block list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    blockList: ['127.0.0.0/16']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IPv6 in subnet block list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    blockList: ['2001:db8:abcd:0012::0/64']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0000:0000:0000:1122'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('accepts IPv4 on allow list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['127.0.0.1']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('accepts IPv6 on allow list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['2001:0DB8:ABCD:0012:0000:0000:0000:1122']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0000:0000:0000:1122'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('accepts IPv4 in subnet on allow list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['127.0.0.0/24']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('accepts IPv6 in subnet on allow list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['2001:db8:abcd:0012::0/112']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0000:0000:0000:0345'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('rejects IPv4 not in subnet on allow list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['128.0.0.0/24']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IPv6 not in subnet on allow list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['2001:db8:abcd:0012::0/112']
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0000:0000:0001:0000'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IP with custom error code and message', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['128.0.0.0/24'],
    errorCode: 401,
    errorMessage: 'what are you doing?'
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 401)
  t.equal((await resp.json()).message, 'what are you doing?')
  t.end()
})

t.test('throws if both allowList and blockList specified', async t => {
  try {
    await t.context.fastify.register(fastifyNetAcl, {
      allowList: ['127.0.0.1'],
      blockList: ['127.0.0.2']
    })
  } catch ({ message }) {
    t.equal(message, 'Cannot specify options.allowList and options.blockList')
  }
})

t.test('accepts IPv4 not on block list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    blockList: '127.0.0.2'
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '127.0.0.3'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('accepts IPv6 not on block list', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    blockList: '2001:db8:abcd:0012::0/80'
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0002:FFFF:FFFF:FFFF'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('blocks IPv4 on specific route', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['1.2.3.4'],
    global: false
  })

  const onRequest = t.context.fastify.checkRequest

  t.context.fastify.get('/foo', { onRequest }, (req, reply) => {
    reply.send({})
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/foo'
  })

  t.equal(resp.statusCode, 403)
  t.equal((await resp.json()).message, 'Forbidden')
  t.end()
})

t.test('doesn\'t block IPv4 on other route', async t => {
  await t.context.fastify.register(fastifyNetAcl, {
    allowList: ['1.2.3.4'],
    global: false
  })

  const onRequest = t.context.fastify.checkRequest

  t.context.fastify.get('/foo', { onRequest }, (req, reply) => {
    reply.send({})
  })

  t.context.fastify.get('/bar', (req, reply) => {
    reply.send({})
  })

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/bar'
  })

  t.equal(resp.statusCode, 200)
  t.same(await resp.json(), {})
  t.end()
})
