// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Like {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SimpleSwapPool {
    IERC20Like public immutable token0;
    IERC20Like public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;

    uint256 public constant FEE_BPS = 30;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 reserve0, uint256 reserve1);
    event Swap(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 amountOut, address indexed recipient);

    error ZeroAddress();
    error IdenticalTokens();
    error InvalidToken();
    error ZeroAmount();
    error InsufficientOutputAmount();
    error TransferFailed();

    constructor(address _token0, address _token1) {
        if (_token0 == address(0) || _token1 == address(0)) revert ZeroAddress();
        if (_token0 == _token1) revert IdenticalTokens();
        token0 = IERC20Like(_token0);
        token1 = IERC20Like(_token1);
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external {
        if (amount0 == 0 || amount1 == 0) revert ZeroAmount();

        _safeTransferFrom(token0, msg.sender, address(this), amount0);
        _safeTransferFrom(token1, msg.sender, address(this), amount1);

        reserve0 += amount0;
        reserve1 += amount1;

        emit LiquidityAdded(msg.sender, amount0, amount1, reserve0, reserve1);
    }

    function getAmountOut(address tokenIn, uint256 amountIn) public view returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();

        bool isToken0In = tokenIn == address(token0);
        bool isToken1In = tokenIn == address(token1);
        if (!isToken0In && !isToken1In) revert InvalidToken();

        uint256 reserveIn = isToken0In ? reserve0 : reserve1;
        uint256 reserveOut = isToken0In ? reserve1 : reserve0;

        if (reserveIn == 0 || reserveOut == 0) revert InsufficientOutputAmount();

        uint256 amountInWithFee = amountIn * (BPS_DENOMINATOR - FEE_BPS);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * BPS_DENOMINATOR) + amountInWithFee;

        amountOut = numerator / denominator;
        if (amountOut == 0) revert InsufficientOutputAmount();
    }

    function swapExactInput(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        if (recipient == address(0)) revert ZeroAddress();

        bool isToken0In = tokenIn == address(token0);
        bool isToken1In = tokenIn == address(token1);
        if (!isToken0In && !isToken1In) revert InvalidToken();

        amountOut = getAmountOut(tokenIn, amountIn);
        if (amountOut < minAmountOut) revert InsufficientOutputAmount();

        IERC20Like inputToken = isToken0In ? token0 : token1;
        IERC20Like outputToken = isToken0In ? token1 : token0;

        _safeTransferFrom(inputToken, msg.sender, address(this), amountIn);
        _safeTransfer(outputToken, recipient, amountOut);

        if (isToken0In) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        emit Swap(msg.sender, tokenIn, amountIn, amountOut, recipient);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    function _safeTransferFrom(IERC20Like token, address from, address to, uint256 amount) internal {
        bool ok = token.transferFrom(from, to, amount);
        if (!ok) revert TransferFailed();
    }

    function _safeTransfer(IERC20Like token, address to, uint256 amount) internal {
        bool ok = token.transfer(to, amount);
        if (!ok) revert TransferFailed();
    }
}
