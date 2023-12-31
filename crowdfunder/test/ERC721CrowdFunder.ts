import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { mine } from "@nomicfoundation/hardhat-network-helpers";

// 31 days with 1s interval
const MINE_BLOCKS = 31 * 24 * 60 * 60;

describe("Crowdfunder", () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployErc721Crowdfunder() {
    const fundingObjective = ethers.parseEther("2");
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const CrowdfunderFactory = await ethers.getContractFactory(
      "ERC721CrowdFunder",
    );
    const crowdfunder = await CrowdfunderFactory.deploy(
      "Test Token",
      "TST",
      fundingObjective,
      owner.address,
    );

    return { crowdfunder, fundingObjective, owner, otherAccount };
  }

  describe("Deployment", () => {
    it("Should set the right funding objective", async function () {
      const { crowdfunder, fundingObjective } = await loadFixture(
        deployErc721Crowdfunder,
      );
      expect(await crowdfunder.fundingObjective()).to.equal(fundingObjective);
    });

    it("Should set the right owner", async function () {
      const { crowdfunder, owner } = await loadFixture(deployErc721Crowdfunder);
      expect(await crowdfunder.deployer()).to.equal(owner.address);
    });
  });

  describe("Test ERC721 crowdfund", () => {
    describe("Validations", () => {
      describe("canMint", () => {
        it("should revert if the value sent is different from 1 eth", async () => {
          const { crowdfunder, owner } = await loadFixture(
            deployErc721Crowdfunder,
          );
          await expect(crowdfunder.connect(owner).mint()).to.be
            .revertedWithCustomError(
              crowdfunder,
              "IncorrectValue",
            );
        });
        it("should revert if the crowdfund is not available anymore", async () => {
          const { crowdfunder, owner } = await loadFixture(
            deployErc721Crowdfunder,
          );
          // mine blocks
          await mine(MINE_BLOCKS);
          await expect(
            crowdfunder.connect(owner).mint({ value: ethers.parseEther("1") }),
          ).to.be.revertedWithCustomError(crowdfunder, "CrowdfundEnded");
        });
      });
      describe("isDeployer", () => {
        it("Should revert if the depoyer is not the one calling the function", async () => {
          const { crowdfunder, otherAccount } = await loadFixture(
            deployErc721Crowdfunder,
          );
          // mine blocks
          await mine(MINE_BLOCKS);
          await expect(
            crowdfunder.connect(otherAccount).withdraw(),
          ).to.be.revertedWithCustomError(
            crowdfunder,
            "SenderIsNotDeployer",
          );
        });
      });
      describe("canWithdraw", () => {
        it("Should revert if the end block number is not reached", async () => {
          const { crowdfunder, owner } = await loadFixture(
            deployErc721Crowdfunder,
          );
          await expect(
            crowdfunder.connect(owner).withdraw(),
          ).to.be.revertedWithCustomError(
            crowdfunder,
            "CrowdfundNotEnded",
          );
        });
        it("Should revert if the crowdfund objective is not met", async () => {
          const { crowdfunder, owner } = await loadFixture(
            deployErc721Crowdfunder,
          );
          await mine(MINE_BLOCKS);
          await expect(
            crowdfunder.connect(owner).withdraw(),
          ).to.be.revertedWithCustomError(
            crowdfunder,
            "FundingObjectiveNotReached",
          );
        });
      });

      describe("canCancel", () => {
        it("Should revert if the crowdfund is not ended", async () => {
          const { crowdfunder, owner } = await loadFixture(
            deployErc721Crowdfunder,
          );
          await expect(
            crowdfunder.connect(owner).cancel(),
          ).to.be.revertedWithCustomError(
            crowdfunder,
            "CrowdfundNotEnded",
          );
        });
        it("Should revert if the crowdfund did raise the funding objective", async () => {
          const { crowdfunder, owner } = await loadFixture(
            deployErc721Crowdfunder,
          );
          await crowdfunder.connect(owner).mint({
            value: ethers.parseEther("1"),
          });
          await crowdfunder.connect(owner).mint({
            value: ethers.parseEther("1"),
          });
          await mine(MINE_BLOCKS);
          await expect(
            crowdfunder.connect(owner).cancel(),
          ).to.be.revertedWithCustomError(
            crowdfunder,
            "FundingObjectiveReached",
          );
        });
      });

      describe("canRefund", () => {
        it("should revert if the sender is not the owner of the tokenId", async () => {
          const { crowdfunder, owner, otherAccount } = await loadFixture(
            deployErc721Crowdfunder,
          );
          await crowdfunder.connect(owner).mint({
            value: ethers.parseEther("1"),
          });
          await mine(MINE_BLOCKS);
          await crowdfunder.connect(owner).cancel();
          await expect(
            crowdfunder.connect(otherAccount).refund(BigInt(0)),
          ).to.be.revertedWithCustomError(
            crowdfunder,
            "SenderIsNotOwner",
          );
        });
        it("should revert if the crowdfund is not cancelled", async () => {
          const { crowdfunder, owner } = await loadFixture(
            deployErc721Crowdfunder,
          );
          await crowdfunder.connect(owner).mint({
            value: ethers.parseEther("1"),
          });
          await mine(MINE_BLOCKS);
          await expect(
            crowdfunder.connect(owner).refund(BigInt(0)),
          ).to.be.revertedWithCustomError(
            crowdfunder,
            "CrowdfundIsActive",
          );
        });
      });
    });

    describe("Events", () => {
      it("Should emit an event on cancel", async function () {
        const { crowdfunder, owner } = await loadFixture(
          deployErc721Crowdfunder,
        );
        await mine(MINE_BLOCKS);
        await expect(crowdfunder.connect(owner).cancel())
          .to.emit(crowdfunder, "Cancelled");
      });
    });

    describe("ERC721Crowdfunder", () => {
      it("Should mint a token", async () => {
        const { crowdfunder, owner } = await loadFixture(
          deployErc721Crowdfunder,
        );
        await crowdfunder.connect(owner).mint({
          value: ethers.parseEther("1"),
        });
        expect(await crowdfunder.ownerOf(0)).to.equal(owner.address);
      });
      it("Should withdraw funds", async () => {
        const { crowdfunder, owner, otherAccount } = await loadFixture(
          deployErc721Crowdfunder,
        );
        await crowdfunder.connect(owner).mint({
          value: ethers.parseEther("1"),
        });
        await crowdfunder.connect(otherAccount).mint({
          value: ethers.parseEther("1"),
        });
        await mine(MINE_BLOCKS);
        const balance = await ethers.provider.getBalance(owner.address);
        await crowdfunder.withdraw();
        expect(await ethers.provider.getBalance(owner.address)).to.greaterThan(
          balance,
        );
      });
      it("should cancel the crowdfund", async () => {
        const { crowdfunder, owner } = await loadFixture(
          deployErc721Crowdfunder,
        );
        await crowdfunder.connect(owner).mint({
          value: ethers.parseEther("1"),
        });
        await mine(MINE_BLOCKS);
        await crowdfunder.connect(owner).cancel();
        expect(await crowdfunder.isActive()).to.equal(false);
      });
      it("should refund a token", async () => {
        const { crowdfunder, owner } = await loadFixture(
          deployErc721Crowdfunder,
        );
        await crowdfunder.connect(owner).mint({
          value: ethers.parseEther("1"),
        });
        const balance = await ethers.provider.getBalance(owner.address);
        await mine(MINE_BLOCKS);
        await crowdfunder.connect(owner).cancel();
        await crowdfunder.connect(owner).refund(BigInt(0));
        expect(await ethers.provider.getBalance(owner.address)).to.greaterThan(
          balance,
        );
      });
    });
  });
});
