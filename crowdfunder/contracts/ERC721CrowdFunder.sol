// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721CrowdFunder is ERC721 {
    // store nft balances
    mapping(uint => address) private balances;
    // store if a token was refunded
    mapping(uint => bool) private refunds;
    // nonce for the token id
    uint private nonce = 0;
    // boolean for the state of the crowdfund
    bool public isActive = true;
    // objective funding
    uint public fundingObjective;
    // end block number
    uint public endBlockNumber;
    // deployer address
    address public deployer;

    event Cancelled();

    // modifiers
    // check if the sender is the deployer
    modifier isDeployer() {
        require(
            msg.sender == deployer,
            "The sender of the transaction is not the deployer of the contract"
        );
        _;
    }

    // check if the token can be refunded
    // the crowdfund is cancelled
    // the sender must be the owner of the token
    // the token must not be refunded yet
    modifier canRefund(uint tokenId) {
        require(
            isActive == false,
            "The crowdfund needs to be cancelled before it can be refunded"
        );
        require(
            balances[tokenId] == msg.sender,
            "The sender does not own this token"
        );
        require(refunds[tokenId] == false, "This token was already refunded");
        _;
    }

    // chcek if the crowdfund can be cancelled
    // the crowdfund must be ended
    // the crowdfund must not have reached the objective funding
    modifier canCancel() {
        require(
            block.number >= endBlockNumber,
            "The crowdfund is not ended so it cannot be cancelled"
        );
        require(
            address(this).balance < fundingObjective,
            "The objective founding was raised so it cannot be cancelled"
        );
        _;
    }

    // check if an NFT can be minted
    // the crowdfund must be active => not cancelled
    // the crowdfund must not be ended
    modifier canMint() {
        require(
            block.number <= endBlockNumber,
            "The crowdfund is not available anymore"
        );
        require(
            msg.value == 1 ether,
            "The transaction value is diffrerent from one ether"
        );
        _;
    }

    // check if the crowdfund can be withdrawn
    // the crowdfund must be ended
    // the crowdfund must be active => not cancelled
    // the crowdfund must have reached the objective funding
    modifier canWithdraw() {
        require(
            block.number > endBlockNumber,
            "You cannot withdraw if the crowdfund is still active"
        );
        require(isActive == true, "You cannot withdraw a cancelled crowdfund");
        require(
            address(this).balance >= fundingObjective,
            "You cannot withdraw if the crowdfund did not reach the objective funding"
        );
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint _fundingObjective,
        address _deployer
    ) ERC721(_name, _symbol) {
        endBlockNumber = block.number + 30 days;
        fundingObjective = _fundingObjective;
        deployer = _deployer;
    }

    function mint() public payable canMint {
        _safeMint(msg.sender, nonce);
        balances[nonce] = msg.sender;
        refunds[nonce] = false;
        nonce += 1;
    }

    function withdraw() public isDeployer canWithdraw {
        payable(msg.sender).transfer(address(this).balance);
    }

    function cancel() public isDeployer canCancel {
        isActive = false;
        emit Cancelled();
    }

    function refund(uint tokenId) public canRefund(tokenId) {
        payable(msg.sender).transfer(1 ether);
        refunds[tokenId] = true;
    }
}
