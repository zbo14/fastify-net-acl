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
  t.context.fastify.register(fastifyNetAcl, Object.create(null))

  try {
    await t.context.fastify.ready()
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected options to be an object literal')
  }
})

t.test('throws if no list provided', async t => {
  t.context.fastify.register(fastifyNetAcl, { errorCode: 1.1 })

  try {
    await t.context.fastify.ready()
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected options.errorCode to be a positive integer')
  }
})

t.test('throws if empty list provided', async t => {
  t.context.fastify.register(fastifyNetAcl, { allowList: [] })

  try {
    await t.context.fastify.ready()
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Must specify options.allowList or options.blockList')
  }
})

t.test('throws if no list provided', async t => {
  t.context.fastify.register(fastifyNetAcl, {})

  try {
    await t.context.fastify.ready()
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Must specify options.allowList or options.blockList')
  }
})

t.test('throws if errorMessage not a string', async t => {
  t.context.fastify.register(fastifyNetAcl, { errorMessage: Symbol(1) })

  try {
    await t.context.fastify.ready()
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected options.errorMessage to be a string')
  }
})

t.test('throws if invalid IP', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['1.2.3.']
  })

  try {
    await t.context.fastify.ready()
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Invalid IP address: 1.2.3.')
  }
})

t.test('rejects IPv4 not on allow list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['1.2.3.4']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 403)
  t.equal((await resp.json()).message, 'Forbidden')
  t.end()
})

t.test('rejects IPv6 not on allow list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['::1']
  })

  await t.context.fastify.ready()

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
  t.context.fastify.register(fastifyNetAcl, {
    blockList: ['127.0.0.1']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IPv6 on block list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    blockList: ['::1']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '::1'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IPv4 in subnet block list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    blockList: ['127.0.0.0/16']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IPv6 in subnet block list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    blockList: ['2001:db8:abcd:0012::0/64']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0000:0000:0000:1122'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('accepts IPv4 on allow list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['127.0.0.1']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('accepts IPv6 on allow list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['2001:0DB8:ABCD:0012:0000:0000:0000:1122']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0000:0000:0000:1122'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('accepts IPv4 in subnet on allow list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['127.0.0.0/24']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('accepts IPv6 in subnet on allow list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['2001:db8:abcd:0012::0/112']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0000:0000:0000:0345'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('rejects IPv4 not in subnet on allow list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['128.0.0.0/24']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IPv6 not in subnet on allow list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['2001:db8:abcd:0012::0/112']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0000:0000:0001:0000'
  })

  t.equal(resp.statusCode, 403)
  t.end()
})

t.test('rejects IP with custom error code and message', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['128.0.0.0/24'],
    errorCode: 401,
    errorMessage: 'what are you doing?'
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 401)
  t.equal((await resp.json()).message, 'what are you doing?')
  t.end()
})

t.test('throws if both allowList and blockList specified', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['127.0.0.1'],
    blockList: ['127.0.0.2']
  })

  try {
    await t.context.fastify.ready()
  } catch ({ message }) {
    t.equal(message, 'Cannot specify options.allowList and options.blockList')
  }
})

t.test('accepts IPv4 not on block list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    blockList: '127.0.0.2'
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '127.0.0.3'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('accepts IPv6 not on block list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    blockList: '2001:db8:abcd:0012::0/80'
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/',
    remoteAddress: '2001:0DB8:ABCD:0012:0002:FFFF:FFFF:FFFF'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})
