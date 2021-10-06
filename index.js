'use strict'

const http = require('http')
const net = require('net')
const fp = require('fastify-plugin')

function createList (addrs) {
  addrs = [].concat(addrs).filter(Boolean)

  if (!addrs.length) {
    throw new Error('Address list is empty')
  }

  const list = new net.BlockList()

  for (const addr of addrs) {
    const [, ip, slash] = addr.match(/^(.*?)(?:\/(\d+))?$/)
    let type = net.isIP(ip)

    if (!type) {
      throw new Error('Invalid IP address: ' + ip)
    }

    type = 'ipv' + type

    slash
      ? list.addSubnet(ip, +slash, type)
      : list.addAddress(ip, type)
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

  if (options.allowList) {
    const allowList = createList(options.allowList)
    fastify.decorate('allowList', allowList)
  } else if (options.blockList) {
    const blockList = createList(options.blockList)
    fastify.decorate('blockList', blockList)
  } else {
    throw new Error('Must specify options.allowList or options.blockList')
  }

  const errorCode = options.errorCode || 403
  const errorMessage = options.errorMessage || http.STATUS_CODES[errorCode]

  fastify.addHook('onRequest', (request, reply, done) => {
    const block = () => {
      reply.code(errorCode)
      done(new Error(errorMessage))
    }

    if (fastify.allowList) {
      const allowed = fastify.allowList.check(request.ip)
      if (!allowed) return block()
    } else {
      const blocked = fastify.blockList.check(request.ip)

      if (blocked) return block()
    }

    done()
  })
}

module.exports = fp(plugin, {
  fastify: '3.x',
  name: 'fastify-net-acl'
})
