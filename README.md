# Flash Token (FLASH)

ERC-20 token with **ERC-3156 Flash Loan** capability. Enables uncollateralized borrowing of tokens within a single transaction.

## Features

- **Standard ERC-20** with mint/burn
- **ERC-3156 Flash Loan** (flash mint) - borrow any amount, repay + fee in same tx
- **Configurable flash fee** (default 0.1%, max 10%)
- **Max flash loan cap** for safety
- **Owner-controlled** fee and cap settings
- **ReentrancyGuard** protection
- **Custom errors** for gas efficiency
- **Events** for all state changes

## Architecture

```
FlashToken (ERC-20 + ERC-3156 Flash Lender)
  |-- transfer / approve / transferFrom
  |-- flashLoan (mint -> callback -> verify repayment -> burn)
  |-- mint / burn (owner)
  |-- setFlashFee / setMaxFlashLoan / setFeeReceiver

ExampleFlashBorrower (ERC-3156 Flash Borrower)
  |-- executeFlashLoan -> onFlashLoan callback
```

## How Flash Loans Work

1. Borrower calls `flashLoan(receiver, token, amount, data)`
2. FlashToken **mints** `amount` tokens to the receiver
3. FlashToken calls `receiver.onFlashLoan(...)` (your custom logic runs here)
4. Receiver must **approve** repayment of `amount + fee` back to FlashToken
5. FlashToken **burns** the principal and sends fee to feeReceiver
6. All in a single atomic transaction - if repayment fails, everything reverts

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests (18 test cases)
npm test

# Deploy to local Hardhat network
npm run deploy

# Deploy to BSC testnet
PRIVATE_KEY=0x... npm run deploy:testnet

# Deploy to BSC mainnet
PRIVATE_KEY=0x... npm run deploy:bsc
```

After each successful deploy, deployment metadata is written to `deployments/<network>-<chainId>.json`.

## Constructor Parameters

| Parameter | Type | Description |
|---|---|---|
| `_name` | string | Token name (e.g., "Flash Token") |
| `_symbol` | string | Token symbol (e.g., "FLASH") |
| `_initialSupply` | uint256 | Initial supply in whole tokens |
| `_flashFeeBps` | uint256 | Flash fee in basis points (10 = 0.1%) |
| `_maxFlashLoan` | uint256 | Max flash loan in whole tokens (0 = unlimited) |

## Default Deployment Config

- **Name:** Flash Token
- **Symbol:** FLASH
- **Initial Supply:** 10,000,000 tokens
- **Flash Fee:** 0.1% (10 bps)
- **Max Flash Loan:** 1,000,000 tokens per tx

## Security

- Checks-Effects-Interactions pattern
- ReentrancyGuard on flash loans
- Custom errors (gas efficient)
- Max fee cap (10%)
- Input validation on all functions

## Use Cases

- **Arbitrage** - Borrow tokens to arbitrage between DEXes
- **Liquidations** - Flash borrow to liquidate undercollateralized positions
- **Collateral Swaps** - Swap collateral types without unwinding positions
- **Self-Liquidation** - Close positions without upfront capital

## License

MIT

## Simple Wallet Connect UI

A minimal static UI is included at `frontend/index.html` with a **Connect Wallet** button.

```bash
# Serve the frontend locally (example)
npx serve frontend
```

Open the served URL in a browser with an EVM wallet extension (for example MetaMask), then click **Connect Wallet**.
