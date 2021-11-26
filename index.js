'use strict'

const http = require('http')
const net = require('net')
const fp = require('fastify-plugin')

const createList = (config, isGlobal, mustBeArray = false) => {
  if (!config) return null

  if (typeof config === 'string') {
    config = [config]
  }

  if (Array.isArray(config)) {
    const rules = [].concat(config).filter(Boolean)

    if (!rules.length) return null

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

  if (config?.constructor?.name === 'Object') {
    if (isGlobal) {
      throw new Error('Expected list config to an array when global')
    }

    if (mustBeArray) {
      throw new Error('Expected inner list config to be an array')
    }

    const allRules = {}

    Object.entries(config).forEach(([key, rules]) => {
      const result = createList(rules, isGlobal, true)

      if (result) {
        allRules[key] = result
      }
    })

    return Object.entries(allRules).length
      ? allRules
      : null
  }

  throw new Error('Expected list config to be an array or object literal')
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

  const isGlobal = typeof options.global === 'boolean'
    ? options.global
    : true

  const allowList = createList(options.allowList, isGlobal)
  const blockList = createList(options.blockList, isGlobal)

  if (isGlobal && allowList && blockList) {
    throw new Error('Cannot specify global options.allowList and options.blockList')
  }

  if (!allowList && !blockList) {
    throw new Error('Must specify options.allowList or options.blockList')
  }

  if (allowList) {
    fastify.decorate('allowList', allowList)
  }

  if (blockList) {
    fastify.decorate('blockList', blockList)
  }

  const createRequestHandler = (listName = '') => {
    let list
    let isAllowList

    if (listName) {
      if (!/^(?:allow|block):\w+$/i.test(listName)) {
        throw new Error('Invalid list name: ' + listName)
      }

      isAllowList = /^allow/i.test(listName)
      listName = listName.split(/^(?:allow|block):/i).pop()

      list = isAllowList
        ? fastify.allowList?.[listName]
        : fastify.blockList?.[listName]

      if (!list) {
        throw new Error(`Couldn't find ${isAllowList ? 'allow' : 'block'} list: ${listName}`)
      }
    } else {
      list = fastify.allowList || fastify.blockList
      isAllowList = !!fastify.allowList
    }

    return (request, reply, done) => {
      const ipType = 'ipv' + net.isIP(request.ip)
      const isMatch = list.check(request.ip, ipType)
      const allow = (isMatch && isAllowList) || (!isMatch && !isAllowList)

      if (allow) return done()

      reply.code(errorCode)
      done(new Error(errorMessage))
    }
  }

  const errorCode = options.errorCode || 403
  const errorMessage = options.errorMessage || http.STATUS_CODES[errorCode]

  isGlobal
    ? fastify.addHook('onRequest', createRequestHandler())
    : fastify.decorate('createNetAclRequestHandler', createRequestHandler)
}

module.exports = fp(plugin, {
  fastify: '3.x',
  name: 'fastify-net-acl'
})
