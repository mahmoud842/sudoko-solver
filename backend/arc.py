
from collections import deque
from tabulate import tabulate

def arc(board : list):
    domains = [[set(range(1, 10)) for _ in range(9)] for _ in range(9)]
    assigned  = 0 
    arced = set()
    queue = deque()
    steps = []
    for i in range(9):
        for j in range(9):
            if board[i][j] != 0:
                domains[i][j] = set([board[i][j]])
                queue.append((i, j))
                assigned += 1
    while queue:
        i, j = queue.popleft()
        arced.add((i, j))
        value = board[i][j]
        ## row reduction
        for k in range(9):
            if k != j and (value in domains[i][k]):
                domains[i][k].discard(value)
                step = {
                    "from":(i,k),
                    "to":(i,j),
                    "value":value
                }
                steps.append(step)  
                if len(domains[i][k]) == 1 and (i, k) not in arced:
                    queue.append((i, k))
                    inferred_value = list(domains[i][k])[0]
                    board[i][k] = inferred_value
                    assigned += 1
                    inferred_step = {
                        "type": "arc_inferred",
                        "cell": (i, k),
                        "value": inferred_value
                    }
                    steps.append(inferred_step)
                if len(domains[i][k]) == 0:
                    return board, domains,steps, False ,True 
                
        ## col reduction
        for k in range(9):
            if k != i and value in domains[k][j]:
                domains[k][j].discard(value)
                step = {
                    "from":(k,j),
                    "to":(i,j),
                    "value":value
                }
                steps.append(step)   
                if len(domains[k][j]) == 1 and (k, j) not in arced:
                    queue.append((k, j))
                    inferred_value = list(domains[k][j])[0]
                    board[k][j] = inferred_value
                    assigned += 1
                    inferred_step = {
                        "type": "arc_inferred",
                        "cell": (k, j),
                        "value": inferred_value
                    }
                    steps.append(inferred_step)
                if len(domains[k][j]) == 0:
                    return board, domains, steps, False,True
                
        ## square reduction
        start_row = i - i % 3
        start_col = j - j % 3
        for k in range(start_row, start_row + 3):
            for l in range(start_col, start_col + 3):
                if ( k != i or l != j) and value in domains[k][l]:
                    domains[k][l].discard(value)
                    step = {
                        "from":(k,l),
                        "to":(i,j),
                        "value":value
                    }
                    steps.append(step)   
                    if len(domains[k][l]) == 1 and (k, l) not in arced:
                        queue.append((k, l))
                        inferred_value = list(domains[k][l])[0]
                        board[k][l] = inferred_value
                        assigned += 1
                        inferred_step = {
                            "type": "arc_inferred",
                            "cell": (k, l),
                            "value": inferred_value
                        }
                        steps.append(inferred_step)
                    if len(domains[k][l]) == 0:
                        return board, domains, steps, False,False

    
    return board, domains, steps, True, assigned == 81
    
    
    ## build queue of ones domain and for arcs for them with col , row, square 
    ## while doing arcs if one var has empty domain then not solvable
    ## if found var become one add it to the queue 


# def format_domain(domain_set):
#     """Format domain set for display"""
#     if len(domain_set) == 1:
#         return f"[{list(domain_set)[0]}]"
#     elif len(domain_set) == 0:
#         return "[]"
#     else:
#         sorted_vals = sorted(list(domain_set))
#         return '{' + ','.join(map(str, sorted_vals)) + '}'


# def print_board(board, title="Board"):
#     """Print board using tabulate"""
#     print(f"\n{'='*50}")
#     print(f"{title:^50}")
#     print(f"{'='*50}")
    
#     # Add separators for 3x3 boxes
#     formatted_board = []
#     for i, row in enumerate(board):
#         formatted_row = []
#         for j, val in enumerate(row):
#             if val == 0:
#                 formatted_row.append('·')
#             else:
#                 formatted_row.append(str(val))
            
#             # Add vertical separator after columns 2 and 5
#             if j in [2, 5]:
#                 formatted_row.append('|')
        
#         formatted_board.append(formatted_row)
        
#         # Add horizontal separator after rows 2 and 5
#         if i in [2, 5]:
#             formatted_board.append(['-']*11)
    
#     print(tabulate(formatted_board, tablefmt="plain"))


# def print_domains(domains, title="Domains"):
#     """Print domains using tabulate"""
#     print(f"\n{'='*50}")
#     print(f"{title:^50}")
#     print(f"{'='*50}")
    
#     formatted_domains = []
#     for i, row in enumerate(domains):
#         formatted_row = []
#         for j, domain in enumerate(row):
#             formatted_row.append(format_domain(domain))
            
