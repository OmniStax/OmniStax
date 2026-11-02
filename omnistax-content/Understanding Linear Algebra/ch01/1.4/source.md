# 1.4 Pivots and their influence on solution spaces {sec-pivots}

By now, we have seen several examples illustrating how the reduced row echelon matrix leads to a convenient description of the solution space to a linear system. In this section, we will use this understanding to make some general observations about how certain features of the reduced row echelon matrix reflect the nature of the solution space.

## 1.4.1 Introduction

Remember that a leading entry in a reduced row echelon matrix is the leftmost nonzero entry in a row of the matrix. As we'll see, the positions of these leading entries encode a lot of information about the solution space of the corresponding linear system. For this reason, we make the following definition.

:::definition {def:definition-1-4-1} Definition 1.4.1
{index-entry:pivot position} A *pivot position*{index:pivot position} in a matrix $A$ is the position of a leading entry in the reduced row echelon matrix of $A$.
:::

For instance, in this reduced row echelon matrix, the pivot positions are indicated in bold:

$$ \begin{bmatrix} {\mathbf 1} & \color{gray}{0} & \color{gray}{*} & \color{gray}{0} \\ \color{gray}{0} & {\mathbf 1} & \color{gray}{*} & \color{gray}{0} \\ \color{gray}{0} & \color{gray}{0} & \color{gray}{0} & {\mathbf 1} \\ \color{gray}{0} & \color{gray}{0} & \color{gray}{0} & \color{gray}{0} \\ \end{bmatrix}. $$

We can refer to pivot positions by their row and column number saying, for instance, that there is a pivot position in the third row and fourth column.

:::exploration {act:preview-1-4-1} Preview Activity 1.4.1 (Some basic observations about pivots)
PROBLEM:
a) Shown below is a matrix and its reduced row echelon form. Indicate the pivot positions.

    $$ \left[ \begin{array}{rrrr} 2 & 4 & 6 & -1 \\ -3 & 1 & 5 & 0 \\ 1 & 3 & 5 & 1 \\ \end{array} \right] \sim \left[ \begin{array}{rrrr} 1 & 0 & -1 & 0 \\ 0 & 1 & 2 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array} \right] $$

    .
b) How many pivot positions can there be in one row? In a $3\times5$ matrix, what is the largest possible number of pivot positions? Give an example of a $3\times5$ matrix that has the largest possible number of pivot positions.
c) How many pivots can there be in one column? In a $5\times3$ matrix, what is the largest possible number of pivot positions? Give an example of a $5\times3$ matrix that has the largest possible number of pivot positions.
d) Give an example of a matrix with a pivot position in every row and every column. What is special about such a matrix?
ANSWER:
a) The pivot positions are indicated below

    $$ \left[ \begin{array}{rrrr} {\mathbf 2} & 4 & 6 & -1 \\ -3 & {\mathbf 1} & 5 & 0 \\ 1 & 3 & 5 & {\mathbf 1} \\ \end{array} \right] \sim \left[ \begin{array}{rrrr} {\mathbf 1} & 0 & -1 & 0 \\ 0 & {\mathbf 1} & 2 & 0 \\ 0 & 0 & 0 & {\mathbf 1} \\ \end{array} \right]\text{.} $$

b) Three.
c) Three.
d) Such a matrix must necessarily have the same number of rows and columns, which means it is what we call a square matrix.
SOLUTION:
a) The pivot positions are indicated below

    $$ \left[ \begin{array}{rrrr} {\mathbf 2} & 4 & 6 & -1 \\ -3 & {\mathbf 1} & 5 & 0 \\ 1 & 3 & 5 & {\mathbf 1} \\ \end{array} \right] \sim \left[ \begin{array}{rrrr} {\mathbf 1} & 0 & -1 & 0 \\ 0 & {\mathbf 1} & 2 & 0 \\ 0 & 0 & 0 & {\mathbf 1} \\ \end{array} \right]\text{.} $$

b) A row contains at most one pivot position. Therefore, a $3\times 5$ matrix, which has three rows, contains at most three pivot positions. Here is an example:

    $$ \left[\begin{array}{rrrrr} 1 & 0 & 0 & -1 & 2 \\ 0 & 1 & 0 & 1 & 3 \\ 0 & 0 & 1 & 2 & 3 \\ \end{array}\right]\text{.} $$

c) A column contains at most one pivot position. Therefore, a $5\times 3$ matrix, which has three columns, contains at most three pivot positions. Here is an example

    $$ \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

d) A matrix with a pivot position in every row and every column would have the following reduced row echelon form:

    $$ \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]\text{.} $$

    Such a matrix must necessarily have the same number of rows and columns, which means it is what we call a square matrix.
:::

When we have looked at solution spaces of linear systems, we have frequently asked whether there are infinitely many solutions, exactly one solution, or no solutions. We will now break this question into two separate questions.

:::question {q:fundamental-questions} Question 1.4.2 (Two Fundamental Questions)
When we encounter a linear system, we often ask

- **Existence**: 
    Is there a solution to the linear system? If so, we say that the system is *consistent*; if not, we say it is *inconsistent*. {index-entry:consistent system} {index-entry:inconsistent system}

- **Uniqueness**: 
    If the linear system is consistent, is the solution unique or are there infinitely many solutions?

:::

These two questions represent two sides of a coin that appear in many variations throughout our explorations. In this section, we will study how the location of the pivots influence the answers to these two questions. We begin by considering the first question concerning the existence of solutions.

