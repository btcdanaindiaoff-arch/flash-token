const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying FlashToken with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");

  const TOKEN_NAME = "Flash Token";
  const TOKEN_SYMBOL = "FLASH";
  const INITIAL_SUPPLY = 10_000_000;
  const FLASH_FEE_BPS = 10;
  const MAX_FLASH_LOAN = 1_000_000;

  console.log("\nDeploying FlashToken...");
  const FlashToken = await ethers.getContractFactory("FlashToken");
  const flashToken = await FlashToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY, FLASH_FEE_BPS, MAX_FLASH_LOAN);
  await flashToken.waitForDeployment();
  const tokenAddress = await flashToken.getAddress();
  console.log("FlashToken deployed to:", tokenAddress);

  console.log("\nDeploying ExampleFlashBorrower...");
  const Borrower = await ethers.getContractFactory("ExampleFlashBorrower");
  const borrower = await Borrower.deploy();
  await borrower.waitForDeployment();
  const borrowerAddress = await borrower.getAddress();
  console.log("ExampleFlashBorrower deployed to:", borrowerAddress);

  console.log("\n========================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log("Network:           ", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:          ", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("FlashToken:        ", tokenAddress);
  console.log("ExampleBorrower:   ", borrowerAddress);
  console.log("Token Name:        ", TOKEN_NAME);
  console.log("Token Symbol:      ", TOKEN_SYMBOL);
  console.log("Initial Supply:    ", INITIAL_SUPPLY.toLocaleString(), "tokens");
  console.log("Flash Fee:         ", FLASH_FEE_BPS / 100, "%");
  console.log("Max Flash Loan:    ", MAX_FLASH_LOAN.toLocaleString(), "tokens");
  console.log("========================================");

  const fs = require("fs");
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    flashToken: tokenAddress,
    exampleBorrower: borrowerAddress,
    config: { name: TOKEN_NAME, symbol: TOKEN_SYMBOL, initialSupply: INITIAL_SUPPLY, flashFeeBps: FLASH_FEE_BPS, maxFlashLoan: MAX_FLASH_LOAN },
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
