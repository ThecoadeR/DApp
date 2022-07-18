const Token = artifacts.require("./Token");

require('chai').use(require('chai-as-promised'))
  .should()

// 格式化Token
const tokens = (n) => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  )
}
// 以太坊区块报错 固定格式
const VM_WARNING = 'VM Exception while processing transaction: revert'

contract('Token', (accounts) => {
  const name = 'Z Token'
  const symbol = 'Z'
  const totalSupply = tokens(1000000).toString()
  const decimals = '18'

  let token

  beforeEach(async() => {
    token = await Token.new()
  })

  describe('deployment', () => {
    it('track the name', async() => {
      const res = await token.name()
      res.should.equal(name)
    })

    it('track the symbol', async() => {
      const res = await token.symbol()
      res.should.equal(symbol)
    })

    it('track the decimals', async() => {
      const res = await token.decimals()
      res.toString().should.equal(decimals)
    })

    it('track the total supply', async() => {
      const res = await token.totalSupply()
      res.toString().should.equal(totalSupply.toString())
    })

    it('track the total supply to deployer', async() => {
      const res = await token.balanceOf(accounts[0])
      res.toString().should.equal(totalSupply.toString())
    })

  })

  describe('transfer', () => {
    let amount
    let res

    describe('transfer success', () => {
      beforeEach(async() => {
        amount = tokens(500000)
        res = await token.transfer(accounts[1], amount, { from: accounts[0]})
      })
      it('transfer Test', async () => {
        let balanceOf
        // before transfer
        balanceOf = await token.balanceOf(accounts[0])
        balanceOf = await token.balanceOf(accounts[1])
        
  
        // after transfer..
        balanceOf = await token.balanceOf(accounts[0])
        balanceOf.toString().should.equal(tokens(500000).toString())
  
        balanceOf = await token.balanceOf(accounts[1])
        balanceOf.toString().should.equal(tokens(500000).toString())
      })
  
      it('emit Transfer event', async () => {
        // console.log(res) res其实是一个完整的log信息
        const log = res.logs[0]
        log.event.should.equal('Transfer')
        const arg = log.args
        arg.from.toString().should.equal(accounts[0])
        arg.to.toString().should.equal(accounts[1])
        arg.value.toString().should.equal(amount.toString())
  
      })
    })

    describe('transfer fail', () => {
      it('invalid amount', async() => {
        let invalidAmount = tokens(1000000000)
        await token.transfer(accounts[1], invalidAmount, { from: accounts[0]}).should.be.rejectedWith(VM_WARNING)

        await token.transfer(accounts[0], invalidAmount, { from: accounts[1]}).should.be.rejectedWith(VM_WARNING)
      })

      it('invalid address', async() => {
        await token.transfer(0x0, amount, { from: accounts[0 ]}).should.be.rejected
      })
    })
  })

  describe('approving tokens', () => {
    let res
    let amount

    beforeEach(async() => {
      amount = tokens(100)
      // 批准从部署账户交易至第三个账户 100个代币
      res = await token.approve(accounts[2], amount, { from: accounts[0] })
    })

    describe('success', () => {
      it('approving token success', async () => {
        // 检查100个token是否交易至对应账户
        const allowance = await token.allowance(accounts[0], accounts[2])
        allowance.toString().should.equal(amount.toString())
      })

      it('emit Approval event', async () => {
        // console.log(res) res其实是一个完整的log信息
        const log = res.logs[0]
        log.event.should.equal('Approval')
        const arg = log.args
        arg.owner.toString().should.equal(accounts[0])
        arg.spender.toString().should.equal(accounts[2])
        arg.value.toString().should.equal(amount.toString())
  
      })
    })

    describe('fail', () => {
      it('invalid address', async () => {
        await token.approve(0x0, amount, { from: accounts[0] }).should.be.rejected
      })
    })
  })

  describe('transfer', () => {
    let amount
    let res

    beforeEach(async () => {
      amount = tokens(100)
      // 批准交易
      await token.approve(accounts[2], amount, { from: accounts[0] })
    })

    describe('transfer success', () => {

      beforeEach(async() => {
        res = await token.transferFrom(accounts[0], accounts[1], amount, { from: accounts[2]})
      })

      it('transferFrom Test', async () => {
        let balanceOf

        // after transfer..
        balanceOf = await token.balanceOf(accounts[0])
        balanceOf.toString().should.equal(tokens(999900).toString())
  
        balanceOf = await token.balanceOf(accounts[1])
        balanceOf.toString().should.equal(tokens(100).toString())
      })

      it('emit Transfer event', async () => {
        // console.log(res) res其实是一个完整的log信息
        const log = res.logs[0]
        log.event.should.equal('Transfer')
        const arg = log.args
        arg.from.toString().should.equal(accounts[0])
        arg.to.toString().should.equal(accounts[1])
        arg.value.toString().should.equal(amount.toString())
      })
    })

    describe('transfer fail', () => {
      it('invalid amount', async() => {
        let invalidAmount = tokens(1000000000)
        await token.transferFrom(accounts[0], accounts[1], invalidAmount, { from: accounts[2]}).should.be.rejectedWith(VM_WARNING)
      })

      it('invalid address', async() => {
        await token.transferFrom(0x0, accounts[1], amount, { from: accounts[2]}).should.be.rejected
      })
    })
  })
  
})
