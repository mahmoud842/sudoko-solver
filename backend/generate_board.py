import random
import copy
from backtracking import is_safe, get_number_of_solutions, get_possible_values, fill_board

EASY = 60
MEDIUM = 40
HARD = 20

def generate_random_board():
	board = [[0 for _ in range(9)] for _ in range(9)]
	fill_board(board)
	return board

def generate_puzzle(difficulty):
	# Generate a complete valid board
	complete_board = generate_random_board()
	puzzle_board = [row[:] for row in complete_board]
	
	cells = [(i, j) for i in range(9) for j in range(9)]
	random.shuffle(cells)
	
	# Remove cells until we have the desired difficulty
	cells_to_remove = 81 - difficulty
	removed = 0
	attempts_without_removal = 0
	max_attempts = len(cells)
	
	for i, j in cells:
		if removed >= cells_to_remove:
			break
		
		if attempts_without_removal > max_attempts:
			break
		
		if puzzle_board[i][j] == 0:
			continue
		
		backup = puzzle_board[i][j]
		puzzle_board[i][j] = 0
		
		possible = get_possible_values(puzzle_board, i, j)
		if len(possible) == 1:
			removed += 1
			attempts_without_removal = 0
			continue
		
		# Check if it still has exactly one solution
		board_copy = copy.deepcopy(puzzle_board)
		num_solutions = get_number_of_solutions(board_copy, 0, 0, 2)
		
		if num_solutions == 1:
			removed += 1
			attempts_without_removal = 0
		else:
			# Restore if not unique
			puzzle_board[i][j] = backup
			attempts_without_removal += 1
	
	return puzzle_board


if __name__ == '__main__':
	board = generate_puzzle(HARD)
	for row in board:
		print(row)