import copy


def create_board() -> list[list[int]]:
    return [[0] * 7 for _ in range(6)]


def get_valid_moves(board: list[list[int]]) -> list[int]:
    return [col for col in range(7) if board[0][col] == 0]


def make_move(board: list[list[int]], col: int, player: int) -> list[list[int]]:
    if col < 0 or col > 6:
        raise ValueError(f"Column {col} is out of range (0-6)")
    if board[0][col] != 0:
        raise ValueError(f"Column {col} is full")
    new_board = copy.deepcopy(board)
    for row in range(5, -1, -1):
        if new_board[row][col] == 0:
            new_board[row][col] = player
            return new_board
    raise ValueError(f"Column {col} is full")


def check_winner(board: list[list[int]]) -> int | None:
    # Check horizontal
    for row in range(6):
        for col in range(4):
            val = board[row][col]
            if val != 0 and all(board[row][col + i] == val for i in range(4)):
                return val

    # Check vertical
    for row in range(3):
        for col in range(7):
            val = board[row][col]
            if val != 0 and all(board[row + i][col] == val for i in range(4)):
                return val

    # Check diagonal (down-right)
    for row in range(3):
        for col in range(4):
            val = board[row][col]
            if val != 0 and all(board[row + i][col + i] == val for i in range(4)):
                return val

    # Check diagonal (down-left)
    for row in range(3):
        for col in range(3, 7):
            val = board[row][col]
            if val != 0 and all(board[row + i][col - i] == val for i in range(4)):
                return val

    # Draw: board full, no winner
    if all(board[0][col] != 0 for col in range(7)):
        return 0

    return None


def board_to_string(
    board: list[list[int]],
    player_labels: dict[int, str] | None = None,
) -> str:
    labels = {1: "X", 2: "O", 0: "."}
    if player_labels:
        labels.update(player_labels)

    header = " ".join(str(c) for c in range(7))
    rows = []
    for row in board:
        rows.append(" ".join(labels.get(cell, "?") for cell in row))
    return header + "\n" + "\n".join(rows)
