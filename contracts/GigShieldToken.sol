// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GigShieldToken (GST)
 * @notice Standard ERC-20 demo token used for micro-insurance premiums and claim payouts in GigShield.
 *
 * IMPORTANT BUILDATHON DISCLAIMER:
 * GST is a simulated test token for demonstration on MST Blockchain Testnet.
 * It has NO real-world financial value and is NOT convertible to real currency or assets.
 */
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract GigShieldToken is IERC20 {
    string public constant name = "GigShield Test Token";
    string public constant symbol = "GST";
    uint8 public constant decimals = 18;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    address public owner;
    uint256 public constant FAUCET_AMOUNT = 500 * 10**18; // 500 GST per faucet request

    event TokensMinted(address indexed recipient, uint256 amount);
    event FaucetDispensed(address indexed rider, uint256 amount);

    error Unauthorized();
    error InsufficientBalance(uint256 available, uint256 required);
    error InsufficientAllowance(uint256 available, uint256 required);
    error InvalidAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        // Mint initial supply of 1,000,000 GST to deployer for pool liquidity & demo
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) external override returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function allowance(address accountOwner, address spender) external view override returns (uint256) {
        return _allowances[accountOwner][spender];
    }

    function approve(address spender, uint256 value) external override returns (bool) {
        if (spender == address(0)) revert InvalidAddress();
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) revert InsufficientAllowance(currentAllowance, value);
            unchecked {
                _allowances[from][msg.sender] = currentAllowance - value;
            }
        }
        _transfer(from, to, value);
        return true;
    }

    /**
     * @notice Demo faucet for gig riders to receive GST test tokens for buildathon demonstrations.
     * @param to Address of the rider requesting test tokens.
     */
    function requestDemoTokens(address to) external {
        if (to == address(0)) revert InvalidAddress();
        _mint(to, FAUCET_AMOUNT);
        emit FaucetDispensed(to, FAUCET_AMOUNT);
    }

    /**
     * @notice Controlled minting for testing and pool seeding by contract owner.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0) || to == address(0)) revert InvalidAddress();
        uint256 fromBalance = _balances[from];
        if (fromBalance < value) revert InsufficientBalance(fromBalance, value);
        unchecked {
            _balances[from] = fromBalance - value;
            _balances[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _mint(address account, uint256 value) internal {
        if (account == address(0)) revert InvalidAddress();
        _totalSupply += value;
        unchecked {
            _balances[account] += value;
        }
        emit Transfer(address(0), account, value);
    }
}

