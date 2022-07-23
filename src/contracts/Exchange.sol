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
  mapping(uint256 => _Order) public orders; // 由于无法直接获取所有订单，只能通过订单号(orderCount)来获取对应订单信息或者emit event
  uint256 public orderCount; // 订单计数器 用来缓存订单ID
  mapping(uint256 => bool) public orderCancelled; // 存储所有被取消的订单

  // event
  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event WithdrawETH(address token, address user, uint256 amount, uint256 balance);
  event WithdrawToken(address token, address user, uint256 amount, uint256 balance);
  event Order(
    uint256 id,
    address user,
    address tokenGet,
    uint256 amountGet,
    address tokenGive,
    uint256 amountGive,
    uint256 timestamp
  );
  event OrderCancel(
    uint256 id,
    address user,
    address tokenGet,
    uint256 amountGet,
    address tokenGive,
    uint256 amountGive,
    uint256 timestamp
  );

  // 订单模型
  struct _Order {
    uint256 id;
    address user;
    address tokenGet; // 购买的token地址
    uint256 amountGet; // 购买的token数量
    address tokenGive; // 用哪种token进行交易
    uint256 amountGive; // 交易的数量
    uint256 timestamp; // 时间戳
  }

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
    取出ETH
   */
  function withdrawETH(uint256 _amount) public {
    require(tokens[ETHER][msg.sender] >= _amount);
    tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
    msg.sender.transfer(_amount);
    emit WithdrawETH(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
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

  /**
    取出TOKEN
   */
   function withdrawToken(address _token, uint256 _amount) public {
      require(_token != ETHER);
      require(tokens[_token][msg.sender] >= _amount);
      tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
      require(Token(_token).transfer(msg.sender, _amount));
      // 发出事件 用于公开此次交易
      emit WithdrawToken(_token, msg.sender, _amount, tokens[_token][msg.sender]);
   }

   /**
    检查余额
    */
  function balanceOf(address _token, address _user) public view returns(uint) {
    return tokens[_token][_user];
  }

  /**
    创建订单
   */
  function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
    orderCount = orderCount.add(1);
    orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
    emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
  }

  /**
    取消订单
   */
  function cancelOrder(uint256 _id) public {
    // 获取订单
    _Order storage _order = orders[_id];
    require(address(_order.user) == msg.sender);
    require(_order.id == _id);
    // true === cancel
    orderCancelled[_id] = true;
    emit OrderCancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, now);
  }
}