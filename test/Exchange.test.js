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

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
  
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

  describe('make order', () => {
    let res

    beforeEach(async () => {
      res = await exchange.makeOrder(token.address, tokens(1), ETH_ADDRESS, ether(1), { from: user1 })
    })

    it('tracks the order count', async () => {
      const orderId = await exchange.orderCount();
      orderId.toString().should.be.equal('1')
      const order = await exchange.orders('1')
      // console.log(order)
      order.id.toString().should.equal('1')
      order.user.should.equal(user1)
      order.tokenGet.should.equal(token.address)
      order.amountGet.toString().should.equal(tokens(1).toString())
      order.tokenGive.should.equal(ETH_ADDRESS)
      order.amountGive.toString().should.equal(ether(1).toString())
      order.timestamp.toString().length.should.be.at.least(1)
    })

    it('emit make order event', async () => {
      const log = res.logs[0]
      log.event.should.eq('Order')
      const event = log.args
      event.id.toString().should.equal('1')
      event.user.should.equal(user1)
      event.tokenGet.should.equal(token.address)
      event.amountGet.toString().should.equal(tokens(1).toString())
      event.tokenGive.should.equal(ETH_ADDRESS)
      event.amountGive.toString().should.equal(ether(1).toString())
      event.timestamp.toString().length.should.be.at.least(1)
    })
  })

  describe('order action', () => {
    beforeEach(async () => {
      // 用户1先充值1ETH
      await exchange.depositETH({ from: user1, value: ether(1) })
      // 转移至100个Z token给user2 他将作为卖方
      await token.transfer(user2, tokens(100), { from: deployer })
      // 批准交易所交易20个 Z token
      await token.approve(exchange.address, tokens(2), { from: user2 })
      // 用户2 在当前交易所充值了20个 Z token
      await exchange.depositToken(token.address, tokens(2), { from: user2 })
      // 用户1用ETH来购买1个Z Token
      await exchange.makeOrder(token.address, tokens(1), ETH_ADDRESS, ether(1), { from: user1 })

    })

    describe('filling orders', () => {
      let res
      describe('success', () => {
        beforeEach(async () => {
          res = await exchange.fillOrder('1', { from: user2 })
        })
        it ('check the balance after executes the trade', async () => {
          let balance
          balance = await exchange.balanceOf(token.address, user1)
          balance.toString().should.equal(tokens(1).toString(), 'user1 received token')
          balance = await exchange.balanceOf(ETH_ADDRESS, user2)
          balance.toString().should.equal(ether(1).toString(), 'user2 received ETH')
          balance = await exchange.balanceOf(ETH_ADDRESS, user1)
          balance.toString().should.equal('0', 'user2 after trade')
          balance = await exchange.balanceOf(token.address, user2)
          balance.toString().should.equal(tokens(0.9).toString())
          const feeAccount = await exchange.feeAccount()
          balance = await exchange.balanceOf(token.address, feeAccount)
          balance.toString().should.equal(tokens(0.1).toString())
        })

        it('updates filled orders', async () => {
          const orderFilled = await exchange.orderFilled(1)
          orderFilled.should.equal(true)
        })
  
        it('emit a "Trade" event', async () => {
          const log = res.logs[0]
          log.event.should.eq('Trade')
          const event = log.args
          event.id.toString().should.equal('1')
          event.user.should.equal(user1)
          event.tokenGet.should.equal(token.address)
          event.amountGet.toString().should.equal(tokens(1).toString())
          event.tokenGive.should.equal(ETH_ADDRESS)
          event.amountGive.toString().should.equal(ether(1).toString())
          event.timestamp.toString().length.should.be.at.least(1)
          event.userFill.should.equal(user2)
        })
      })

      
      describe('fail', () => {
        it('rejects invalid order id', async () => {
          const invalidId = 9999
          await exchange.fillOrder(invalidId, { from: user2 }).should.be.rejectedWith(VM_WARNING)
        })
        it('rejects already-filled orders', async () => {
          // 再次尝试已经成交的订单
          await exchange.fillOrder('1', { from: user2 }).should.be.fulfilled
          await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(VM_WARNING)
        })
        it('rejects cancelled orders', async () => {
          await exchange.cancelOrder('1', { from: user1 }).should.be.fulfilled
          await exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(VM_WARNING)
        })
      })
    })

    describe('cancel order', () => {
      let res
      describe('success', () => {

        beforeEach(async () => {
          res = await exchange.cancelOrder('1', { from: user1 })
        })

        it('order has been canceled', async () => {
          const isCanceled = await exchange.orderCancelled(1)
          isCanceled.should.equal(true)
        })

        it('emit order cancel event', async () => {
          const log = res.logs[0]
          log.event.should.eq('OrderCancel')
          const event = log.args
          event.id.toString().should.equal('1')
          event.user.should.equal(user1)
          event.tokenGet.should.equal(token.address)
          event.amountGet.toString().should.equal(tokens(1).toString())
          event.tokenGive.should.equal(ETH_ADDRESS)
          event.amountGive.toString().should.equal(ether(1).toString())
          event.timestamp.toString().length.should.be.at.least(1)
        })
      })

      describe('fail', () => {

        it('reject invalid order is', async () => {
          const orderId = 9999
          await exchange.cancelOrder(orderId, { from: user1 }).should.be.rejectedWith(VM_WARNING)
        })

        it('reject unauthorized order', async () => {
          await exchange.cancelOrder('1', { from: deployer }).should.be.rejectedWith(VM_WARNING)
        })
      })
    })
  })
})
