// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
error SenderIsNotDeployer();
error CrowdfundNotActive();
error CrowdfundIsActive();
error SenderIsNotOwner(address sender, uint tokenId);
error FundingObjectiveNotReached(uint fundingObjective, uint balance);
error FundingObjectiveReached(uint fundingObjective, uint balance);
error CrowdfundNotEnded(uint endTimestamp, uint blockTimestamp);
error CrowdfundEnded(uint endTimestamp, uint blockTimestamp);
error IncorrectValue(uint value, uint price);
error FailedToRefund();
error FailedToWithdraw();