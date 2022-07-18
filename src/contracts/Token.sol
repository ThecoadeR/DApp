pragma solidity ^0.5.0;
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract Token {
  using SafeMath for uint;
  // token 变量
  string public name = 'Z Token';
  string public symbol = 'Z';
  uint256 public decimals = 18;
  uint256 public totalSupply;
  // 余额
  mapping(address => uint256)public balanceOf;
  // 允许交易的额度 address1 === 批准当前交易的地址 address2 === 获取交易金额的地址
  mapping(address => mapping(address => uint256)) public allowance;

  constructor() public {
    // 发行数量 其实要乘以 小数 实际上 是发行了1000000枚
    totalSupply = 1000000 * (10 ** decimals);
    // 部署这个智能合约的人 将获得所有Z Token
    balanceOf[msg.sender] = totalSupply;
  }

  // token 事件 
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  /**
    内部封装transfer函数
   */
  function _transfer(address _from, address _to, uint256 _value) internal {
    require(_to != address(0));
    balanceOf[_from] = balanceOf[_from].sub(_value);
    balanceOf[_to] = balanceOf[_to].add(_value);
    emit Transfer(_from, _to, _value);
  }

  /**
    划转
    减少调用智能合约人的余额 && 增加接收者的余额
  */
  function transfer(address _to, uint256 _value) public returns(bool success) {
    // 当满足条件的时候 才会触发划转 否则报错
    require(balanceOf[msg.sender] >= _value);
    _transfer(msg.sender, _to, _value);
    return true;
  }

  /**
    批准交易
   */
  function approve(address _spender, uint256 _value) public returns(bool success) {
    require(_spender != address(0));
    allowance[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns(bool success) {
    /**
      转账金额必须小于调用者的余额
      转账金额必须小于被批准调用的金额
     */
    require(_value <= balanceOf[_from]);
    require(_value <= allowance[_from][msg.sender]);
    // 更新调用者可以被允许划转的额度
    allowance[_from][msg.sender] = allowance[_from][msg.sender].sub(_value);
    _transfer(_from, _to, _value);
    return true;
  }
}