## 1.4.2 The existence of solutions

:::activity {act:activity-1-4-2} Activity 1.4.2

a) 
    Shown below are three augmented matrices in reduced row echelon form.

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 0 & 3 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & -2 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 2 & 3 \\ 0 & 1 & -1 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 2 & 0 \\ 0 & 1 & -1 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    For each matrix, identify the pivot positions and determine if the corresponding linear system is consistent. Explain how the location of the pivots determines whether the system is consistent or inconsistent.

b) 
    Each of the augmented matrices above has a row in which each entry is zero. What, if anything, does the presence of such a row tell us about the consistency of the corresponding linear system?

c) 
    Give an example of a $3\times5$ augmented matrix in reduced row echelon form that represents a consistent system. Indicate the pivot positions in your matrix and explain why these pivot positions guarantee a consistent system.

d) 
    Give an example of a $3\times5$ augmented matrix in reduced row echelon form that represents an inconsistent system. Indicate the pivot positions in your matrix and explain why these pivot positions guarantee an inconsistent system.

e) 
    Write the reduced row echelon form of the coefficient matrix of the corresponding linear system in [Item d](ref:li-pivots-existence)? (Remember that the [Augmentation Principle](ref:1.3#principle-augmentation-principle) says that the reduced row echelon form of the coefficient matrix simply consists of the first four columns of the augmented matrix.) What do you notice about the pivot positions in this coefficient matrix?

f) 
    Suppose we have a linear system for which the *coefficient* matrix has the following reduced row echelon form.

    $$ \left[ \begin{array}{rrrrr} 1 & 0 & 0 & 0 & -1 \\ 0 & 1 & 0 & 0 & 2 \\ 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 & -3 \\ \end{array} \right] $$

    What can you say about the consistency of the linear system?

SOLUTION:

a) 
    The pivot positions are indicated below.

    $$ \left[ \begin{array}{rrr|r} {\mathbf 1} & 0 & 0 & 3 \\ 0 & {\mathbf 1} & 0 & 0 \\ 0 & 0 & {\mathbf 1} & -2 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    $$ \left[ \begin{array}{rrr|r} {\mathbf 1} & 0 & 2 & 3 \\ 0 & {\mathbf 1} & -1 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    $$ \left[ \begin{array}{rrr|r} {\mathbf 1} & 0 & 2 & 0 \\ 0 & {\mathbf 1} & -1 & 0 \\ 0 & 0 & 0 & {\mathbf 1} \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    The first two augmented matrices correspond to consistent linear systems. The third does not, however, since the third row corresponds to the equation $0=1$.

    In general, a linear system is inconsistent exactly when there is a pivot position in the rightmost column of the augmented matrix.

b) 
    A row in which every entry is zero corresponds to the equation $0=0$, which is always true. Such an equation has no bearing on the consistency of the linear system.

c) 

    $$ \left[\begin{array}{rrrr|r} {\mathbf 1} & 0 & 0 & 2 & 4 \\ 0 & {\mathbf 1} & 0 & -2 & 1 \\ 0 & 0 & {\mathbf 1} & 0 & 3 \\ \end{array}\right] $$

    This corresponds to a consistent system because there is not a pivot in the rightmost column.

d) 

    $$ \left[\begin{array}{rrrr|r} {\mathbf 1} & 0 & 0 & 2 & 4 \\ 0 & {\mathbf 1} & 0 & -2 & 1 \\ 0 & 0 & 0 & 0 & {\mathbf 1} \\ \end{array}\right] $$

    This is an inconsistent system because the third row corresponds to the equation $0=1$, which is never satisfied.

e) 

    $$ \left[\begin{array}{rrrr} {\mathbf 1} & 0 & 0 & 2 \\ 0 & {\mathbf 1} & 0 & -2 \\ 0 & 0 & 0 & 0 \\ \end{array}\right] $$

    In the coefficient matrix, there is a row without a pivot position so that each entry is $0$. This allows a pivot position to appear in the rightmost column of the augmented matrix.

f) 
    This linear system must be consistent because the augmented matrix cannot have a pivot position in the rightmost column.

:::

Let's summarize the results of this activity by considering the following reduced row echelon matrix:

