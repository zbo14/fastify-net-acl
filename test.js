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
    t.equal(message, 'Address list is empty')
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

t.test('rejects IP not on allow list', async t => {
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

t.test('rejects IP on block list', async t => {
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

t.test('rejects IP in subnet block list', async t => {
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

t.test('accepts IP on allow list', async t => {
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

t.test('accepts IP in subnet on allow list', async t => {
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

t.test('rejects IP not in subnet on allow list', async t => {
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

t.test('accepts IP on allow and block list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    allowList: ['127.0.0.1'],
    blockList: ['127.0.0.1']
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})

t.test('accepts IP not on block list', async t => {
  t.context.fastify.register(fastifyNetAcl, {
    blockList: '127.0.0.2'
  })

  await t.context.fastify.ready()

  const resp = await t.context.fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(resp.statusCode, 404)
  t.end()
})
