
const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");

// 格式化Token
const tokens = (n) => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  )
}

const ether = n => tokens(n)

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'


module.exports = async function(callback) {
  try {
    const accounts = await web3.eth.getAccounts()

    // get the deployed token
    const token = await Token.deployed()
    console.log('token...', token.address)

    // get the deployed exchange
    const exchange = await Exchange.deployed()
    console.log('exchange...', exchange.address)

    const sender = accounts[0]
    const receiver = accounts[1]
    let amount = web3.utils.toWei('10000', 'ether')
    await token.transfer(receiver, amount, { from: sender })

    const user1 = accounts[0]
    const user2 = accounts[1]
   
    amount = 1
    await exchange.depositETH({ from: user1, value: ether(1) })

    amount = 10000
    await token.approve(exchange.address, tokens(amount), { from: user2 })
    await exchange.depositToken(token.address, tokens(amount), { from: user2 })

    // user1 make order to get tokens
    let result
    let orderId
    result = await exchange.makeOrder(token.address, tokens(100), ETH_ADDRESS, ether(0.1), { from: user1 })

    orderId = result.logs[0].args.id
    await exchange.cancelOrder(orderId, { from: user1 })

  } catch (error) {
    
  }
  callback()
}