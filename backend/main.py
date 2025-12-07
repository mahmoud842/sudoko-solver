
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import copy

import backtracking
import solver
from validation import validate_board, is_board_valid
from generate_board import generate_puzzle, EASY, MEDIUM, HARD

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/api/validate', methods=['POST'])
def api_validate():
	data = request.get_json(force=True, silent=True)
	if not data or 'board' not in data:
		return jsonify({'error': 'Missing "board" in JSON payload'}), 400

	board = data['board']
	
	start = time.perf_counter()
	is_valid = validate_board(board)
	end = time.perf_counter()
	time_taken = (end - start) * 1000

	return jsonify({
		'valid': is_valid,
		'time_taken_ms': time_taken
	})


@app.route('/api/solvable', methods=['POST'])
def api_solvable():
	data = request.get_json(force=True, silent=True)
	if not data or 'board' not in data:
		return jsonify({'error': 'Missing "board" in JSON payload'}), 400

	board = data['board']
	if not validate_board(board):
		return jsonify({'error': 'Invalid board format. Must be 9x9 array of integers 0-9.'}), 400

	if not is_board_valid(board):
		return jsonify({'error': 'Invalid board: duplicate values found in row, column, or box.'}), 400

	time_to_check_solvable = 0
	time_to_get_solutions = 0
	solvable = False
	count_solutions = 0

	start = time.perf_counter()
	solvable = backtracking.solvable(copy.deepcopy(board))
	end = time.perf_counter()
	time_to_check_solvable = (end - start) * 1000
	
	if solvable:
		start = time.perf_counter()
		count_solutions = backtracking.get_number_of_solutions(copy.deepcopy(board))
		end = time.perf_counter()
		time_to_get_solutions = (end - start) * 1000

	return jsonify({
		'solvable': bool(solvable),
		'number_of_solutions': count_solutions,
		'time_to_check_solvable': time_to_check_solvable,
		'time_to_get_solutions': time_to_get_solutions,
	})


@app.route('/api/solve/backtracking', methods=['POST'])
def api_solve():
	data = request.get_json(force=True, silent=True)
	if not data or 'board' not in data:
		return jsonify({'error': 'Missing "board" in JSON payload'}), 400

	board = data['board']
	if not validate_board(board):
		return jsonify({'error': 'Invalid board format. Must be 9x9 array of integers 0-9.'}), 400

	board_copy = copy.deepcopy(board)
	
	start = time.perf_counter()
	solution = backtracking.get_solution(board_copy)
	end = time.perf_counter()
	time_taken = (end - start) * 1000
	print(time_taken)
	return jsonify({
		'solution': solution,
		'time_taken_ms': time_taken
	})


@app.route('/api/solve/arc-backtracking', methods=['POST'])
def api_solve_arc_backtracking():
	data = request.get_json(force=True, silent=True)
	if not data or 'board' not in data:
		return jsonify({'error': 'Missing "board" in JSON payload'}), 400

	board = data['board']
	if not validate_board(board):
		return jsonify({'error': 'Invalid board format. Must be 9x9 array of integers 0-9.'}), 400

	board_copy = copy.deepcopy(board)
	
	start = time.perf_counter()
	solution, steps, solvable = solver.solve(board_copy)
	end = time.perf_counter()
	time_taken = (end - start) * 1000

	return jsonify({
		'solution': solution,
		'solvable': solvable,
		'steps': steps,
		'num_steps': len(steps),
		'time_taken_ms': time_taken
	})

def countFilled(board):
	c = 0
	for i in range(0,9):
		for j in range(0, 9):
			if (board[i][j] != 0):
				c += 1
	return c

@app.route('/api/generate', methods=['POST'])
def api_generate():
	data = request.get_json(force=True, silent=True)
	if not data or 'difficulty' not in data:
		return jsonify({'error': 'Missing "difficulty" in JSON payload'}), 400

	difficulty = data['difficulty']
	
	# Map difficulty names or use numeric values directly
	difficulty_map = {
		'easy': EASY,
		'medium': MEDIUM,
		'hard': HARD
	}
	
	if isinstance(difficulty, str):
		if difficulty.lower() not in difficulty_map:
			return jsonify({'error': 'Invalid difficulty. Use "easy", "medium", "hard" or a number (20-81)'}), 400
		filled_cells = difficulty_map[difficulty.lower()]
	else:
		filled_cells = int(difficulty)
		if filled_cells < 17 or filled_cells > 81:
			return jsonify({'error': 'Difficulty must be between 17 and 81'}), 400
	
	start = time.perf_counter()
	print(filled_cells)
	board = generate_puzzle(filled_cells)
	print(countFilled(board))
	end = time.perf_counter()
	time_taken = (end - start) * 1000

	return jsonify({
		'board': board,
		'filled_cells': filled_cells,
		'time_taken_ms': time_taken
	})


if __name__ == '__main__':
	# When running directly, start the Flask dev server
    app.run(host='0.0.0.0', port=8080, debug=True)

def countFilled(board):
	c = 0
	for i in range(0,9):
		for j in range(0, 9):
			if (board[i][j] != 0):
				c += 1
	return c

