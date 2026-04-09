const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletStatus = document.getElementById('walletStatus');

const formatAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

const setWalletStatus = (message, isError = false) => {
  walletStatus.textContent = message;
  walletStatus.style.color = isError ? '#fca5a5' : '#e2e8f0';
};

const setConnectedState = (address) => {
  connectWalletBtn.textContent = 'Wallet Connected';
  connectWalletBtn.disabled = true;
  setWalletStatus(`Connected: ${formatAddress(address)}`);
};

const connectWallet = async () => {
  if (!window.ethereum) {
    setWalletStatus('No EVM wallet detected. Install MetaMask or another wallet extension.', true);
    return;
  }

  try {
    connectWalletBtn.disabled = true;
    connectWalletBtn.textContent = 'Connecting...';

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const [account] = accounts;

    if (!account) {
      setWalletStatus('No account was returned by your wallet.', true);
      connectWalletBtn.disabled = false;
      connectWalletBtn.textContent = 'Connect Wallet';
      return;
    }

    setConnectedState(account);
  } catch (error) {
    const userRejected = error && error.code === 4001;
    setWalletStatus(
      userRejected
        ? 'Wallet connection request was rejected.'
        : `Failed to connect wallet: ${error.message || 'Unknown error'}`,
      true
    );

    connectWalletBtn.disabled = false;
    connectWalletBtn.textContent = 'Connect Wallet';
  }
};

connectWalletBtn.addEventListener('click', connectWallet);

if (window.ethereum) {
  window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
    if (accounts.length > 0) {
      setConnectedState(accounts[0]);
    }
  });

  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      connectWalletBtn.textContent = 'Connect Wallet';
      connectWalletBtn.disabled = false;
      setWalletStatus('Wallet disconnected.');
      return;
    }

    setConnectedState(accounts[0]);
  });
}
