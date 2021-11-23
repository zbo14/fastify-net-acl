'use strict'

const http = require('http')
const net = require('net')
const fp = require('fastify-plugin')

const getRules = rules => [].concat(rules).filter(Boolean)

const createList = rules => {
  const list = new net.BlockList()

  for (const rule of rules) {
    const [, ip, slash] = rule.match(/^(.*?)(?:\/(\d+))?$/)
    let ipType = net.isIP(ip)

    if (!ipType) {
      throw new Error('Invalid IP address: ' + ip)
    }

    ipType = 'ipv' + ipType

    slash
      ? list.addSubnet(ip, +slash, ipType)
      : list.addAddress(ip, ipType)
  }

  return list
}

async function plugin (fastify, options) {
  if (options?.constructor?.name !== 'Object') {
    throw new Error('Expected options to be an object literal')
  }

  const invalidErrorCode = (
    options.errorCode &&
    (!Number.isInteger(options.errorCode) || options.errorCode <= 0)
  )

  if (invalidErrorCode) {
    throw new Error('Expected options.errorCode to be a positive integer')
  }

  if (options.errorMessage && typeof options.errorMessage !== 'string') {
    throw new Error('Expected options.errorMessage to be a string')
  }

  const allowRules = getRules(options.allowList)
  const blockRules = getRules(options.blockList)

  if (allowRules.length && blockRules.length) {
    throw new Error('Cannot specify options.allowList and options.blockList')
  } else if (allowRules.length) {
    const allowList = createList(allowRules)
    fastify.decorate('allowList', allowList)
  } else if (blockRules.length) {
    const blockList = createList(blockRules)
    fastify.decorate('blockList', blockList)
  } else {
    throw new Error('Must specify options.allowList or options.blockList')
  }

  const errorCode = options.errorCode || 403
  const errorMessage = options.errorMessage || http.STATUS_CODES[errorCode]

  const checkRequest = (request, reply, done) => {
    const block = () => {
      reply.code(errorCode)
      done(new Error(errorMessage))
    }

    const ipType = 'ipv' + net.isIP(request.ip)

    if (fastify.allowList) {
      const allowed = fastify.allowList.check(request.ip, ipType)

      if (!allowed) return block()
    } else {
      const blocked = fastify.blockList.check(request.ip, ipType)

      if (blocked) return block()
    }

    done()
  }

  const isGlobal = typeof options.global === 'boolean'
    ? options.global
    : true

  isGlobal
    ? fastify.addHook('onRequest', checkRequest)
    : fastify.decorate('checkRequest', checkRequest)
}

module.exports = fp(plugin, {
  fastify: '3.x',
  name: 'fastify-net-acl'
})