$$ \left[ \begin{array}{rrr|r} 1 & * & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

. In terms of variables $x$, $y$, and $z$, the final equation says

$$ 0x + 0y + 0z = 0 $$

. If we evaluate the left-hand side with any values of $x$, $y$, and $z$, we get 0, which means that the equation always holds. Therefore, its presence has no effect on the solution space defined by the other three equations.

The third equation, however, says that

$$ 0x + 0y + 0z = 1 $$

. Again, if we evaluate the left-hand side with any values of $x$, $y$, and $z$, we get 0 so this equation cannot be satisfied for any $(x,y,z)$. This means that the entire linear system has no solution and is therefore inconsistent.

An equation like this appears in the reduced row echelon matrix as

$$ \left[ \begin{array}{cccc|c} \vdots & \vdots & \vdots & \vdots & \vdots \\ 0 & 0 & \cdots & 0 & 1 \\ \vdots & \vdots & \vdots & \vdots & \vdots \\ \end{array} \right] $$

. The pivot positions make this condition clear: *the system is inconsistent if there is a pivot position in the rightmost column of the corresponding augmented matrix.*

In fact, we will soon see that the system is consistent if there is not a pivot in the rightmost column of the corresponding augmented matrix. This leaves us with the following

:::proposition {prop:thm-pivot-inconsistency} Proposition 1.4.3
A linear system is inconsistent if and only if there is a pivot position in the rightmost column of the corresponding augmented matrix.
:::

This also says something about the pivot positions of the coefficient matrix. Consider an example of an inconsistent system corresponding to the reduced row echelon form of the following augmented matrix

$$ \left[ \begin{array}{ccc|c} 1 & 0 & * & 0 \\ 0 & 1 & * & 0 \\ 0 & 0 & 0 & 1 \\ \end{array} \right] $$

. The [Augmentation Principle](ref:1.3#principle-augmentation-principle) says that that the reduced row echelon form of the coefficient matrix is

$$ \left[ \begin{array}{ccc} 1 & 0 & * \\ 0 & 1 & * \\ 0 & 0 & 0 \\ \end{array} \right], $$

which shows that the coefficient matrix has a row without a pivot position. To turn this around, we see that *if every row of the coefficient matrix has a pivot position, then the system must be consistent.* For instance, if our linear system has a coefficient matrix whose reduced row echelon form is

$$ \left[ \begin{array}{ccc} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array} \right] $$

, then we can guarantee that the linear system is consistent because there is no way to obtain a pivot in the rightmost column of the augmented matrix.

:::proposition {prop:proposition-1-4-4} Proposition 1.4.4
If every row of the coefficient matrix has a pivot position, then the corresponding system of linear equations is consistent.
:::

## 1.4.3 The uniqueness of solutions

Now that we have studied the role that pivot positions play in the existence of solutions, let's turn to the question of uniqueness.

:::activity {act:activity-1-4-3} Activity 1.4.3

a) 
    Here are the three augmented matrices in reduced row echelon form that we considered in the previous section.

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 0 & 3 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & -2 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 2 & 3 \\ 0 & 1 & -1 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 2 & 0 \\ 0 & 1 & -1 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    For each matrix, identify the pivot positions and state whether the corresponding linear system is consistent. If the system is consistent, explain whether the solution is unique or whether there are infinitely many solutions.

b) 
    If possible, give an example of a $3\times5$ augmented matrix that corresponds to a linear system having a unique solution. If it is not possible, explain why.

c) 
    If possible, give an example of a $5\times3$ augmented matrix that corresponds to a linear system having a unique solution. If it is not possible, explain why.

d) 
    What condition on the pivot positions guarantees that a linear system has a unique solution?

e) 
    If a linear system has a unique solution, what can we say about the relationship between the number of equations and the number of variables?

SOLUTION:

a) 
    The pivot positions are indicated below.

    $$ \left[ \begin{array}{rrr|r} {\mathbf 1} & 0 & 0 & 3 \\ 0 & {\mathbf 1} & 0 & 0 \\ 0 & 0 & {\mathbf 1} & -2 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    $$ \left[ \begin{array}{rrr|r} {\mathbf 1} & 0 & 2 & 3 \\ 0 & {\mathbf 1} & -1 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    $$ \left[ \begin{array}{rrr|r} {\mathbf 1} & 0 & 2 & 0 \\ 0 & {\mathbf 1} & -1 & 0 \\ 0 & 0 & 0 & {\mathbf 1} \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    The third linear system is inconsistent. The first system is consistent and has exactly one solution because $x_1=3$, $x_2=0$, and $x_3=-2$. The second system is consistent and has infinitely many solutions since we can write the equations as

    $$ \begin{alignedat}{2} x_1 & {}={} & 3 -2x_3 \\ x_2 & {}={} & x_3\text{.} \\ \end{alignedat} $$

b) 
    This is not possible as we see by considering the shape of a typical matrix:

    $$ \left[\begin{array}{rrrr|r} 1 & 0 & 0 & -3 & 1 \\ 0 & 1 & 0 & 1 & 2 \\ 0 & 0 & 1 & 2 & 4 \\ \end{array}\right] $$

    In this case, the variable $x_4$ is free meaning there are infinitely many solutions.

c) 
    This is possible as the following matrix illustrates:

    $$ \left[\begin{array}{rr|r} 1 & 0 & 0 \\ 0 & 1 & -3 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

d) 
    If every column of the coefficient matrix has a pivot position, we can guarantee that the solution is unique.

e) 
    If the coefficient matrix has a pivot position in every column, there must be at least as many rows as columns. Therefore, the number of equations must be at least as many as the number of variables.

:::

Let's consider what we've learned in this activity. Since we are interested in the question of whether a consistent linear system has a unique solution or infinitely many, we will only consider consistent systems. By the results of the previous section, this means that there is not a pivot in the rightmost column of the augmented matrix. Here are two possible examples:

$$ \left[ \begin{array}{rrr|r} 1 & 0 & 0 & 4 \\ 0 & 1 & 0 & -1 \\ 0 & 0 & 1 & 2 \\ \end{array} \right] $$

