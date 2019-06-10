const test = require('tape')
const devp2p = require('../../src')
const util = require('./util.js')

const CHAIN_ID = 420

const GENESIS_TD = 17179869184
const GENESIS_HASH = Buffer.from('b4973da140b05bfffb1cd734ed871f888e71cf563a4218f82a092fc4540f6c03', 'hex')

var capabilities = [
  devp2p.PWP.puffs63,
  devp2p.PWP.puffs62
]

const status = {
  networkId: CHAIN_ID,
  td: devp2p._util.int2buffer(GENESIS_TD),
  bestHash: GENESIS_HASH,
  genesisHash: GENESIS_HASH
}

// FIXME: Handle unhandled promises directly
process.on('unhandledRejection', (reason, p) => {})

test('PWP: send status message (successful)', async (t) => {
  let opts = {}
  opts.status0 = Object.assign({}, status)
  opts.status1 = Object.assign({}, status)
  opts.onOnceStatus0 = function (rlpxs, puffs) {
    t.pass('should receive echoing status message and welcome connection')
    util.destroyRLPXs(rlpxs)
    t.end()
  }
  util.twoPeerMsgExchange(t, capabilities, opts)
})

test('PWP: send status message (NetworkId mismatch)', async (t) => {
  let opts = {}
  opts.status0 = Object.assign({}, status)
  let status1 = Object.assign({}, status)
  status1['networkId'] = 2
  opts.status1 = status1
  opts.onPeerError0 = function (err, rlpxs) {
    const msg = 'NetworkId mismatch: 01 / 02'
    t.equal(err.message, msg, `should emit error: ${msg}`)
    util.destroyRLPXs(rlpxs)
    t.end()
  }
  util.twoPeerMsgExchange(t, capabilities, opts)
})

test('PWP: send status message (Genesis block mismatch)', async (t) => {
  let opts = {}
  opts.status0 = Object.assign({}, status)
  let status1 = Object.assign({}, status)
  status1['genesisHash'] = Buffer.alloc(32)
  opts.status1 = status1
  opts.onPeerError0 = function (err, rlpxs) {
    const msg = 'Genesis block mismatch: b4973da140b05bfffb1cd734ed871f888e71cf563a4218f82a092fc4540f6c03 / 0000000000000000000000000000000000000000000000000000000000000000'
    t.equal(err.message, msg, `should emit error: ${msg}`)
    util.destroyRLPXs(rlpxs)
    t.end()
  }
  util.twoPeerMsgExchange(t, capabilities, opts)
})

test('PWP: send allowed puffs63', async (t) => {
  let opts = {}
  opts.status0 = Object.assign({}, status)
  opts.status1 = Object.assign({}, status)
  opts.onOnceStatus0 = function (rlpxs, puffs) {
    t.equal(puffs.getVersion(), 63, 'should use puffs63 as protocol version')
    puffs.sendMessage(devp2p.PWP.MESSAGE_CODES.NEW_BLOCK_HASHES, [ 437000, 1, 0, 0 ])
    t.pass('should send NEW_BLOCK_HASHES message')
  }
  opts.onOnMsg1 = function (rlpxs, puffs, code, payload) {
    if (code === devp2p.PWP.MESSAGE_CODES.NEW_BLOCK_HASHES) {
      t.pass('should receive NEW_BLOCK_HASHES message')
      util.destroyRLPXs(rlpxs)
      t.end()
    }
  }
  util.twoPeerMsgExchange(t, capabilities, opts)
})

test('PWP: send allowed puffs62', async (t) => {
  let cap = [
    devp2p.PWP.puffs62
  ]
  let opts = {}
  opts.status0 = Object.assign({}, status)
  opts.status1 = Object.assign({}, status)
  opts.onOnceStatus0 = function (rlpxs, puffs) {
    puffs.sendMessage(devp2p.PWP.MESSAGE_CODES.NEW_BLOCK_HASHES, [ 437000, 1, 0, 0 ])
    t.pass('should send NEW_BLOCK_HASHES message')
  }
  opts.onOnMsg1 = function (rlpxs, puffs, code, payload) {
    if (code === devp2p.PWP.MESSAGE_CODES.NEW_BLOCK_HASHES) {
      t.pass('should receive NEW_BLOCK_HASHES message')
      util.destroyRLPXs(rlpxs)
      t.end()
    }
  }
  util.twoPeerMsgExchange(t, cap, opts)
})

test('PWP: send not-allowed puffs62', async (t) => {
  let cap = [
    devp2p.PWP.puffs62
  ]
  let opts = {}
  opts.status0 = Object.assign({}, status)
  opts.status1 = Object.assign({}, status)
  opts.onOnceStatus0 = function (rlpxs, puffs) {
    try {
      puffs.sendMessage(devp2p.PWP.MESSAGE_CODES.GET_NODE_DATA, [])
    } catch (err) {
      const msg = 'Error: Code 13 not allowed with version 62'
      t.equal(err.toString(), msg, `should emit error: ${msg}`)
      util.destroyRLPXs(rlpxs)
      t.end()
    }
  }
  util.twoPeerMsgExchange(t, cap, opts)
})

test('PWP: send unknown message code', async (t) => {
  let opts = {}
  opts.status0 = Object.assign({}, status)
  opts.status1 = Object.assign({}, status)
  opts.onOnceStatus0 = function (rlpxs, puffs) {
    try {
      puffs.sendMessage(0x55, [])
    } catch (err) {
      const msg = 'Error: Unknown code 85'
      t.equal(err.toString(), msg, `should emit error: ${msg}`)
      util.destroyRLPXs(rlpxs)
      t.end()
    }
  }
  util.twoPeerMsgExchange(t, capabilities, opts)
})

test('PWP: invalid status send', async (t) => {
  let opts = {}
  opts.status0 = Object.assign({}, status)
  opts.status1 = Object.assign({}, status)
  opts.onOnceStatus0 = function (rlpxs, puffs) {
    try {
      puffs.sendMessage(devp2p.PWP.MESSAGE_CODES.STATUS, [])
    } catch (err) {
      const msg = 'Error: Please send status message through .sendStatus'
      t.equal(err.toString(), msg, `should emit error: ${msg}`)
      util.destroyRLPXs(rlpxs)
      t.end()
    }
  }
  util.twoPeerMsgExchange(t, capabilities, opts)
})