#             # Add vertical separator after columns 2 and 5
#             if j in [2, 5]:
#                 formatted_row.append('|')
        
#         formatted_domains.append(formatted_row)
        
#         # Add horizontal separator after rows 2 and 5
#         if i in [2, 5]:
#             formatted_domains.append(['-'*10]*11)
    
#     print(tabulate(formatted_domains, tablefmt="plain"))


# def print_steps(steps, limit=20):
#     """Print first few steps in a formatted way"""
#     print(f"\n{'='*50}")
#     print(f"Arc Consistency Steps (showing first {limit})")
#     print(f"{'='*50}")
    
#     if len(steps) == 0:
#         print("No steps recorded.")
#         return
    
#     headers = ["Step", "From Cell", "To Cell", "Value Removed"]
#     rows = []
    
#     for idx, step in enumerate(steps[:limit], 1):
#         from_cell = f"({step['from'][0]}, {step['from'][1]})"
#         to_cell = f"({step['to'][0]}, {step['to'][1]})"
#         rows.append([idx, from_cell, to_cell, step['value']])
    
#     print(tabulate(rows, headers=headers, tablefmt="grid"))
    
#     if len(steps) > limit:
#         print(f"\n... and {len(steps) - limit} more steps")
    
#     print(f"\nTotal steps: {len(steps)}")


# def run_test(test_name, board):
#     """Run a single test case"""
#     print(f"\n\n{'#'*60}")
#     print(f"# {test_name:^56} #")
#     print(f"{'#'*60}")
    
#     # Print initial board
#     print_board(board, "Initial Board")
    
#     # Run arc consistency
#     result_board, result_domains, steps, solvable,_ = arc(board)
    
#     # Print results
#     print_board(result_board, "Board After Arc Consistency")
#     print_domains(result_domains, "Final Domains")
#     print_steps(steps, limit=30)
    
#     print(f"\n{'='*50}")
#     print(f"Solvable: {solvable}")
#     print(f"{'='*50}")


# # Test Case 1: Easy Puzzle (lots of given values)
# test1_easy = [
#     [5, 3, 0, 0, 7, 0, 0, 0, 0],
#     [6, 0, 0, 1, 9, 5, 0, 0, 0],
#     [0, 9, 8, 0, 0, 0, 0, 6, 0],
#     [8, 0, 0, 0, 6, 0, 0, 0, 3],
#     [4, 0, 0, 8, 0, 3, 0, 0, 1],
#     [7, 0, 0, 0, 2, 0, 0, 0, 6],
#     [0, 6, 0, 0, 0, 0, 2, 8, 0],
#     [0, 0, 0, 4, 1, 9, 0, 0, 5],
#     [0, 0, 0, 0, 8, 0, 0, 7, 9]
# ]

# # Test Case 2: Medium Puzzle
# test2_medium = [
#     [0, 0, 0, 2, 6, 0, 7, 0, 1],
#     [6, 8, 0, 0, 7, 0, 0, 9, 0],
#     [1, 9, 0, 0, 0, 4, 5, 0, 0],
#     [8, 2, 0, 1, 0, 0, 0, 4, 0],
#     [0, 0, 4, 6, 0, 2, 9, 0, 0],
#     [0, 5, 0, 0, 0, 3, 0, 2, 8],
#     [0, 0, 9, 3, 0, 0, 0, 7, 4],
#     [0, 4, 0, 0, 5, 0, 0, 3, 6],
#     [7, 0, 3, 0, 1, 8, 0, 0, 0]
# ]

# # Test Case 3: Hard Puzzle (fewer given values)
# test3_hard = [
#     [0, 0, 0, 0, 0, 0, 0, 0, 0],
#     [0, 0, 0, 0, 0, 3, 0, 8, 5],
#     [0, 0, 1, 0, 2, 0, 0, 0, 0],
#     [0, 0, 0, 5, 0, 7, 0, 0, 0],
#     [0, 0, 4, 0, 0, 0, 1, 0, 0],
#     [0, 9, 0, 0, 0, 0, 0, 0, 0],
#     [5, 0, 0, 0, 0, 0, 0, 7, 3],
#     [0, 0, 2, 0, 1, 0, 0, 0, 0],
#     [0, 0, 0, 0, 4, 0, 0, 0, 9]
# ]

