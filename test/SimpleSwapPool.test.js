const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleSwapPool", function () {
  let owner, user;
  let flashToken, usdc, pool;

  const ONE_FLASH = 10n ** 18n;
  const ONE_USDC = 10n ** 6n;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const FlashToken = await ethers.getContractFactory("FlashToken");
    flashToken = await FlashToken.deploy("Flash Token", "FLASH", 1_000_000n, 10n, 500_000n);
    await flashToken.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USD Coin", "mUSDC", 6);
    await usdc.waitForDeployment();

    const SimpleSwapPool = await ethers.getContractFactory("SimpleSwapPool");
    pool = await SimpleSwapPool.deploy(await flashToken.getAddress(), await usdc.getAddress());
    await pool.waitForDeployment();

    const initialFlash = 500_000n * ONE_FLASH;
    const initialUsdc = 1_000_000n * ONE_USDC;

    await usdc.mint(owner.address, initialUsdc + 100_000n * ONE_USDC);
    await flashToken.approve(await pool.getAddress(), initialFlash);
    await usdc.approve(await pool.getAddress(), initialUsdc);
    await pool.addLiquidity(initialFlash, initialUsdc);

    await flashToken.transfer(user.address, 1_000n * ONE_FLASH);
  });

  it("stores pool reserves when liquidity is added", async function () {
    const [r0, r1] = await pool.getReserves();
    expect(r0).to.equal(500_000n * ONE_FLASH);
    expect(r1).to.equal(1_000_000n * ONE_USDC);
  });

  it("returns quote using constant product formula", async function () {
    const input = 100n * ONE_FLASH;
    const out = await pool.getAmountOut(await flashToken.getAddress(), input);
    expect(out).to.be.greaterThan(0n);
  });

  it("swaps FLASH for mUSDC", async function () {
    const amountIn = 100n * ONE_FLASH;
    const quote = await pool.getAmountOut(await flashToken.getAddress(), amountIn);

    await flashToken.connect(user).approve(await pool.getAddress(), amountIn);
    await expect(
      pool.connect(user).swapExactInput(await flashToken.getAddress(), amountIn, (quote * 99n) / 100n, user.address)
    ).to.emit(pool, "Swap");

    const userUsdcBalance = await usdc.balanceOf(user.address);
    expect(userUsdcBalance).to.equal(quote);
  });

  it("reverts swap for invalid token", async function () {
    await expect(
      pool.swapExactInput(ethers.ZeroAddress, 1n, 1n, owner.address)
    ).to.be.revertedWithCustomError(pool, "InvalidToken");
  });
});