$$ \left[ \begin{array}{rrr|r} 1 & 0 & 2 & -2 \\ 0 & 1 & 1 & 4 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

In the first example, we have the equations

$$ \begin{alignedat}{4} x_1 & {}={} & 4 \\ x_2 & {}={} & -1 \\ x_3 & {}={} & 2 \\ \end{alignedat} $$

demonstrating the fact that there is a unique solution $(x_1,x_2,x_3) = (4,-1,2)$.

In the second example, we have the equations

$$ \begin{alignedat}{4} x_1 & & & {}+{} & 2x_3& {}={} & -2 \\ & & x_2 & {}+{} & x_3& {}={} & 4 \\ \end{alignedat} $$

that we may rewrite in parametric form as

$$ \begin{alignedat}{4} x_1 & {}={} & -2-2x_3 \\ x_2 & {}={} & 4-x_3 \\ \end{alignedat} $$

. Here we see that $x_1$ and $x_2$ are basic variables that may be expressed in terms of the free variable $x_3$. In this case, the presence of the free variable leads to infinitely many solutions.

Remember that every column of the coefficient matrix corresponds to a variable in our linear system. In the first example, we see that every column of the coefficient contains a pivot position, which means that every variable is uniquely determined. In the second example, the column of the coefficient matrix corresponding to $x_3$ does not contain a pivot position, which results in $x_3$ appearing as a free variable. This illustrates the following principle.

:::principle {prin:principle-1-4-5} Principle 1.4.5
Suppose that we consider a consistent linear system.

- 
    If every column of the coefficient matrix contains a pivot position, then the system has a unique solution.

- 
    If there is a column in the coefficient matrix that contains no pivot position, then the system has infinitely many solutions.

- 
    Columns that contain a pivot position correspond to basic variables while columns that do not correspond to free variables.

:::

When a linear system has a unique solution, every column of the coefficient matrix has a pivot position. Since every row contains at most one pivot position, there must be at least as many rows as columns in the coefficient matrix. Therefore, the linear system has at least as many equations as variables, which is something we intuitively suspected in [Section 1.1](ref:1.1#sec-expect).

It is reasonable to ask how we choose the free variables. For instance, if we have a single equation

$$ x + 2y = 4 $$

, then we may write

$$ x = 4-2y $$

or, equivalently,

$$ y = 2 - \frac12 x $$

. Clearly, either variable may be considered as a free variable in this case.

As we'll see in the future, we are more interested in the *number* of free variables rather than in their choice. For convenience, we will adopt the convention that free variables correspond to columns without a pivot position, which allows us to quickly identify them. For example, the variables $x_2$ and $x_4$ appear as free variables in the following linear system:

$$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 2 & 3 \\ 0 & 0 & 1 & -1 & 0 \\ \end{array} \right] $$

.

## 1.4.4 Summary

We have seen how the locations of pivot positions, in both the augmented and coefficient matrices, give vital information about the existence and uniqueness of solutions to linear systems. More specifically,

- 
    A linear system is inconsistent exactly when a pivot position appears in the rightmost column of the *augmented* matrix.

- 
    If a linear system is consistent, the solution is unique when every column of the *coefficient* matrix contains a pivot position. There are infinitely many solutions when there is a column of the *coefficient* matrix without a pivot position.

- 
    If a linear system is consistent, the columns of the coefficient matrix containing pivot positions correspond to basic variables and the columns without pivot positions correspond to free variables.

## 1.4.5 Exercises

:::exercise {exercise-1-4-001} number=1.4.1 answered=yes src=src/exercises/exercises1-4.xml:4
PROBLEM:
For each of the augmented matrices in reduced row echelon form given below, determine whether the corresponding linear system is consistent and, if so, determine whether the solution is unique. If the system is consistent, identify the free variables and the basic variables and give a description of the solution space in parametric form.

a) 

    $$ \left[ \begin{array}{rrrr|r} 0 & 1 & 0 & 0 & 2 \\ 0 & 0 & 1 & 0 & 3 \\ 0 & 0 & 0 & 1 & -2 \\ \end{array} \right] $$

    .

b) 

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 1 & 1 & 0 \\ 0 & 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    .

c) 

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 & 1 \\ \end{array} \right] $$

    .

d) 

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 0 & -3 \\ 0 & 1 & 0 & -1 \\ 0 & 0 & 1 & -2 \\ \end{array} \right] $$

    .

ANSWER:

a) 
    The linear system is consistent because there is not a pivot position in the rightmost column, and there are infinitely many solutions.

b) 
    The linear system is consistent because there is not a pivot position in the rightmost column, and there are infinitely many solutions.

c) 
    The linear system is inconsistent because there is a pivot position in the rightmost column.

d) 
    The linear system is consistent, and there is a unique solution.

SOLUTION:

a) 
    The linear system is consistent because there is not a pivot position in the rightmost column. The variable $x_1$ is free while $x_2=2$, $x_3=3$, and $x_4=-2$ are basic. There are infinitely many solutions.

b) 
    The linear system is consistent because there is not a pivot position in the rightmost column. The variable $x_4$ is free while $x_1=0$, $x_2=0$, and $x_3=-x_4$ are basic. There are infinitely many solutions.

c) 
    The linear system is inconsistent because there is a pivot position in the rightmost column.

d) 
    The linear system is consistent with $x_1=-3$, $x_2=-1$, and $x_3=-2$ all being basic variables. There is a unique solution.

:::

:::exercise {exercise-1-4-002} number=1.4.2 answered=yes src=src/exercises/exercises1-4.xml:132
PROBLEM:
For each of the following linear systems, determine whether the system is consistent, and, if so, determine whether there are infinitely many solutions.
:::sage
```sage

```
:::

a) 

    $$ \begin{alignedat}{5} 2x_1&{}-{}& x_2& {}+{}& 3x_3 & {}{} & & {}={} & 10 \\ -x_1&{}+{}& x_2& & & {}+{} & 3x_4 & {}={} & 8 \\ &{}{}& 2x_2& {}+{}& 2x_3 & {}-{} & x_4 & {}={} & -4 \\ 3x_1&{}+{}& 2x_2& {}-{}& x_3 & {}+{} & x_4 & {}={} & 10 \\ \\ \end{alignedat} $$

