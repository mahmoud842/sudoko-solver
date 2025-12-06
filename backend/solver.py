
import copy

from backtracking import *
from arc import arc


def _find_best_empty_cell(board):
    """Return empty cell with the fewest legal options (row, col, options)."""
    best_cell = None
    best_options = None

    for i in range(9):
        for j in range(9):
            if board[i][j] != 0:
                continue

            options = get_possible_values(board, i, j)
            if best_cell is None or len(options) < len(best_options):
                best_cell = (i, j)
                best_options = options
                if len(best_options) == 1:
                    return best_cell, best_options

    return best_cell, best_options or []


def _apply_arc(board, steps):
    """Run arc consistency, append its steps, and report status."""
    arc_board, domains, arc_steps_raw, arc_ok, arc_complete = arc(board)
    steps.extend(
        [{"type": "arc", "from": s["from"], "to": s["to"], "value": s["value"]} for s in arc_steps_raw]
    )
    return arc_board, domains, arc_ok, arc_complete


def _find_best_cell_from_domains(board, domains):
    """Find empty cell with smallest domain size."""
    best_cell = None
    best_domain = None
    
    for i in range(9):
        for j in range(9):
            if board[i][j] != 0:
                continue
            
            domain = domains[i][j]
            if len(domain) == 0:
                continue
                
            if best_cell is None or len(domain) < len(best_domain):
                best_cell = (i, j)
                best_domain = domain
                if len(best_domain) == 1:
                    return best_cell, list(best_domain)
    
    if best_cell is None:
        return None, []
    return best_cell, list(best_domain)


def _backtrack_with_steps(board, steps):
    """Backtracking search that re-applies arc consistency each recursion."""
    board, domains, arc_ok, arc_complete = _apply_arc(board, steps)
    if not arc_ok:
        return False, board
    if arc_complete:
        return True, board

    cell, options = _find_best_cell_from_domains(board, domains)
    if cell is None:
        return True, board

    row, col = cell
    for num in options:
        if not is_safe(board, row, col, num):
            continue

        next_board = copy.deepcopy(board)
        next_board[row][col] = num
        steps.append({"type": "backtrack_assign", "cell": (row, col), "value": num})

        solved, solved_board = _backtrack_with_steps(next_board, steps)
        if solved:
            return True, solved_board

        steps.append({"type": "backtrack_revert", "cell": (row, col), "value": num})

    return False, board


def solve(board):
    working_board = copy.deepcopy(board)
    steps = []

    solved, solution_board = _backtrack_with_steps(working_board, steps)

    if not solved:
        return None, steps, False

    return solution_board, steps, True