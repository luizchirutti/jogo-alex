import random
import math

SYMBOLS = {
    'coin': 1.2,
    'lantern': 1.8,
    'red': 2.5,
    'jade': 3.4,
    'gold': 5.2,
    'tiger': 9.5,
    'bonus': 12
}

REEL_WEIGHTS = [
    {'coin': 32, 'lantern': 27, 'red': 22, 'jade': 18, 'gold': 13, 'tiger': 12, 'bonus': 8},
    {'coin': 30, 'lantern': 26, 'red': 23, 'jade': 17, 'gold': 15, 'tiger': 11, 'bonus': 9},
    {'coin': 28, 'lantern': 24, 'red': 22, 'jade': 19, 'gold': 16, 'tiger': 10, 'bonus': 11},
]

winning_lines = [
    [0, 0, 0],
    [1, 1, 1],
    [2, 2, 2],
    [0, 1, 2],
    [2, 1, 0],
]


def build_pool(weights):
    pool = []
    for symbol, weight in weights.items():
        pool.extend([symbol] * weight)
    return pool


def pick_symbol(weights):
    pool = build_pool(weights)
    return random.choice(pool)


def symbol_count(items):
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def line_score(line, bet):
    counts = symbol_count(line)
    tiger_count = counts.get('tiger', 0)
    non_tiger = [(symbol, count) for symbol, count in counts.items() if symbol != 'tiger']
    if not non_tiger:
        return bet * SYMBOLS['tiger'] * 1.5
    symbol, count = sorted(non_tiger, key=lambda item: item[1], reverse=True)[0]
    total_matching = count + tiger_count
    if total_matching < 3:
        return 0
    return bet * SYMBOLS[symbol] * (1 + max(0, total_matching - 3) * 0.7)


def evaluate(reels, bet):
    total = 0
    for positions in winning_lines:
        line = [reels[col][row] for col, row in enumerate(positions)]
        total += line_score(line, bet)
    return total


def respin_if_needed(reels):
    board = [list(reel) for reel in reels]
    multiplier = 1
    for _ in range(8):
        if not any('tiger' in reel for reel in board):
            break
        locked = [idx for idx, reel in enumerate(board) if 'tiger' in reel]
        tiger_hits = sum(reel.count('tiger') for reel in [board[i] for i in locked])
        multiplier = min(multiplier + tiger_hits, 10)
        for reel_index in range(3):
            if reel_index in locked:
                continue
            board[reel_index] = [pick_symbol(REEL_WEIGHTS[reel_index]) for _ in range(3)]
        if not any('tiger' in reel for reel in board):
            break
    return board, multiplier


def spin(bet):
    reels = [
        [pick_symbol(REEL_WEIGHTS[reel]) for _ in range(3)]
        for reel in range(3)
    ]
    multiplier = 1
    if any('tiger' in reel for reel in reels):
        reels, multiplier = respin_if_needed(reels)
    win = evaluate(reels, bet) * multiplier
    return min(win, bet * 2500)


TOTAL_SPINS = 10_000_000
BET = 1
total_payout = 0.0

for _ in range(TOTAL_SPINS):
    total_payout += spin(BET)

rtp = total_payout / (TOTAL_SPINS * BET)
print(f'TOTAL_SPINS={TOTAL_SPINS}')
print(f'TOTAL_PAYOUT={total_payout:.2f}')
print(f'RTP={rtp:.6f}')
print(f'TARGET={0.968:.6f}')
print('PASS' if abs(rtp - 0.968) <= 0.03 else 'FAIL')