b) 

    $$ \begin{alignedat}{5} 2x_1&{}-{}& x_2& {}+{}& 3x_3 & {}+{} & 3x_4 & {}={} & 8 \\ -x_1&{}+{}& x_2& & & {}+{} & 2x_4 & {}={} & -1 \\ &{}{}& 2x_2& {}+{}& 2x_3 & {}+{} & 6x_4 & {}={} & 4 \\ 3x_1&{}+{}& 2x_2& {}-{}& x_3 & {}-{} & 3x_4 & {}={} & 1 \\ \\ \end{alignedat} $$

c) 

    $$ \begin{alignedat}{5} 2x_1&{}-{}& x_2& {}+{}& 3x_3 & {}+{} & 3x_4 & {}={} & 8 \\ -x_1&{}+{}& x_2& & & {}+{} & 2x_4 & {}={} & -1 \\ &{}{}& 2x_2& {}+{}& 2x_3 & {}+{} & 6x_4 & {}={} & 4 \\ 3x_1&{}+{}& 2x_2& {}-{}& x_3 & {}-{} & 3x_4 & {}={} & 0 \\ \\ \end{alignedat} $$

ANSWER:

a) 
    The linear system is consistent with a unique solution.

b) 
    The linear system is consistent with infinitely many solutions.

c) 
    The linear system is inconsistent.

SOLUTION:

a) 
    The corresponding augmented matrix is

    $$ \left[ \begin{array}{rrrr|r} 2 & -1 & 3 & 0 & 10 \\ -1 & 1 & 0 & 3 & 8 \\ 0 & 2 & 2 & -1 & -4 \\ 3 & 2 & -1 & 1 & 10 \\ \end{array} \right] \sim \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 3 \\ 0 & 1 & 0 & 0 & -1 \\ 0 & 0 & 1 & 0 & 1 \\ 0 & 0 & 0 & 1 & 4 \\ \end{array} \right] $$

    so this linear system is consistent with a unique solution.

b) 
    The corresponding augmented matrix is

    $$ \left[ \begin{array}{rrrr|r} 2 & -1 & 3 & 3 & 8 \\ -1 & 1 & 0 & 2 & -1 \\ 0 & 2 & 2 & 6 & 4 \\ 3 & 2 & -1 & -3 & 1 \\ \end{array} \right] \sim \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & -1 & 1 \\ 0 & 1 & 0 & 1 & 0 \\ 0 & 0 & 1 & 2 & 2 \\ 0 & 0 & 0 & 0 & 0 \\ \end{array} \right] $$

    so this linear system is consistent with infinitely many solutions.

c) 
    The corresponding augmented matrix is

    $$ \left[ \begin{array}{rrrr|r} 2 & -1 & 3 & 3 & 8 \\ -1 & 1 & 0 & 2 & -1 \\ 0 & 2 & 2 & 6 & 4 \\ 3 & 2 & -1 & -3 & 0 \\ \end{array} \right] \sim \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & -1 & 0 \\ 0 & 1 & 0 & 1 & 0 \\ 0 & 0 & 1 & 2 & 0 \\ 0 & 0 & 0 & 0 & 1 \\ \end{array} \right] $$

    so this linear system is inconsistent.

:::

:::exercise {exercise-1-4-003} number=1.4.3 answered=yes src=src/exercises/exercises1-4.xml:303
PROBLEM:
Include an example of an appropriate matrix as you justify your responses to the following questions.

a) 
    Suppose a linear system having six equations and three variables is consistent. Can you guarantee that the solution is unique? Can you guarantee that there are infinitely many solutions?

b) 
    Suppose that a linear system having three equations and six variables is consistent. Can you guarantee that the solution is unique? Can you guarantee that there are infinitely many solutions?

c) 
    Suppose that a linear system is consistent and has a unique solution. What can you guarantee about the pivot positions in the augmented matrix?

ANSWER:

a) 
    We cannot guarantee either possibility.

b) 
    We can guarantee there are infinitely many solutions.

c) 
    There is a pivot position in each column of the coefficient matrix.

SOLUTION:

a) 
    Consider the augmented matrices

    $$ \begin{array}{ccc} \left[\begin{array}{rrr|r} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array}\right] & \left[\begin{array}{rrr|r} 1 & -2 & 0 & 2 \\ 0 & 0 & 1 & -3 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array}\right] & \left[\begin{array}{rrr|r} 1 & 0 & 0 & 1 \\ 0 & 1 & 0 & -2 \\ 0 & 0 & 1 & 3 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.} \end{array} $$

    These examples show that anything is possible: the system may or may not be consistent, and, if it is consistent, there may or may not be a unique solution.

b) 
    Consider the augmented matrix

    $$ \left[\begin{array}{rrrrrr|r} 1 & 0 & 0 & 0 & 0 & 0 & 1 \\ 0 & 1 & 0 & 0 & 0 & 0 & -1 \\ 0 & 0 & 1 & 0 & 0 & 0 & 4 \\ \end{array}\right] $$

    There must be a column without a pivot position so we can guarantee that there are infinitely many solutions.

