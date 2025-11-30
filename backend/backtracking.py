import copy
import random

def solvable(board, i = 0, j = 0):
    empty = find_empty_location(board, i, j)

    if not empty:
        return True
    
    row, col = empty

    for num in get_possible_values(board, row, col):
        if is_safe(board, row, col, num):
            board[row][col] = num

            if solvable(board, row, col):
                return True

            board[row][col] = 0

    return False

def get_solution(board, i = 0, j = 0):
    empty = find_empty_location(board, i, j)

    if not empty:
        return copy.deepcopy(board)
    
    row, col = empty

    for num in range(1, 10):
        if is_safe(board, row, col, num):
            board[row][col] = num
            result = get_solution(board, row, col)
            if result != None:
                return result

            board[row][col] = 0

    return None

def get_number_of_solutions(board, i = 0, j = 0, max_solutions=2):
    empty = find_empty_location(board, i, j)

    if not empty:
        return 1
    
    row, col = empty
    count = 0

    for num in range(1, 10):
        if is_safe(board, row, col, num):
            board[row][col] = num

            count += get_number_of_solutions(board, row, col, max_solutions)
            
            board[row][col] = 0
            
            if count >= max_solutions:
                return count

    return count

def find_empty_location(board, start_i = 0, start_j = 0):
    for j in range(start_j, 9):
        if board[start_i][j] == 0:
            return (start_i, j)
        
    for i in range(start_i + 1, 9):
        for j in range(9):
            if board[i][j] == 0:
                return (i, j)
            
    return None

def get_possible_values(board, row, col):
    if board[row][col] != 0:
        return []
    
    taken = set()
    for x in range(9):
        if board[row][x] != 0:
            taken.add(board[row][x])
        if board[x][col] != 0:
            taken.add(board[x][col])

    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[i + start_row][j + start_col] != 0:
                taken.add(board[i + start_row][j + start_col])

    possible = []
    for num in range(1, 10):   
        if num not in taken:
            possible.append(num)
    
    return possible

def is_safe(board, row, col, num):
    # Check row
    for x in range(9):
        if board[row][x] == num:
            return False

    # Check column
    for x in range(9):
        if board[x][col] == num:
            return False

    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[i + start_row][j + start_col] == num:
                return False

    return True

def fill_board(board):
    empty = find_empty_location(board, 0, 0)

    if not empty:
        return True
    
    row, col = empty

    candidates = list(range(1, 10))
    random.shuffle(candidates)

    for num in candidates:
        if is_safe(board, row, col, num):
            board[row][col] = num

            if fill_board(board):
                return True

            board[row][col] = 0

    return False