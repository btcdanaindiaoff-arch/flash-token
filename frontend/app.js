const connectBtn = document.getElementById("connectBtn");
const amountInInput = document.getElementById("amountIn");
const amountOutInput = document.getElementById("amountOut");
const swapBtn = document.getElementById("swapBtn");
const statusEl = document.getElementById("status");
const poolInfoEl = document.getElementById("poolInfo");
const balanceInEl = document.getElementById("balanceIn");
const balanceOutEl = document.getElementById("balanceOut");

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)",
];

const SWAP_POOL_ABI = [
  "function getAmountOut(address tokenIn, uint256 amountIn) view returns (uint256)",
  "function swapExactInput(address tokenIn, uint256 amountIn, uint256 minAmountOut, address recipient) returns (uint256)",
  "function getReserves() view returns (uint256 reserve0, uint256 reserve1)",
];

let provider;
let signer;
let user;
let tokenIn;
let tokenOut;
let pool;
let tokenInDecimals = 18;
let tokenOutDecimals = 6;

const formatAddr = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? "status error" : "status";
}

function readConfig() {
  if (!window.APP_CONFIG) {
    throw new Error("Missing config.js. Copy frontend/config.example.js to frontend/config.js and fill addresses.");
  }
  return window.APP_CONFIG;
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus("MetaMask not found. Install MetaMask extension.", true);
    return;
  }

  const config = readConfig();

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  user = await signer.getAddress();

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== Number(config.chainId)) {
    setStatus(`Wrong network. Switch MetaMask to chainId ${config.chainId}.`, true);
    return;
  }

  tokenIn = new ethers.Contract(config.tokenInAddress, ERC20_ABI, signer);
  tokenOut = new ethers.Contract(config.tokenOutAddress, ERC20_ABI, signer);
  pool = new ethers.Contract(config.swapPoolAddress, SWAP_POOL_ABI, signer);

  tokenInDecimals = await tokenIn.decimals();
  tokenOutDecimals = await tokenOut.decimals();

  connectBtn.textContent = `Connected: ${formatAddr(user)}`;
  connectBtn.disabled = true;
  await refreshUi();
  setStatus("Wallet connected. Ready to swap.");
}

async function refreshUi() {
  if (!user || !tokenIn || !tokenOut || !pool) return;

  const [inBal, outBal, reserves] = await Promise.all([
    tokenIn.balanceOf(user),
    tokenOut.balanceOf(user),
    pool.getReserves(),
  ]);

  balanceInEl.textContent = `Balance: ${Number(ethers.formatUnits(inBal, tokenInDecimals)).toFixed(4)} FLASH`;
  balanceOutEl.textContent = `Balance: ${Number(ethers.formatUnits(outBal, tokenOutDecimals)).toFixed(2)} mUSDC`;
  poolInfoEl.textContent = `Pool reserves: ${Number(ethers.formatUnits(reserves[0], tokenInDecimals)).toFixed(2)} FLASH / ${Number(ethers.formatUnits(reserves[1], tokenOutDecimals)).toFixed(2)} mUSDC`;
}

async function previewAmountOut() {
  if (!pool || !tokenIn) return;
  const raw = amountInInput.value.trim();
  if (!raw || Number(raw) <= 0) {
    amountOutInput.value = "";
    return;
  }

  try {
    const amountIn = ethers.parseUnits(raw, tokenInDecimals);
    const out = await pool.getAmountOut(await tokenIn.getAddress(), amountIn);
    amountOutInput.value = Number(ethers.formatUnits(out, tokenOutDecimals)).toFixed(6);
  } catch {
    amountOutInput.value = "";
  }
}

async function swap() {
  try {
    if (!user || !tokenIn || !pool) {
      setStatus("Connect wallet first.", true);
      return;
    }

    const raw = amountInInput.value.trim();
    if (!raw || Number(raw) <= 0) {
      setStatus("Enter a valid input amount.", true);
      return;
    }

    swapBtn.disabled = true;
    setStatus("Checking allowance...");

    const tokenInAddress = await tokenIn.getAddress();
    const poolAddress = await pool.getAddress();
    const amountIn = ethers.parseUnits(raw, tokenInDecimals);

    const currentAllowance = await tokenIn.allowance(user, poolAddress);
    if (currentAllowance < amountIn) {
      setStatus("Approving FLASH spend...");
      const approveTx = await tokenIn.approve(poolAddress, amountIn);
      await approveTx.wait();
    }

    setStatus("Submitting swap transaction...");
    const quoteOut = await pool.getAmountOut(tokenInAddress, amountIn);
    const minOut = (quoteOut * 995n) / 1000n; // 0.5% slippage tolerance

    const tx = await pool.swapExactInput(tokenInAddress, amountIn, minOut, user);
    await tx.wait();

    await refreshUi();
    await previewAmountOut();
    setStatus("Swap successful.");
  } catch (error) {
    const reason = error?.shortMessage || error?.reason || error?.message || "Unknown error";
    setStatus(`Swap failed: ${reason}`, true);
  } finally {
    swapBtn.disabled = false;
  }
}

connectBtn.addEventListener("click", connectWallet);
amountInInput.addEventListener("input", previewAmountOut);
swapBtn.addEventListener("click", swap);