c) 
    Consider the augmented matrix

    $$ \left[\begin{array}{rrr|r} 1 & 0 & 0 & 3 \\ 0 & 1 & 0 & -2 \\ 0 & 0 & 1 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

    We know that every column of the coefficient matrix has a pivot position and that the rightmost column does not. There must be at least as many equations as variables.

:::

:::exercise {exercise-1-4-004} number=1.4.4 answered=yes src=src/exercises/exercises1-4.xml:415
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response.

a) 
    If the coefficient matrix of a linear system has a pivot in the rightmost column, then the system is inconsistent.

b) 
    If a linear system has two equations and four variables, then it must be consistent.

c) 
    If a linear system having four equations and three variables is consistent, then the solution is unique.

d) 
    Suppose that a linear system has four equations and four variables and that the coefficient matrix has four pivots. Then the linear system is consistent and has a unique solution.

e) 
    Suppose that a linear system has five equations and three variables and that the coefficient matrix has a pivot position in every column. Then the linear system is consistent and has a unique solution.

ANSWER:

a) 
    False.

b) 
    False.

c) 
    False.

d) 
    True.

e) 
    False.

SOLUTION:

a) 
    This statement is false. If the *augmented* matrix has a pivot in the rightmost column, then the system is inconsistent.

b) 
    This statement is false as illustrated by the matrix

    $$ \left[\begin{array}{rrrr|r} 1 & 0 & 2 & 3 & -1 \\ 0 & 0 & 0 & 0 & 1\\ \end{array}\right]\text{.} $$

c) 
    This statement is false as illustrated by the matrix

    $$ \left[\begin{array}{rrr|r} 1 & 0 & 2 & 1 \\ 0 & 1 & -2 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0\\ \end{array}\right]\text{.} $$

d) 
    This statement is true as illustrated by the matrix

    $$ \left[\begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 1 \\ 0 & 1 & 0 & 0 & 3\\ 0 & 0 & 1 & 0 & -1 \\ 0 & 0 & 0 & 1 & 7\\ \end{array}\right]\text{.} $$

e) 
    This statement is false as illustrated by the matrix

    $$ \left[\begin{array}{rrr|r} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

:::

:::exercise {exercise-1-4-005} number=1.4.5 answered=yes src=src/exercises/exercises1-4.xml:527
PROBLEM:
We began our explorations in [Section 1.1](ref:1.1#sec-expect) by noticing that the solution spaces of linear systems with more equations seem to be smaller. Let's reexamine this idea using what we know about pivot positions.

a) 
    Remember that the solution space of a single linear equation in three variables is a plane. Can two planes ever intersect in a single point? What are the possible ways in which two planes can intersect? How can our understanding of pivot positions help answer these questions?

b) 
    Suppose that a consistent linear system has more variables than equations. By considering the possible pivot positions, what can you say with certainty about the solution space?

c) 
    If a linear system has many more equations than variables, why is it reasonable to expect the system to be inconsistent?

ANSWER:

a) 
    The planes will most likely intersect either in a line or not at all.

b) 
    There must be infinitely many solutions.

c) 
    There will most likely be a pivot position in the rightmost column of the augmented matrix.

SOLUTION:

a) 
    The intersection of two planes is described by a linear system having two equations and three variables. Two possible reduced row echelon forms are

    $$ \begin{array}{cc} \left[ \begin{array}{rrr|r} 1 & 0 & * & * \\ 0 & 1 & * & * \\ \end{array} \right] & \left[ \begin{array}{rrr|r} 1 & * & * & * \\ 0 & 0 & 0 & 1 \\ \end{array} \right] \end{array} $$

    indicating that the planes either intersect in a line or do not intersect at all. In particular, it is not possible for there to be a single point of intersection.

b) 
    If there are more variables than equations, there must be a column in the coefficient matrix that does not contain a pivot position:

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & * & * \\ 0 & 1 & * & * \\ \end{array} \right] $$

    so we can guarantee that there are infinitely many solutions.

c) 
    If there are many more equations than variables, the coefficient matrix will have many rows without a pivot position:

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & * \\ 0 & 1 & * \\ 0 & 0 & * \\ 0 & 0 & * \\ 0 & 0 & * \\ 0 & 0 & * \\ 0 & 0 & * \\ \end{array} \right] $$

    This makes it likely that there will be a pivot position in the rightmost column of the augmented matrix, which means that the linear system is inconsistent.

:::

:::exercise {exercise-1-4-006} number=1.4.6 answered=yes src=src/exercises/exercises1-4.xml:665
PROBLEM:
The following linear systems contain either one or two parameters.

a) 
    For what values of the parameter $k$ is the following system consistent? For which of those values is the solution unique?

    $$ \begin{alignedat}{3} -x_1 & {}+{} & 2x_2 & {}={} & 3 \\ 2x_1 & {}-{} & 4x_2 & {}={} & k \\ \end{alignedat} $$

    .

b) 
    For what values of the parameters $k$ and *l* is the following system consistent? For which of those values is the solution unique?

    $$ \begin{alignedat}{3} 2x_1 & {}+{} & 4x_2 & {}={} & 3 \\ -x_1 & {}+{} & kx_2 & {}={} & l \\ \end{alignedat} $$

    .

ANSWER:

a) 
    The system is consistent when $k= -6$, and the solution can never be unique. If $k\neq -6$, the system is inconsistent.

b) 
    The system is inconsistent if $k=-2$ and $l\neq -\frac32$. There are infinitely many solutions if $k=-2$ and $l=-\frac32$. There is a unique solution if $k\neq -2$.

