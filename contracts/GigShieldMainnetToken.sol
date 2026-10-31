// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GigShieldToken.sol";

contract GigShieldMainnetToken is IERC20 {
    string public constant name = "GigShield Mainnet Token";
    string public constant symbol = "GST";
    uint8 public constant decimals = 18;
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    error InsufficientBalance(uint256 available, uint256 required);
    error InsufficientAllowance(uint256 available, uint256 required);
    error InvalidAddress();

    constructor() {
        _mint(msg.sender, MAX_SUPPLY);
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
        _balances[account] += value;
        emit Transfer(address(0), account, value);
    }
}