# # Test Case 4: Nearly Complete Puzzle
# test4_nearly_complete = [
#     [5, 3, 4, 6, 7, 8, 9, 1, 2],
#     [6, 7, 2, 1, 9, 5, 3, 4, 8],
#     [1, 9, 8, 3, 4, 2, 5, 6, 7],
#     [8, 5, 9, 7, 6, 1, 4, 2, 3],
#     [4, 2, 6, 8, 5, 3, 7, 9, 1],
#     [7, 1, 3, 9, 2, 4, 8, 5, 6],
#     [9, 6, 1, 5, 3, 7, 2, 8, 4],
#     [2, 8, 7, 4, 1, 9, 6, 3, 5],
#     [3, 4, 5, 2, 8, 6, 0, 7, 9]  # Only one empty cell
# ]


# # Test Case 5: Unsolvable - Duplicate in Row
# test5_unsolvable_row = [
#     [5, 3, 0, 0, 7, 0, 0, 0, 5],  # Two 5's in same row
#     [6, 0, 0, 1, 9, 5, 0, 0, 0],
#     [0, 9, 8, 0, 0, 0, 0, 6, 0],
#     [8, 0, 0, 0, 6, 0, 0, 0, 3],
#     [4, 0, 0, 8, 0, 3, 0, 0, 1],
#     [7, 0, 0, 0, 2, 0, 0, 0, 6],
#     [0, 6, 0, 0, 0, 0, 2, 8, 0],
#     [0, 0, 0, 4, 1, 9, 0, 0, 5],
#     [0, 0, 0, 0, 8, 0, 0, 7, 9]
# ]

# # Test Case 6: Unsolvable - Duplicate in Column
# test6_unsolvable_col = [
#     [5, 3, 0, 0, 7, 0, 0, 0, 0],
#     [6, 0, 0, 1, 9, 5, 0, 0, 0],
#     [0, 9, 8, 0, 0, 0, 0, 6, 0],
#     [8, 0, 0, 0, 6, 0, 0, 0, 3],
#     [4, 0, 0, 8, 0, 3, 0, 0, 1],
#     [5, 0, 0, 0, 2, 0, 0, 0, 6],  # Another 5 in first column
#     [0, 6, 0, 0, 0, 0, 2, 8, 0],
#     [0, 0, 0, 4, 1, 9, 0, 0, 5],
#     [0, 0, 0, 0, 8, 0, 0, 7, 9]
# ]

# # Test Case 7: Unsolvable - Duplicate in 3x3 Box
# test7_unsolvable_box = [
#     [5, 3, 0, 0, 7, 0, 0, 0, 0],
#     [6, 0, 0, 1, 9, 5, 0, 0, 0],
#     [5, 9, 8, 0, 0, 0, 0, 6, 0],  # Another 5 in top-left box
#     [8, 0, 0, 0, 6, 0, 0, 0, 3],
#     [4, 0, 0, 8, 0, 3, 0, 0, 1],
#     [7, 0, 0, 0, 2, 0, 0, 0, 6],
#     [0, 6, 0, 0, 0, 0, 2, 8, 0],
#     [0, 0, 0, 4, 1, 9, 0, 0, 5],
#     [0, 0, 0, 0, 8, 0, 0, 7, 9]
# ]

# # Test Case 8: Unsolvable - Creates Empty Domain
# test8_unsolvable_domain = [
#     [1, 2, 3, 4, 5, 6, 7, 8, 0],
#     [4, 5, 6, 7, 8, 9, 1, 2, 3],
#     [7, 8, 9, 1, 2, 3, 4, 5, 6],
#     [2, 3, 4, 5, 6, 7, 8, 9, 1],
#     [5, 6, 7, 8, 9, 1, 2, 3, 4],
#     [8, 9, 1, 2, 3, 4, 5, 6, 7],
#     [3, 4, 5, 6, 7, 8, 9, 1, 2],
#     [6, 7, 8, 9, 1, 2, 3, 4, 9],
#     [9, 1, 2, 3, 4, 5, 6, 7, 8]  # Last cell in row 0 has no valid options
# ]

# # Run all tests
# run_test("Test 1: Easy Puzzle", test1_easy)
# run_test("Test 2: Medium Puzzle", test2_medium)
# run_test("Test 3: Hard Puzzle", test3_hard)
# run_test("Test 4: Nearly Complete Puzzle", test4_nearly_complete)
# print("\n\n" + "="*60)
# print("UNSOLVABLE TEST CASES")
# print("="*60)
# run_test("Test 5: Unsolvable - Duplicate in Row", test5_unsolvable_row)
# run_test("Test 6: Unsolvable - Duplicate in Column", test6_unsolvable_col)
# run_test("Test 7: Unsolvable - Duplicate in 3x3 Box", test7_unsolvable_box)
# run_test("Test 8: Unsolvable - Empty Domain", test8_unsolvable_domain)