SOLUTION:

a) 
    We have

    $$ \left[\begin{array}{rr|r} -1 & 2 & 3 \\ 2 & -4 & k \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & -2 & -3 \\ 0 & 0 & k+6 \\ \end{array}\right]\text{.} $$

    This shows that the system is consistent when $k= -6$, and the solution can never be unique. If $k\neq -6$, the system is inconsistent.

b) 
    We have

    $$ \left[\begin{array}{rr|r} 2 & 4 & 3 \\ -1 & k & l \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 2 & \frac32 \\ 0 & 2+k & l + \frac32 \\ \end{array}\right]\text{.} $$

    The system is inconsistent if $k=-2$ and $l\neq -\frac32$. There are infinitely many solutions if $k=-2$ and $l=-\frac32$. There is a unique solution if $k\neq -2$.

:::

:::exercise {exercise-1-4-007} number=1.4.7 answered=yes src=src/exercises/exercises1-4.xml:758
PROBLEM:
Consider the linear system described by the following augmented matrix.

$$ \left[ \begin{array}{ccc|c} 1 & 2 & 3 & 1 \\ 4 & 5 & 6 & 4 \\ a & b & c & 9 \\ \end{array} \right] $$

.

a) 
    Find a choice for the parameters $a$, $b$, and $c$ that causes the linear system to be inconsistent. Explain why your choice has this property.

b) 
    Find a choice for the parameters $a$, $b$, and $c$ that causes the linear system to have a unique solution. Explain why your choice has this property.

c) 
    Find a choice for the parameters $a$, $b$, and $c$ that causes the linear system to have infinitely many solutions. Explain why your choice has this property.

ANSWER:
Some example choices are given here, but there are many more.

a) 
    $a=b=c=0$.

b) 
    $a=1$ and $b=c=0$.

c) 
    $a=9$, $b=0$, and $c=-9$.

SOLUTION:
We have

$$ \left[\begin{array}{rrr|r} 1 & 2 & 3 & 1 \\ 4 & 5 & 6 & 4 \\ a & b & c & 9 \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 2 & 3 & 1 \\ 0 & 1 & 2 & 0 \\ 0 & 0 & a-2b+c & 9-a \\ \end{array}\right]\text{.} $$

a) 
    If $a - 2b + c = 0$ and $9-a\neq 0$, then the system will be inconsistent. We can choose $a=b=c=0$.

b) 
    We want there to be a pivot position in every column so we choose $a-2b+c\neq 0$. For instance $a=1$, $b=0$, and $c=0$ works.

c) 
    We need for the third and fourth columns to lack pivot positions so we choose $a+c-2b=0$ and $a = 9$. For instance, $a=9$, $b=0$, and $c=-9$ works.

:::

:::exercise {exercise-1-4-008} number=1.4.8 answered=yes src=src/exercises/exercises1-4.xml:849
PROBLEM:
A linear system where the right hand side of every equation is 0 is called *homogeneous*. The augmented matrix of a homogeneous system, for instance, has the following form:

$$ \left[ \begin{array}{cccc|c} * & * & * & * & 0 \\ * & * & * & * & 0 \\ * & * & * & * & 0 \\ \end{array} \right] $$

.

a) 
    Using the concepts we've seen in this section, explain why a homogeneous linear system must be consistent.

b) 
    What values for the variables are guaranteed to give a solution? Use this to offer another explanation for why a homogeneous linear system is consistent.

c) 
    Suppose that a homogeneous linear system has a unique solution.

    1. 
        Give an example of such a system by writing its augmented matrix in reduced row echelon form.

    2. 
        Write just the coefficient matrix for the example you gave in the previous part. What can you say about the pivot positions in the coefficient matrix? Explain why your observation must hold for any homogeneous system having a unique solution.

    3. 
        If a homogeneous system of equations has a unique solution, what can you say about the number of equations compared to the number of variables?

ANSWER:

a) 
    There cannot be a pivot in the rightmost column.

b) 
    There is a solution when all the variables are set to zero.

c) 
    There are at least as many equations as variables.

SOLUTION:

a) 
    Since all the entries in the rightmost column are zero, there cannot be a pivot in the rightmost column.

b) 
    We have a solution when all the variables are zero. Therefore, the system must be consistent.

