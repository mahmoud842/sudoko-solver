
def validate_board(board):
	if not isinstance(board, list) or len(board) != 9:
		return False
	for row in board:
		if not isinstance(row, list) or len(row) != 9:
			return False
		for cell in row:
			if not isinstance(cell, int) or cell < 0 or cell > 9:
				return False
	return True