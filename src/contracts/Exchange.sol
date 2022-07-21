// 此合约处理交易相关的逻辑
import './Token.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

pragma solidity ^0.5.0;

contract Exchange {
  using SafeMath for uint;
  // 智能合约变量
  address public feeAccount; // 该账户用于接收所有交易所产生的手续费
  uint256 public feePercent; // 每一笔交易所产生的手续费
  // token地址 && 用户地址
  mapping(address => mapping(address => uint256)) public tokens; // 用户余额
  // ETH
  address constant ETHER = address(0); // 由于ETH没有具体地址 所以当地址为空的时候 默认为ETH

  // event
  event Deposit(address token, address user, uint256 amount, uint256 balance);

  constructor(address _feeAccount, uint256 _feePercent) public {
    feeAccount = _feeAccount;
    feePercent = _feePercent;
  }
  
  // 防止ETH被错误的发送到了当前的这个合约上
  function() external {
    revert();
  }

  /**
    存入ETH
    通过payable关键字 && msg.value 可以获取具体的ETH数量
   */
  function depositETH() payable public {
    tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
    // ETH && 存入ETH的数量 && 存入以后的ETH余额
    emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
  }

  /** 
    1. 存入哪个类型的代币
    2. 存入多少代币
    3. 发送代币到合约 - 处理交易
    4. 发送事件 - 订阅
  */
  function depositToken(address _token, uint256 _amount) public {
    // 改函数不允许存入ETH
    require(_token != ETHER);
    // 允许调用者 将token转移到Exchange合约上
    require(Token(_token).transferFrom(msg.sender, address(this), _amount));
    // 更新账户余额
    tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
    // 发出事件 用于公开此次交易
    emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
  }
}