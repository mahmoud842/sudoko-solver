
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


def is_board_valid(board):
	"""Check if board has no duplicate non-zero values in rows, columns, or 3x3 boxes."""
	# Check rows
	for row in board:
		non_zero = [cell for cell in row if cell != 0]
		if len(non_zero) != len(set(non_zero)):
			return False
	
	# Check columns
	for col in range(9):
		non_zero = [board[row][col] for row in range(9) if board[row][col] != 0]
		if len(non_zero) != len(set(non_zero)):
			return False
	
	# Check 3x3 boxes
	for box_row in range(0, 9, 3):
		for box_col in range(0, 9, 3):
			non_zero = []
			for i in range(box_row, box_row + 3):
				for j in range(box_col, box_col + 3):
					if board[i][j] != 0:
						non_zero.append(board[i][j])
			if len(non_zero) != len(set(non_zero)):
				return False
	
	return True