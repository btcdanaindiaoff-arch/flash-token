const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = network.chainId.toString();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const TOKEN_NAME = "Flash Token";
  const TOKEN_SYMBOL = "FLASH";
  const INITIAL_SUPPLY = 10_000_000;
  const FLASH_FEE_BPS = 10;
  const MAX_FLASH_LOAN = 1_000_000;

  console.log("\n1) Deploying FlashToken...");
  const FlashToken = await ethers.getContractFactory("FlashToken");
  const flashToken = await FlashToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY, FLASH_FEE_BPS, MAX_FLASH_LOAN);
  await flashToken.waitForDeployment();
  const flashTokenAddress = await flashToken.getAddress();
  console.log("FlashToken:", flashTokenAddress);

  console.log("\n2) Deploying ExampleFlashBorrower...");
  const Borrower = await ethers.getContractFactory("ExampleFlashBorrower");
  const borrower = await Borrower.deploy();
  await borrower.waitForDeployment();
  const borrowerAddress = await borrower.getAddress();
  console.log("ExampleFlashBorrower:", borrowerAddress);

  console.log("\n3) Deploying Mock USDC...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUsdc = await MockERC20.deploy("Mock USD Coin", "mUSDC", 6);
  await mockUsdc.waitForDeployment();
  const mockUsdcAddress = await mockUsdc.getAddress();
  console.log("Mock USDC:", mockUsdcAddress);

  console.log("\n4) Deploying SimpleSwapPool...");
  const SimpleSwapPool = await ethers.getContractFactory("SimpleSwapPool");
  const pool = await SimpleSwapPool.deploy(flashTokenAddress, mockUsdcAddress);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("SimpleSwapPool:", poolAddress);

  console.log("\n5) Seeding pool liquidity...");
  const flashLiquidity = ethers.parseUnits("500000", 18);
  const usdcLiquidity = ethers.parseUnits("1000000", 6);

  await (await mockUsdc.mint(deployer.address, usdcLiquidity)).wait();
  await (await flashToken.approve(poolAddress, flashLiquidity)).wait();
  await (await mockUsdc.approve(poolAddress, usdcLiquidity)).wait();
  await (await pool.addLiquidity(flashLiquidity, usdcLiquidity)).wait();

  console.log("Pool seeded with 500,000 FLASH and 1,000,000 mUSDC");

  const deploymentDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentDir, { recursive: true });
  const deploymentFile = path.join(deploymentDir, `${networkName}-${chainId}.json`);

  const deploymentInfo = {
    network: networkName,
    chainId,
    deployer: deployer.address,
    contracts: {
      flashToken: flashTokenAddress,
      exampleBorrower: borrowerAddress,
      mockUsdc: mockUsdcAddress,
      simpleSwapPool: poolAddress,
    },
    frontendConfig: {
      chainId: Number(chainId),
      tokenInAddress: flashTokenAddress,
      tokenOutAddress: mockUsdcAddress,
      swapPoolAddress: poolAddress,
    },
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment file generated: ${deploymentFile}`);
  console.log("Copy frontendConfig values into frontend/config.js");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
