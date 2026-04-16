# FLASH Swap dApp (MetaMask + UI + Swap Logic)

Full-stack EVM sample project containing:
- Solidity contracts (token + swap pool)
- Hardhat deploy/testing scripts
- Browser UI for MetaMask wallet connect + swap execution

## Stack
- **Contracts:** Solidity `0.8.20`
- **Dev tooling:** Hardhat + Ethers v6
- **Frontend:** Plain HTML/CSS/JS + Ethers browser provider

## Folder Structure

```text
flash-token/
├── contracts/
│   ├── FlashToken.sol          # ERC-20 + ERC-3156 flash-loan token (FLASH)
│   ├── MockERC20.sol           # Mock USDC token for swap pair
│   └── SimpleSwapPool.sol      # Constant-product AMM pool (FLASH/mUSDC)
├── scripts/
│   └── deploy.js               # Deploy all contracts + seed liquidity + output config
├── test/
│   ├── FlashToken.test.js      # Token + flash-loan test coverage
│   └── SimpleSwapPool.test.js  # Swap pool tests
├── frontend/
│   ├── index.html              # Swap UI
│   ├── app.js                  # MetaMask connect + quote + approve + swap logic
│   ├── config.example.js       # Frontend config template
│   └── config.js               # Local addresses (you create this file)
├── deployments/                # Auto-generated deployment metadata
├── hardhat.config.js
├── package.json
└── README.md
```

## Contracts Overview

### 1) `FlashToken.sol`
- ERC-20 token named FLASH
- ERC-3156 flash-loan (flash mint)
- Owner controls flash fee and max flash-loan amount

### 2) `MockERC20.sol`
- Minimal mintable ERC-20
- Used as **mUSDC** quote asset in the swap UI

### 3) `SimpleSwapPool.sol`
- Pair contract with reserves for token0/token1
- Constant-product formula (`x * y = k`)
- 0.30% fee (`FEE_BPS = 30`)
- `getAmountOut(tokenIn, amountIn)` for quotes
- `swapExactInput(tokenIn, amountIn, minAmountOut, recipient)` for swaps

## Run Locally

```bash
npm install
npm run compile
npm test
npm run deploy
```

`npm run deploy` writes deployment JSON:
- `deployments/<network>-<chainId>.json`

It includes a `frontendConfig` object used by the UI.

## Configure Frontend

1. Copy template:
```bash
cp frontend/config.example.js frontend/config.js
```

2. Open `deployments/hardhat-31337.json` (or your network file) and copy values from `frontendConfig` into `frontend/config.js`.

3. Serve frontend:
```bash
npx serve frontend
```

4. Open browser with MetaMask and connect.

> For Hardhat local chain, run a local node and import one test account private key into MetaMask.

## Swap Flow in UI

1. Connect MetaMask
2. Enter FLASH amount
3. UI reads on-chain quote (`getAmountOut`)
4. If needed, app sends `approve()` for FLASH
5. App submits `swapExactInput()` with 0.5% slippage buffer
6. Balances and pool reserves refresh

## Security Notes
- This is a learning/reference implementation, not production audited.
- No LP token accounting in this minimal pool.
- Use audited router/pool architecture before mainnet.

## License
MIT
