import time
from generate_board import generate_puzzle, EASY, MEDIUM, HARD

def test_generate_n_boards(n=5, max_time_per_board=10):
	print(f"\nGenerating {n} boards with max time {max_time_per_board}s per board...")
	
	difficulties = [EASY, MEDIUM, HARD]
	
	for i in range(n):
		difficulty = difficulties[i % len(difficulties)]
		difficulty_name = ["EASY", "MEDIUM", "HARD"][i % 3]
		
		board = generate_puzzle(difficulty)
		print(f"Board {i+1}/{n} ({difficulty_name}): {difficulty} cells")
		
		# Verify board is valid
		assert board is not None, f"Board {i+1} generation returned None"
		assert len(board) == 9, f"Board {i+1} doesn't have 9 rows"
		for row in board:
			assert len(row) == 9, f"Board {i+1} has invalid row length"
			for cell in row:
				assert 0 <= cell <= 9, f"Board {i+1} has invalid cell value: {cell}"
		
		# Count filled cells
		filled = sum(1 for row in board for cell in row if cell != 0)
		assert filled == difficulty, \
			f"Board {i+1} has {filled} filled cells, expected {difficulty}"
	
	print(f"✓ All {n} boards generated successfully!\n")

if __name__ == '__main__':
	test_generate_n_boards(n=5, max_time_per_board=10)