c) 
    We must have a pivot position in every column of the coefficient matrix so the augmented matrix could look like

    $$ \left[\begin{array}{rrr|r} 1 & 0 & 0 & * \\ 0 & 1 & 0 & * \\ 0 & 0 & 1 & * \\ 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

    Since every column of the coefficient matrix has a pivot position, there must be at least as many rows as columns. This means that there must be at least as many equations as variables.

:::

:::exercise {exercise-1-4-009} number=1.4.9 answered=yes src=src/exercises/exercises1-4.xml:948 label=exercise-poly-fit
PROBLEM:
In a previous math class, you have probably seen the fact that, if we are given two points in the plane, then there is a unique line passing through both of them. In this problem, we will begin with the four points on the left below and ask to find a polynomial that passes through these four points as shown on the right.
> IMAGE {img:1-4-interpolation-0} src=../../media/ch01/1-4-interpolation-0.svg
> alt: A coordinate grid and axes with four points.

> IMAGE {img:1-4-interpolation-1} src=../../media/ch01/1-4-interpolation-1.svg
> alt: A coordinate grid and axes along with four points and the graph of a cubic function passing through the points.

A degree three polynomial can be written as

$$ p(x) = a + bx + cx^2 + dx^3 $$

where $a$, $b$, $c$, and $d$ are coefficients that we would like to determine. Since we want the polynomial to pass through the point $(3,1)$, we should require that

$$ p(3) = a + 3b + 9c + 27d = 1 $$

. In this way, we obtain a linear equation for the coefficients $a$, $b$, $c$, and $d$.

1. 
    Write the four linear equations for the coefficients obtained by requiring that the graph of the polynomial $p(x)$ passes through the four points above.

2. 
    Write the augmented matrix corresponding to this system of equations and use the Sage cell below to solve for the coefficients.

    :::sage
    ```sage

    ```
    :::

3. 
    Write the polynomial $p(x)$ that you found and check your work by graphing it in the Sage cell below and verifying that it passes through the four points. To plot a function over a range, you may use a command like ` plot(1 + x- 2*x^2, xmin = -1, xmax = 4)`.

    :::sage
    ```sage

    ```
    :::

4. 
    Rather than looking for a degree three polynomial, suppose we wanted to find a polynomial that passes through the four points and that has degree two, such as

    $$ p(x) = a + bx + cx^2 $$

    . Solve the linear system for the coefficients. What can you say about the existence and uniqueness of a degree two polynomial passing through these four points?

    :::sage
    ```sage

    ```
    :::

5. 
    Rather than looking for a degree three polynomial, suppose we wanted to find a polynomial that passes through the four points and that has degree four, such as

    $$ p(x) = a + bx + cx^2 + dx^3 + ex^4 $$

    . Solve the linear system for the coefficients. What can you say about the existence and uniqueness of a degree four polynomial passing through these four points?

    :::sage
    ```sage

    ```
    :::

6. 
    Suppose you had 10 points and you wanted to find a polynomial passing through each of them. What should the degree of the polynomial be to guarantee that there is exactly one such polynomial? Explain your response.

ANSWER:

a) 
    The four equations we find are

    $$ \begin{alignedat}{5} a & & & & & & & {}={} & 2 \\ a & {}+{} & b & {}+{} & c & {}+{} & d & {}={} & 3 \\ a & {}+{} & 2b & {}+{} & 4c & {}+{} & 8d & {}={} & 0 \\ a & {}+{} & 3b & {}+{} & 9c & {}+{} & 27d & {}={} & 1\text{.} \\ \end{alignedat} $$

b) 
    The coefficients are $a=2$, $b=\frac{17}{3}$, $c=-6$, and $d=\frac43$.

c) 
    The polynomial is

    $$ p(x) = 2 + \frac{17}{3}x -6x^2 + \frac43 x^3\text{.} $$

d) 
    The linear system is inconsistent.

e) 
    The linear system is consistent with infinitely many solutions.

f) 
    Nine.

SOLUTION:

a) 
    The four equations we find are

    $$ \begin{alignedat}{5} a & & & & & & & {}={} & 2 \\ a & {}+{} & b & {}+{} & c & {}+{} & d & {}={} & 3 \\ a & {}+{} & 2b & {}+{} & 4c & {}+{} & 8d & {}={} & 0 \\ a & {}+{} & 3b & {}+{} & 9c & {}+{} & 27d & {}={} & 1\text{.} \\ \end{alignedat} $$

b) 
    This leads to the augmented matrix

    $$ \left[\begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 2 \\ 1 & 1 & 1 & 1 & 3 \\ 1 & 2 & 4 & 8 & 0 \\ 1 & 3 & 9 & 27 & 1 \\ \end{array}\right] \sim \left[\begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 2 \\ 0 & 1 & 0 & 0 & \frac{17}{3} \\ 0 & 0 & 1 & 0 & -6 \\ 0 & 0 & 0 & 1 & \frac43 \\ \end{array}\right]\text{.} $$

    This gives the coefficients $a=2$, $b=\frac{17}{3}$, $c=-6$, and $d=\frac43$.

c) 
    The polynomial

    $$ p(x) = 2 + \frac{17}{3}x -6x^2 + \frac43 x^3 $$

    passes through the four given points.

d) 
    We have the augmented matrix

    $$ \left[\begin{array}{rrr|r} 1 & 0 & 0 & 2 \\ 1 & 1 & 1 & 3 \\ 1 & 2 & 4 & 0 \\ 1 & 3 & 9 & 1 \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right]\text{.} $$

    This system is therefore inconsistent, which means there is no degree 2 polynomial passing through the four points.

e) 
    The augmented matrix we find is

    $$ \left[\begin{array}{rrrrr|r} 1 & 0 & 0 & 0 & 0 & 2 \\ 1 & 1 & 1 & 1 & 1 & 3 \\ 1 & 2 & 4 & 8 & 16 & 0 \\ 1 & 3 & 9 & 27 & 81 & 1 \\ \end{array}\right] \sim \left[\begin{array}{rrrrr|r} 1 & 0 & 0 & 0 & 0 & 2 \\ 0 & 1 & 0 & 0 & 6 & \frac{17}{3} \\ 0 & 0 & 1 & 0 & -11 & -6 \\ 0 & 0 & 0 & 1 & 6 & \frac43 \\ \end{array}\right]\text{.} $$

    This shows that there are infinitely many polynomials whose degree is four and that pass through the four points.

f) 
    If there are 10 points, we should find a polynomial having 10 coefficients. This means that the degree of the polynomial should be 9.

:::
