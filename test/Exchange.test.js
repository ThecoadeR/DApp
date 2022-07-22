const Exchange = artifacts.require("./Exchange");
const Token = artifacts.require("./Token");

require('chai').use(require('chai-as-promised'))
  .should()

// 格式化Token
const tokens = (n) => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  )
}

const ether = n => tokens(n)
// 以太坊区块报错 固定格式
const VM_WARNING = 'VM Exception while processing transaction: revert'

// ETH代币地址
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Exchange', ([deployer, feeAccount, user1]) => {
  
  let token
  let exchange
  const feePercent = 10

  beforeEach(async() => {
    // 部署代币
    token = await Token.new()
    // 转移代币至某个用户
    token.transfer(user1, tokens(200), { from: deployer })
    // 部署交易合约
    exchange = await Exchange.new(feeAccount, feePercent)
  })

  describe('deployment', () => {
    it('tracks the fee accounts', async () => {
      const res = await exchange.feeAccount()
      res.should.equal(feeAccount)
    })

    it('tracks the fee percent',async () => {
      const res = await exchange.feePercent()
      res.toString().should.equal(feePercent.toString())
    })
  })

  describe('fallback', () => {
    it('reverts when Ether is sent', async () => {
      await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(VM_WARNING)
    })
  })

  describe('depositing ETH', () => {

    let res
    let amount

    beforeEach(async () => {
      amount = ether(1)
      res = await exchange.depositETH({ from: deployer, value: amount })
    })

    describe('deposit eth success', () => {
      it('tracks the eth deposit', async () => {
        const balance = await exchange.tokens(ETH_ADDRESS, deployer)
        balance.toString().should.equal(amount.toString())
      })
  
      it('emit Deposit event', async () => {
        const log = res.logs[0]
        log.event.should.eq('Deposit')
        const event = log.args
        event.token.should.equal(ETH_ADDRESS)
        event.user.should.equal(deployer)
        event.amount.toString().should.equal(amount.toString())
        event.balance.toString().should.equal(amount.toString())
      })
    })
  })

  describe('withdrawETH', () => {
    let res
    let amount

    beforeEach(async () => {
      amount = ether(1)
      await exchange.depositETH({ from: user1, value: amount })
    })

    describe('success', () => {
      beforeEach(async () => {
        res = await exchange.withdrawETH(amount, { from: user1 })
      })

      it('after withdrawETH', async () => {
        const balance = await exchange.tokens(ETH_ADDRESS, user1)
        balance.toString().should.equal('0')
      })

      it ('emit withdrawETH event', async() => {
        const log = res.logs[0]
        log.event.should.eq('WithdrawETH')
        const event = log.args
        event.token.should.equal(ETH_ADDRESS)
        event.user.should.equal(user1)
        event.amount.toString().should.equal(amount.toString())
        event.balance.toString().should.equal('0')
      })
    })

    describe('fail', () => {
      it('not enough balance', async () => {
        await exchange.withdrawETH(ether(100), { from: user1 }).should.be.rejectedWith(VM_WARNING)
      })
    })
  })

  describe('depositing tokens', () => {
    
    let res
    let amount

    describe('deposit success', () => {
      beforeEach(async () => {
        amount = tokens(10)
        // 开始交易前先批准可交易的金额
        await token.approve(exchange.address, amount, { from: user1 })
        // 存款到交易所
        res = await exchange.depositToken(token.address, amount, { from: user1 })
      })

      it('tracks the token deposit', async () => {
        // 当交易发生以后 需要检查余额
        let balance
        balance = await token.balanceOf(exchange.address)
        balance.toString().should.equal(amount.toString())
        // 交易所里用户的代币余额
        balance = await exchange.tokens(token.address, user1)
        balance.toString().should.equal(amount.toString())
      })

      it('emit Deposit event', async () => {
        const log = res.logs[0]
        log.event.should.eq('Deposit')
        const event = log.args
        event.token.should.equal(token.address)
        event.user.should.equal(user1)
        event.amount.toString().should.equal(amount.toString())
        event.balance.toString().should.equal(amount.toString())
      })
    })

    describe('deposit fail', () => {
      it('fails when no tokens are approved', async () => {
        await exchange.depositToken(token.address, tokens(10), { from: user1 }).should.be.rejectedWith(VM_WARNING)
      })
      it('fails when ETH deposit', async () => {
        await exchange.depositToken(ETH_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(VM_WARNING)
      })
    })
  })

  describe('withdraw token', () => {
    let amount
    let res

    beforeEach(async () => {
      amount = tokens(10)
      // 开始交易前先批准可交易的金额
      await token.approve(exchange.address, amount, { from: user1 })
      // 存款到交易所
      await exchange.depositToken(token.address, amount, { from: user1 })
      // 用户取款
      res = await exchange.withdrawToken(token.address, amount, { from: user1 })
    })

    describe('success', () => {
      it('success', async () => {
        const balance = await exchange.tokens(token.address, user1)
        balance.toString().should.equal('0')
      })
  
      it ('emit withdrawToken event', async() => {
        const log = res.logs[0]
        log.event.should.eq('WithdrawToken')
        const event = log.args
        event.token.should.equal(token.address)
        event.user.should.equal(user1)
        event.amount.toString().should.equal(amount.toString())
        event.balance.toString().should.equal('0')
      })
    })
    
    describe('fail', () => {
      it('try to withdraw eth', async () => {
        await exchange.withdrawToken(ETH_ADDRESS, tokens(100), { from: user1 }).should.be.rejectedWith(VM_WARNING)
      })
      it('not enough balance', async () => {
        await exchange.withdrawToken(token.address, tokens(100), { from: user1 }).should.be.rejectedWith(VM_WARNING)
      })
    })
  })

  describe('check balance', () => {
    beforeEach(async () => {
      exchange.depositETH({ from: user1, value: ether(1) })
    })

    it('success', async () => {
      const res = await exchange.balanceOf(ETH_ADDRESS, user1)
      res.toString().should.equal(ether(1).toString())
    })
  })
})
