pragma solidity >=0.8.0;

contract CryptoBagMgr {
  uint public totalCryptobag;
  uint public totalCoin;

  mapping(uint => Cryptobag) public cryptobags;
  mapping(uint => Coin) public coins;

  constructor(){
    totalCryptobag = 0;
    totalCoin = 0;
  }
  event CryptobagCreated(uint id, string name, address creator, uint coins);
  event CoinAdded(uint id,uint cryptocoinsId,string name,address creator );

  struct Cryptobag{
    uint id;
    string name;
    address creator;
    uint coins;
  }
  
  struct Coin{
    uint id;
    uint cryptobagId;
    string name;
    address creator;
  }

 
 

  function createCryptobag(string memory _name) external {
    require(bytes(_name).length > 0 , "Name can not be empty");
    totalCryptobag += 1;
    cryptobags[totalCryptobag] = Cryptobag(totalCryptobag,_name, msg.sender,0);
    emit CryptobagCreated(totalCryptobag, _name, msg.sender, 0);
  
  }

  function addCoinToCryptobag(string memory _name, uint _cryptobagId)  external {  
    require(_cryptobagId <= totalCryptobag,"Wrong cryptobag id");
    totalCoin += 1;
    coins[totalCoin] = Coin(totalCoin,_cryptobagId,_name,msg.sender);
    cryptobags[_cryptobagId].coins += 1;

    emit CoinAdded(totalCoin, _cryptobagId, _name,msg.sender);

  }

  function getCryptobagCoins(uint _cryptobagId) external view returns(Coin[] memory){
    require(_cryptobagId <= totalCryptobag,"Wrong cryptobag id");
    uint coinAmt = cryptobags[_cryptobagId].coins;
    
   Coin[] memory _coins = new Coin[](coinAmt);

    uint currentIndex = 0;
    for(uint i=1;i<=totalCoin;i++){
      if(coins[i].cryptobagId == _cryptobagId){
        _coins[currentIndex] = coins[i];
        currentIndex += 1;
      }
    }
    return _coins;
  }

}
