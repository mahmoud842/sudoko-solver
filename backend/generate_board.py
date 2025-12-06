import random
import copy
from backtracking import is_safe, get_number_of_solutions, get_possible_values, fill_board

EASY = 60
MEDIUM = 40
HARD = 30

def generate_random_board():
	board = [[0 for _ in range(9)] for _ in range(9)]
	fill_board(board)
	return board

def generate_puzzle(difficulty):
	complete_board = generate_random_board()
	result_board = copy.deepcopy(complete_board)
	
	cells = [(i, j) for i in range(9) for j in range(9)]
	random.shuffle(cells)
	
	cells_to_remove = 81 - difficulty
	removed = 0
	cell_index = 0
	
	while cell_index < len(cells) and removed < cells_to_remove:
		i, j = cells[cell_index]
		cell_index += 1
		
		result_board[i][j] = 0
		
		board_copy = copy.deepcopy(result_board)
		num_solutions = get_number_of_solutions(board_copy, 0, 0, 2)
		
		if num_solutions == 1:
			removed += 1
		else:
			result_board[i][j] = complete_board[i][j]
	
	return result_board


if __name__ == '__main__':
	board = generate_puzzle(HARD)
	for row in board:
		print(row)