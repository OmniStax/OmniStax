# 3.1 Invertibility {sec-matrix-inverse}

Up to this point, we have used the Gaussian elimination algorithm to find solutions to linear systems. We now investigate another way to find solutions to the equation $A{\mathbf x}={\mathbf b}$ when the matrix $A$ has the same number of rows and columns. To get started, let's look at some familiar examples.

## 3.1.1 Introduction

:::exploration {act:preview-3-1-1} Preview Activity 3.1.1
PROBLEM:
a) Explain how you would solve the equation $3x = 5$ using multiplication rather than division.
b) Find the $2\times2$ matrix $A$ that rotates vectors counterclockwise by $90^\circ$.
c) Find the $2\times2$ matrix $B$ that rotates vectors *clockwise* by $90^\circ$.
d) What do you expect the product $AB$ to be? Explain the reasoning behind your expectation and then compute $AB$ to verify it.
e) Solve the equation $A{\mathbf x} = \left[\begin{array}{r}3 \\ -2 \end{array}\right]$ using Gaussian elimination.
    :::sage
    ```sage

    ```
    :::
f) Explain why your solution may also be found by computing ${\mathbf x} = B\left[\begin{array}{r}3 \\ -2 \end{array}\right]$.
SOLUTION:
a) Dividing by $3$ is the same as multiplying by $\frac13$, the multiplicative inverse $\frac13$ of $3$. We have

    $$ \begin{array}{rl} \frac13(3x) & = \dfrac13 5 \\ \left(\frac13 3\right)x& = \dfrac53 \\ 1x & = \dfrac 53 \\ x & = \dfrac53\text{.} \\ \end{array} $$

b) As we have seen a few times, the matrix is $A=\left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]\text{.}$
c) Here, the matrix is $B=\left[\begin{array}{rr} 0 & 1 \\ -1 & 0 \\ \end{array}\right]\text{.}$
d) We should expect that $AB=I$ since the effect of rotating by $90^\circ$ clockwise followed by rotating $90^\circ$ counterclockwise is to leave a vector unchanged. We can verify this by performing the matrix multiplication.
e) We have

    $$ \left[\begin{array}{rr|r} 0 & -1 & 3 \\ 1 & 0 & -2 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & -2 \\ 0 & 1 & -3 \\ \end{array}\right] $$

    so the solution is ${\mathbf x}=\left[\begin{array}{r}-2 \\ -3 \end{array}\right]$.
f) The equation $A{\mathbf x}=\left[\begin{array}{r}3 \\ -2 \end{array}\right]$ is asking us to find the vector that becomes $\left[\begin{array}{r}3 \\ -2 \end{array}\right]$ after being rotated by $90^\circ$. If we rotate $\left[\begin{array}{r}3 \\ -2 \end{array}\right]$ by $90^\circ$ in the opposite direction, it will have this property. That is, if ${\mathbf x} = B\left[\begin{array}{r}3 \\ -2 \end{array}\right]$, then

    $$ A{\mathbf x} = A(B\left[\begin{array}{r}3 \\ -2 \end{array}\right]) = (AB)\left[\begin{array}{r}3 \\ -2 \end{array}\right] = I\left[\begin{array}{r}3 \\ -2 \end{array}\right] = \left[\begin{array}{r}3 \\ -2 \end{array}\right]. $$

:::

## 3.1.2 Invertible matrices {subsec-invertible-matrices}

The preview activity began with a familiar type of equation, $3x = 5$, and asked for a strategy to solve it. One possible response is to divide both sides by 3. Instead, let's rephrase this as multiplying by $3^{-1} = \frac 13$, the multiplicative inverse of 3.

Now that we are interested in solving equations of the form $A{\mathbf x} = {\mathbf b}$, we might try to find a similar approach. Is there a matrix $A^{-1}$ that plays the role of the multiplicative inverse of $A$? Of course, the real number $0$ does not have a multiplicative inverse so we probably shouldn't expect every matrix to have a multiplicative inverse. We will see, however, that many do.

:::definition {def:definition-3-1-1} Definition 3.1.1
{index-entry:invertible} {index-entry:matrix, inverse} An $n\times n$ matrix $A$ is called *invertible* if there is a matrix $B$ such that $AB = I_n$, where $I_n$ is the $n\times n$ identity matrix. The matrix $B$ is called the *inverse* of $A$ and denoted $A^{-1}$.
:::

{index-entry:matrix, square} Notice that we only define invertibility for matrices that have the same number of rows and columns in which case we say that the matrix is *square*.

:::example {ex:example-3-1-2} Example 3.1.2
Suppose that $A$ is the matrix that rotates two-dimensional vectors counterclockwise by $90^\circ$ and that $B$ rotates vectors by $-90^\circ$. We have

$$ A=\left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right],~~~ B=\left[\begin{array}{rr} 0 & 1 \\ -1 & 0 \\ \end{array}\right]. $$

We can check that

$$ AB = \begin{bmatrix} 0 & -1 \\ 1 & 0 \\ \end{bmatrix} \begin{bmatrix} 0 & 1 \\ -1 & 0 \\ \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix} = I $$

which shows that $A$ is invertible and that $A^{-1}=B$.
Notice that if we multiply the matrices in the opposite order, we find that $BA=I$, which says that $B$ is also invertible and that $B^{-1} = A$. In other words, $A$ and $B$ are inverses of each other.
:::

:::activity {act:activity-3-1-2} Activity 3.1.2
This activity demonstrates a procedure for finding the inverse of a matrix $A$.

a) 
    Suppose that $A = \begin{bmatrix} 3 & -2 \\ 1 & -1 \\ \end{bmatrix}$. To find an inverse $B$, we write its columns as $B = \begin{bmatrix}{\mathbf b}_1 & {\mathbf b}_2 \end{bmatrix}$ and require that

    $$ \begin{aligned} AB & = I \\ \begin{bmatrix} A{\mathbf b}_1 & A{\mathbf b}_2 \end{bmatrix} & = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix}. \end{aligned} $$

    In other words, we can find the columns of $B$ by solving the equations

    $$ A{\mathbf b}_1 = \left[\begin{array}{r}1 \\ 0 \end{array}\right],~~~ A{\mathbf b}_2 = \left[\begin{array}{r}0 \\ 1 \end{array}\right]. $$

    Solve these equations to find ${\mathbf b}_1$ and ${\mathbf b}_2$. Then write the matrix $B$ and verify that $AB=I$. This is enough for us to conclude that $B$ is the inverse of $A$.

    :::sage
    ```sage

    ```
    :::

b) 
    Find the product $BA$ and explain why we now know that $B$ is invertible and $B^{-1}=A$.

    :::sage
    ```sage

    ```
    :::

c) 
    What happens when you try to find the inverse of $C = \begin{bmatrix} -2 & 1 \\ 4 & -2 \\ \end{bmatrix}$?

d) 
    We now develop a condition that must be satisfied by an invertible matrix. Suppose that $A$ is an invertible $n\times n$ matrix with inverse $B$ and suppose that ${\mathbf b}$ is any $n$-dimensional vector. Since $AB=I$, we have

    $$ A(B{\mathbf b}) = (AB){\mathbf b} = I{\mathbf b} = {\mathbf b}. $$

    This says that the equation $A{\mathbf x} = {\mathbf b}$ is consistent and that ${\mathbf x}=B{\mathbf b}$ is a solution.

    Since we know that $A{\mathbf x} = {\mathbf b}$ is consistent for any vector ${\mathbf b}$, what does this say about the span of the columns of $A$?

e) 
    Since $A$ is a square matrix, what does this say about the pivot positions of $A$? What is the reduced row echelon form of $A$?

f) 
    In this activity, we have studied the matrices

    $$ A = \begin{bmatrix} 3 & -2 \\ 1 & -1 \\ \end{bmatrix},~~~ C = \begin{bmatrix} -2 & 1 \\ 4 & -2 \\ \end{bmatrix}. $$

    Find the reduced row echelon form of each and explain how those forms enable us to conclude that one matrix is invertible and the other is not.

SOLUTION:

a) 
    Solving the two equations for ${\mathbf b}_1$ and ${\mathbf b}_2$ gives $B = \begin{bmatrix} 1 & -2 \\ 1 & -3 \\ \end{bmatrix}$. We can verify that, as we expect, $AB=I$.

b) 
    We find that $BA=I$, which is the condition that tells us that $B$ is invertible.

c) 
    Seeking the first column of $C^{-1}$, we see that the equation $C{\mathbf x} = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ is not consistent. This means that $C$ is not invertible.

d) 
    Since the equation $A{\mathbf x} = {\mathbf b}$ is consistent for every ${\mathbf b}$, we know that the span of the columns of $A$ is ${\mathbb R}^n$.

e) 
    Because the span of the columns of $A$ is ${\mathbb R}^n$, there is a pivot position in every row. Since $A$ is square, there is also a pivot position in every column. This means that the reduced row echelon form of $A$ must be the identity matrix $I_n$.

f) 
    We see that

    $$ A\sim \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix},~~~ C\sim \begin{bmatrix} 1 & -\frac12 \\ 0 & 0 \\ \end{bmatrix}, $$

    which shows that $A$ is invertible and $C$ is not.

:::

:::example {ex:example-inverse-augment-I} Example 3.1.3
We can reformulate this procedure for finding the inverse of a matrix. For the sake of convenience, suppose that $A$ is a $2\times2$ invertible matrix with inverse $B=\begin{bmatrix} {\mathbf b}_1 & {\mathbf b}_2 \end{bmatrix}$. Rather than solving the equations

$$ A{\mathbf b}_1 = \left[\begin{array}{r}1 \\ 0 \end{array}\right],~~~ A{\mathbf b}_2 = \left[\begin{array}{r}0 \\ 1 \end{array}\right] $$

separately, we can solve them at the same time by augmenting $A$ by both vectors $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and $\left[\begin{array}{r}0 \\ 1 \end{array}\right]$ and finding the reduced row echelon form.
For example, if $A = \begin{bmatrix} 1 & 2 \\ 1 & 1 \\ \end{bmatrix}$, we form

$$ \left[ \begin{array}{rr|rr} 1 & 2 & 1 & 0 \\ 1 & 1 & 0 & 1 \\ \end{array} \right] \sim \left[ \begin{array}{rr|rr} 1 & 0 & -1 & 2 \\ 0 & 1 & 1 & -1 \\ \end{array} \right]. $$

This shows that the matrix $B = \begin{bmatrix} -1 & 2 \\ 1 & 1 \\ \end{bmatrix}$ is the inverse of $A$.
In other words, beginning with $A$, we augment by the identify and find the reduced row echelon form to determine $A^{-1}$:

$$ \left[ \begin{array}{r|r} A & I \\ \end{array} \right] \sim \left[ \begin{array}{r|r} I & A^{-1} \\ \end{array} \right]. $$

:::

In fact, this reformulation will always work. Suppose that $A$ is an invertible $n\times n$ matrix with inverse $B$. Suppose furthermore that ${\mathbf b}$ is any $n$-dimensional vector and consider the equation $A{\mathbf x} = {\mathbf b}$. We know that $x=B{\mathbf b}$ is a solution because $A(B{\mathbf b}) = (AB){\mathbf b} = I{\mathbf b} = {\mathbf b}.$

:::proposition {prop:proposition-inverse-solve} Proposition 3.1.4
If $A$ is an invertible matrix with inverse $B$, then any equation $A{\mathbf x} = {\mathbf b}$ is consistent and ${\mathbf x} = B{\mathbf b}$ is a solution. In other words, the solution to $A{\mathbf x} = {\mathbf b}$ is ${\mathbf x} = A^{-1}{\mathbf b}$.
:::

Notice that this is similar to saying that the solution to $3x=5$ is $x = \frac13\cdot 5$, as we saw in the preview activity.

Now since $A{\mathbf x}={\mathbf b}$ is consistent for every vector ${\mathbf b}$, the columns of $A$ must span ${\mathbb R}^n$ so there is a pivot position in every row. Since $A$ is also square, this means that the reduced row echelon form of $A$ is the identity matrix.

:::proposition {prop:proposition-invertible-rref} Proposition 3.1.5
The matrix $A$ is invertible if and only if the reduced row echelon form of $A$ is the identity matrix: $A\sim I$. In addition, we can find the inverse by augmenting $A$ by the identity and finding the reduced row echelon form:

$$ \left[ \begin{array}{r|r} A & I \\ \end{array} \right] \sim \left[ \begin{array}{r|r} I & A^{-1} \\ \end{array} \right]. $$

:::

You may have noticed that [Proposition 3.1.4](ref:proposition-inverse-solve) says that *the* solution to the equation $A{\mathbf x} = {\mathbf b}$ is ${\mathbf x} = A^{-1}{\mathbf b}$. Indeed, we know that this equation has a unique solution because $A$ has a pivot position in every column.

It is important to remember that the product of two matrices depends on the order in which they are multiplied. That is, if $C$ and $D$ are matrices, then it sometimes happens that $CD \neq DC$. However, something fortunate happens when we consider invertibility. It turns out that if $A$ is an $n\times n$ matrix and that $AB=I$, then it is also true that $BA=I$. We have verified this in a few examples so far, and [Exercise 3.1.12](ref:ex-right-inverse) explains why it always happens. This leads to the following proposition.

:::proposition {prop:proposition-inverse-inverse} Proposition 3.1.6
If $A$ is a $n\times n$ invertible matrix with inverse $B$, then $BA=I$, which tells us that $B$ is invertible with inverse $A$. In other words,

$$ (A^{-1})^{-1} = A. $$

:::

## 3.1.3 Solving equations with an inverse

If $A$ is an invertible matrix, then [Proposition 3.1.4](ref:proposition-inverse-solve) shows us how to use $A^{-1}$ to solve equations involving $A$. In particular, the solution to $A{\mathbf x} = {\mathbf b}$ is ${\mathbf x} = A^{-1}{\mathbf b}$.

:::activity {act:activity-3-1-3} Activity 3.1.3
We'll begin by considering the square matrix

$$ A = \begin{bmatrix} 1 & 0 & 2 \\ 2 & 2 & 1 \\ 1 & 1 & 1 \\ \end{bmatrix}. $$

a) 
    Describe the solution space to the equation $A{\mathbf x} = \left[\begin{array}{r}3 \\ 4 \\ 3 \end{array}\right]$ by augmenting $A$ and finding the reduced row echelon form.

    :::sage
    ```sage

    ```
    :::

b) 
    Using [Proposition 3.1.5](ref:proposition-invertible-rref), explain why $A$ is invertible and find its inverse.

c) 
    Now use the inverse to solve the equation $A{\mathbf x} = \left[\begin{array}{r}3 \\ 4 \\ 3 \end{array}\right]$ and verify that your result agrees with what you found in part a.

d) 
    If you have defined a matrix `B` in Sage, you can find it's inverse as `B.inverse()` or `B^-1`. Use Sage to find the inverse of the matrix

    $$ B = \left[\begin{array}{rrr} 1 & -2 & -1 \\ -1 & 5 & 6 \\ 5 & -4 & 6 \\ \end{array}\right] $$

    and use it to solve the equation $B{\mathbf x} = \left[\begin{array}{r}8 \\ 3 \\ 36 \end{array}\right]$.

    :::sage
    ```sage

    ```
    :::

e) 
    If $A$ and $B$ are the two matrices defined in this activity, find their product $AB$ and verify that it is invertible.

f) 
    Compute the products $A^{-1}B^{-1}$ and $B^{-1}A^{-1}$. Which one agrees with $(AB)^{-1}$?

g) 
    Explain your finding by considering the product

    $$ (AB)(B^{-1}A^{-1}) $$

    and using associativity to regroup the products so that the middle two terms are multiplied first.

SOLUTION:

a) 
    Constructing the augmented matrix, we see that

    $$ \left[\begin{array}{rrr|r} 1 & 0 & 2 & 3 \\ 2 & 2 & 1 & 4 \\ 1 & 1 & 1 & 3 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 0 & -1 \\ 0 & 1 & 0 & 2 \\ 0 & 0 & 1 & 2 \end{array}\right], $$

    which says that there is a unique solution ${\mathbf x} = \left[\begin{array}{r}-1 \\ 2 \\ 2 \end{array}\right]$.

b) 
    Our work in part a shows that $A\sim I$ from which we conclude that $A$ is invertible. To find the inverse,

    $$ \left[\begin{array}{rrr|rrr} 1 & 0 & 2 & 1 & 0 & 0 \\ 2 & 2 & 1 & 0 & 1 & 0 \\ 1 & 1 & 1 & 0 & 0 & 1 \end{array}\right] \sim \left[\begin{array}{rrr|rrr} 1 & 0 & 0 & 1 & 2 & -4 \\ 0 & 1 & 0 & -1 & -1 & 3 \\ 0 & 0 & 1 & 0 & -1 & 2 \end{array}\right], $$

    which says that

    $$ A^{-1} = \begin{bmatrix} 1 & 2 & -4 \\ -1 & -1 & 3 \\ 0 & -1 & 2 \\ \end{bmatrix}. $$

c) 
    We see that $A^{-1}\left[\begin{array}{r}3 \\ 4 \\ 3 \end{array}\right] = \left[\begin{array}{r}-1 \\ 2 \\ 2 \end{array}\right]$.

d) 
    Sage tells us that $B^{-1}\left[\begin{array}{r}8 \\ 3 \\ 36 \end{array}\right] = \left[\begin{array}{r}76 \\ 47 \\ -26 \end{array}\right]$.

e) 
    Sage helps us see that $(AB)\sim I$, which tells us that $AB$ is invertible.

f) 
    We find that $(AB)^{-1} = B^{-1}A^{-1}$.

g) 
    We see that

    $$ (AB)(B^{-1}A^{-1}) = A(BB^{-1})A^{-1} = AIA^{-1} = AA^{-1} = I. $$

:::

The next proposition summarizes much of what we have found about invertible matrices.

:::proposition {prop:proposition-invertible-properties} Proposition 3.1.7 (Properties of invertible matrices)

- 
    An $n\times n$ matrix $A$ is invertible if and only if $A\sim I$.

- 
    If $A$ is invertible, then the solution to the equation $A{\mathbf x} = {\mathbf b}$ is given by ${\mathbf x} = A^{-1}{\mathbf b}$.

- 
    We can find $A^{-1}$ by finding the reduced row echelon form of $\left[\begin{array}{r|r} A & I \end{array}\right]$; namely,

    $$ \left[\begin{array}{r|r} A & I \end{array}\right] \sim \left[\begin{array}{r|r} I & A^{-1} \end{array}\right] $$

    .

- 
    If $A$ and $B$ are two invertible $n\times n$ matrices, then their product $AB$ is also invertible and $(AB)^{-1} = B^{-1}A^{-1}$.

:::

There is a simple formula for finding the inverse of a $2\times2$ matrix:

$$ \left[\begin{array}{rr} a & b \\ c & d \\ \end{array}\right]^{-1} = \frac{1}{ad-bc} \left[\begin{array}{rr} d & -b \\ -c & a \\ \end{array}\right] $$

, which can be easily checked. The condition that $A$ be invertible is, in this case, reduced to the condition that $ad-bc\neq 0$. We will understand this condition better once we have explored determinants in [Section 3.4](ref:3.4#sec-determinants). There is a similar formula for the inverse of a $3\times 3$ matrix, but there is not a good reason to write it here.

## 3.1.4 Triangular matrices and Gaussian elimination {subsec-triangular-invertible}

With some of the ideas we've developed, we can recast the Gaussian elimination algorithm in terms of matrix multiplication and invertibility. This will be especially helpful later when we consider [determinants](ref:3.4#sec-determinants) and [LU factorizations.](ref:5.1#sec-gaussian-revisited) Triangular matrices will play an important role.

:::definition {def:definition-3-1-8} Definition 3.1.8
{index-entry:lower triangular matrix} {index-entry:upper triangular matrix} We say that a matrix $A$ is *lower triangular* if all its entries above the diagonal are zero. Similarly, $A$ is *upper triangular* if all the entries below the diagonal are zero.
:::

For example, the matrix $L$ below is a lower triangular matrix while $U$ is an upper triangular one.

$$ L = \left[\begin{array}{rrrr} * & 0 & 0 & 0 \\ * & * & 0 & 0 \\ * & * & * & 0 \\ * & * & * & * \\ \end{array}\right], \hspace{24pt} U = \left[\begin{array}{rrrr} * & * & * & * \\ 0 & * & * & * \\ 0 & 0 & * & * \\ 0 & 0 & 0 & * \\ \end{array}\right] $$

.

We can develop a simple test to determine whether an $n\times n$ lower triangular matrix is invertible. Let's use Gaussian elimination to find the reduced row echelon form of the lower triangular matrix

$$ \begin{aligned} \left[\begin{array}{rrr} 1 & 0 & 0 \\ 2 & -2 & 0 \\ -3 & 4 & -4 \\ \end{array}\right] & {}\sim{} \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & -2 & 0 \\ 0 & 4 & -4 \\ \end{array}\right] \\ & {}\sim{} \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & -2 & 0 \\ 0 & 0 & -4 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]\text{.} \end{aligned} $$

Because the entries on the diagonal are nonzero, we find a pivot position in every row, which tells us that the matrix is invertible.

If, however, there is a zero entry on the diagonal, the matrix cannot be invertible. Considering the matrix below, we see that having a zero on the diagonal leads to a row without a pivot position.

$$ \left[\begin{array}{rrr} 1 & 0 & 0 \\ 2 & 0 & 0 \\ -3 & 4 & -4 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 0 & 0 \\ 0 & 4 & -4 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & -1 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

:::proposition {prop:proposition-triangular-invertibility} Proposition 3.1.9
An $n\times n$ triangular matrix is invertible if and only if the entries on the diagonal are all nonzero.
:::

:::activity {act:activity-3-1-4} Activity 3.1.4 (Gaussian elimination and matrix multiplication)
This activity explores how the row operations of scaling, interchange, and replacement can be performed using matrix multiplication.
As an example, we consider the matrix

$$ A = \left[\begin{array}{rrr} 1 & 2 & 1 \\ 2 & 0 & -2 \\ -1 & 2 & -1 \\ \end{array}\right] $$

and apply a replacement operation that multiplies the first row by $-2$ and adds it to the second row. Rather than performing this operation in the usual way, we construct a new matrix by applying the desired replacement operation to the identity matrix. To illustrate, we begin with the identity matrix

$$ I = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix} $$

and form a new matrix by multiplying the first row by $-2$ and adding it to the second row to obtain

$$ R = \begin{bmatrix} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix}. $$

a) 
    Show that the product $RA$ is the result of applying the replacement operation to $A$.

    :::sage
    ```sage

    ```
    :::

b) 
    Explain why $R$ is invertible and find its inverse $R^{-1}$.

c) 
    Describe the relationship between $R$ and $R^{-1}$ and use the connection to replacement operations to explain why it holds.

d) 
    Other row operations can be performed using a similar procedure. For instance, suppose we want to scale the second row of $A$ by $4$. Find a matrix $S$ so that $SA$ is the same as that obtained from the scaling operation. Why is $S$ invertible and what is $S^{-1}$?

    :::sage
    ```sage

    ```
    :::

e) 
    Finally, suppose we want to interchange the first and third rows of $A$. Find a matrix $P$, usually called a *permutation matrix* that performs this operation. What is $P^{-1}$?

f) 
    The original matrix $A$ is seen to be row equivalent to the upper triangular matrix $U$ by performing three replacement operations on $A$:

    $$ A = \left[\begin{array}{rrr} 1 & 2 & 1 \\ 2 & 0 & -2 \\ -1 & 2 & -1 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 2 & 1 \\ 0 & -4 & -4 \\ 0 & 0 & -4 \\ \end{array}\right] = U. $$

    Find the matrices $L_1$, $L_2$, and $L_3$ that perform these row replacement operations so that $L_3L_2L_1 A = U$.

g) 
    Explain why the matrix product $L_3L_2L_1$ is invertible and use this fact to write $A = LU$. What is the matrix $L$ that you find? Why do you think we denote it by $L$?

    :::sage
    ```sage

    ```
    :::

SOLUTION:

a) 
    Performing the matrix multiplication, we find that

    $$ RA = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 1 & 2 & 1 \\ 2 & 0 & -2 \\ -1 & 2 & -1 \\ \end{array}\right] = \left[\begin{array}{rrr} 1 & 2 & 1 \\ 0 & -4 & -4 \\ -1 & 2 & -1 \\ \end{array}\right]\text{.} $$

b) 
    We know that $R$ is invertible because it is a lower triangular matrix whose diagonal entries are all 1. We find that $R^{-1} = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 2 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$, which can be verified.

c) 
    But we can see this in another way as well. The replacement operation is reversible; that is, multiplying the first row by $-2$ and adding it to the second row can be undone by multiplying the first row by $2$ and adding it to the second row.

d) 
    We find that

    $$ S = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 4 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix},~~~ S^{-1} = \begin{bmatrix} 1 & 0 & 0 \\ 0 & \frac14 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix}. $$

    This makes sense because scaling a row by $4$ can be undone by scaling the same row by $\frac14$.

e) 
    We find that

    $$ P = \begin{bmatrix} 0 & 0 & 1 \\ 0 & 1 & 0 \\ 1 & 0 & 0 \\ \end{bmatrix}. $$

    Moreover, $P=P^{-1}$ because we can undo the interchange operation by repeating it.

f) 
    Continuing with the Gaussian elimination algorithm, we have $L_1 = R$, as above,

    $$ L_2 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 1 & 0 & 1 \\ \end{array}\right],~~~ L_3 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 1 & 1 \\ \end{array}\right]\text{.} $$

    we then have $L_3L_2L_1A = U$.

g) 
    Each of the matrices $L_1$, $L_2$, and $L_3$ is invertible so their product will be as well. Since $(L_3L_2L_1)A = U$, we have $A = (L_3L_2L_1)^{-1}U$. Moreover, $L = (L_3L_2L_1)^{-1} = L_1^{-1}L_2^{-1}L_3^{-1}$ gives $L=\left[\begin{array}{rrr} 1 & 0 & 0 \\ 2 & 1 & 0 \\ -1 & -1 & 1 \\ \end{array}\right]$. Notice that this matrix is lower triangular so we call it $L$.

:::

{index-entry:matrix, elementary} The following are examples of matrices, known as *elementary matrices*, that perform the row operations on a matrix having three rows.

- **Replacement**: 
    Multiplying the second row by 3 and adding it to the third row is performed by

    $$ L = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 3 & 1 \\ \end{bmatrix}. $$

    We often use $L$ to describe these matrices because they are lower triangular.

- **Scaling**: 
    Multiplying the third row by 2 is performed by

    $$ S = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 2 \\ \end{bmatrix}. $$

- **Interchange**: 
    Interchanging the first two rows is performed by

    $$ P = \begin{bmatrix} 0 & 1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix}. $$

:::example {ex:example-3-1-10} Example 3.1.10
Suppose we have

$$ A = \left[\begin{array}{rrr} 1 & 3 & -2 \\ -3 & -6 & 3 \\ 2 & 0 & -2 \\ \end{array}\right]. $$

For the forward substitution phase of Gaussian elimination, we perform a sequence of three replacement operations. The first replacement operation multiplies the first row by $3$ and adds the result to the second row. We can perform this operation by multiplying $A$ by the lower triangular matrix $L_1$ where

$$ L_1A = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 3 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 1 & 3 & -2 \\ -3 & -6 & 3 \\ 2 & 0 & -2 \\ \end{array}\right] = \left[\begin{array}{rrr} 1 & 3 & -2 \\ 0 & 3 & -3 \\ 2 & 0 & -2 \\ \end{array}\right]. $$

The next two replacement operations are performed by the matrices

$$ L_2 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ -2 & 0 & 1 \\ \end{array}\right], \hspace{24pt} L_3 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 2 & 1 \\ \end{array}\right] $$

so that

$$ L_3L_2L_1A = U = \begin{bmatrix} 1 & 3 & -2 \\ 0 & 3 & -3 \\ 0 & 0 & -4 \\ \end{bmatrix}. $$

Notice that the inverse of $L_1$ has the simple form:

$$ L_1 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 3 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right], \hspace{24pt} L_1^{-1} = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -3 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] $$

. This says that if we want to undo the operation of multiplying the first row by $3$ and adding to the second row, we should multiply the first row by $-3$ and add it to the second row. That is the effect of $L_1^{-1}$.
Notice that we now have $L_3L_2L_1A = U$, which gives

$$ \begin{aligned} (L_3L_2L_1)A & = U \\ (L_3L_2L_1)^{-1}(L_3L_2L_1)A & = (L_3L_2L_1)^{-1}U \\ A & = (L_3L_2L_1)^{-1}U = LU\\ \end{aligned} $$

where $L$ is the lower triangular matrix

$$ L = (L_3L_2L_1)^{-1}=\begin{bmatrix} 1 & 0 & 0 \\ -3 & 1 & 0 \\ 2 & -2 & 1 \\ \end{bmatrix}. $$

This way of writing $A=LU$ as the product of a lower and an upper triangular matrix is known as an $LU$ factorization of $A$, and its usefulness will be explored in [Section 5.1](ref:5.1#sec-gaussian-revisited).
:::

## 3.1.5 Summary

In this section, we found conditions guaranteeing that a matrix has an inverse. When these conditions hold, we also found an algorithm for finding the inverse.

- 
    A square matrix is invertible if there is a matrix $B$, known as the inverse of $A$, such that $AB = I$. We usually write $A^{-1} = B$.

- 
    The $n\times n$ matrix $A$ is invertible if and only if it is row equivalent to $I_n$, the $n\times n$ identity matrix.

- 
    If a matrix $A$ is invertible, we can use Gaussian elimination to find its inverse:

    $$ \left[\begin{array}{r|r} A & I \end{array}\right] \sim \left[\begin{array}{r|r} I & A^{-1} \end{array}\right] $$

    .

- 
    If a matrix $A$ is invertible, then the solution to the equation $A{\mathbf x} = {\mathbf b}$ is ${\mathbf x} = A^{-1}{\mathbf b}$.

- 
    The row operations of replacement, scaling, and interchange can be performed by multiplying by elementary matrices.

## 3.1.6 Exercises

:::exercise {exercise-3-1-001} number=3.1.1 answered=yes src=src/exercises/exercises3-1.xml:5
PROBLEM:
Consider the matrix

$$ A = \left[\begin{array}{rrrr} 3 & -1 & 1 & 4 \\ 0 & 2 & 3 & 1 \\ -2 & 1 & 0 & -2 \\ 3 & 0 & 1 & 2 \\ \end{array}\right] $$

.
:::sage
```sage

```
:::

a) 
    Explain why $A$ has an inverse.

b) 
    Find the inverse of $A$ by augmenting by the identity $I$ to form $\left[\begin{array}{r|r}A & I \end{array}\right]$.

c) 
    Use your inverse to solve the equation $A{\mathbf x} = \left[\begin{array}{r}3 \\ 2 \\ -3 \\ -1 \end{array}\right]$.

ANSWER:

a) 
    $A\sim I$

b) 
    $A^{-1} = \left[\begin{array}{rrrr} -\frac{1}{2} & 0 & -\frac{1}{2} & \frac{1}{2} \\ 4 & -2 & 9 & 2 \\ -\frac{7}{2} & 2 & -\frac{15}{2} & -\frac{3}{2} \\ \frac{5}{2} & -1 & \frac{9}{2} & \frac{1}{2} \end{array}\right]\text{.}$

c) 
    ${\mathbf x}= \left[\begin{array}{r}-\frac12 \\ -21 \\ \frac{35}2 \\ -\frac{17}{2} \end{array}\right]$.

SOLUTION:

a) 
    We see that $A\sim I$, the identity matrix, which implies that $A$ has an inverse.

b) 
    We have

    $$ \begin{array}{l} \left[\begin{array}{rrrr|rrrr} 3 & -1 & 1 & 4 & 1 & 0 & 0 & 0 \\ 0 & 2 & 3 & 1 & 0 & 1 & 0 & 0 \\ -2 & 1 & 0 & -2 & 0 & 0 & 1 & 0 \\ 3 & 0 & 1 & 2 & 0 & 0 & 0 & 1 \end{array}\right] \\ \sim \left[\begin{array}{rrrr|rrrr} 1 & 0 & 0 & 0 & -\frac{1}{2} & 0 & -\frac{1}{2} & \frac{1}{2} \\ 0 & 1 & 0 & 0 & 4 & -2 & 9 & 2 \\ 0 & 0 & 1 & 0 & -\frac{7}{2} & 2 & -\frac{15}{2} & -\frac{3}{2} \\ 0 & 0 & 0 & 1 & \frac{5}{2} & -1 & \frac{9}{2} & \frac{1}{2} \end{array}\right]\text{,} \end{array} $$

    which says that

    $$ A^{-1} = \left[\begin{array}{rrrr} -\frac{1}{2} & 0 & -\frac{1}{2} & \frac{1}{2} \\ 4 & -2 & 9 & 2 \\ -\frac{7}{2} & 2 & -\frac{15}{2} & -\frac{3}{2} \\ \frac{5}{2} & -1 & \frac{9}{2} & \frac{1}{2} \end{array}\right]\text{.} $$

c) 
    We compute that ${\mathbf x}=A^{-1}\left[\begin{array}{r}3 \\ 2 \\ -3 \\ -1 \end{array}\right] = \left[\begin{array}{r}-\frac12 \\ -21 \\ \frac{35}2 \\ -\frac{17}{2} \end{array}\right]$.

:::

:::exercise {exercise-3-1-002} number=3.1.2 answered=yes src=src/exercises/exercises3-1.xml:111
PROBLEM:
In this exercise, we will consider $2\times 2$ matrices as defining matrix transformations.

a) 
    Write the matrix $A$ that performs a $45^\circ$ rotation. What geometric operation undoes this rotation? Find the matrix that perform this operation and verify that it is $A^{-1}$.

b) 
    Write the matrix $A$ that performs a $180^\circ$ rotation. Verify that $A^2 = I$ so that $A^{-1} = A$, and explain geometrically why this is the case.

c) 
    Find three more matrices $A$ that satisfy $A^2 = I$.

ANSWER:

a) 
    $A=\left[\begin{array}{rr} \frac1{\sqrt{2}} & -\frac1{\sqrt{2}} \\ \frac1{\sqrt{2}} & \frac1{\sqrt{2}} \\ \end{array}\right]$ and $A^{-1}=\left[\begin{array}{rr} \frac1{\sqrt{2}} & \frac1{\sqrt{2}} \\ -\frac1{\sqrt{2}} & \frac1{\sqrt{2}} \\ \end{array}\right]$.

b) 
    $A=\left[\begin{array}{rr} -1 & 0 \\ 0 & -1 \\ \end{array}\right]$.

c) 

    $$ \left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right], \left[\begin{array}{rr} -1 & 0 \\ 0 & 1 \\ \end{array}\right], \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right]\text{.} $$

SOLUTION:

a) 
    $A=\left[\begin{array}{rr} \frac1{\sqrt{2}} & -\frac1{\sqrt{2}} \\ \frac1{\sqrt{2}} & \frac1{\sqrt{2}} \\ \end{array}\right]$. To undo the rotation, we will perform a $45^\circ$ clockwise rotation, which is defined by the matrix $A^{-1}=\left[\begin{array}{rr} \frac1{\sqrt{2}} & \frac1{\sqrt{2}} \\ -\frac1{\sqrt{2}} & \frac1{\sqrt{2}} \\ \end{array}\right]$.

b) 
    $A=\left[\begin{array}{rr} -1 & 0 \\ 0 & -1 \\ \end{array}\right]$. We see that $A^2=I$ because rotating by $180^\circ$ is its own inverse.

c) 
    We can do this by constructing matrices that define reflections, such as

    $$ \left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right], \left[\begin{array}{rr} -1 & 0 \\ 0 & 1 \\ \end{array}\right], \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right]\text{.} $$

:::

:::exercise {exercise-3-1-003} number=3.1.3 answered=yes src=src/exercises/exercises3-1.xml:217
PROBLEM:
Inverses for certain types of matrices can be found in a relatively straightforward fashion.

a) 
    The matrix $D=\begin{bmatrix} 2 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & -4 \\ \end{bmatrix}$ is called *diagonal* since the only nonzero entries are on the diagonal of the matrix.

    1. 
        Find $D^{-1}$ by augmenting $D$ by the identity and finding its reduced row echelon form.

    2. 
        Under what conditions is a diagonal matrix invertible?

    3. 
        Explain why the inverse of a diagonal matrix is also diagonal and explain the relationship between the diagonal entries in $D$ and $D^{-1}$.

b) 
    Consider the lower triangular matrix $L = \begin{bmatrix} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 3 & -4 & 1 \\ \end{bmatrix}$.

    1. 
        Find $L^{-1}$ by augmenting $L$ by the identity and finding its reduced row echelon form.

    2. 
        Explain why the inverse of a lower triangular matrix is also lower triangular.

ANSWER:

a) 

    1. 
        $D^{-1} = \begin{bmatrix} \frac12 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & \frac14 \\ \end{bmatrix}$.

    2. 
        When the entries on the diagonal are all nonzero.

    3. 
        Consider the steps performed in row reducing $D$ augmented by $I$.

b) 

    1. 
        $L^{-1} = \begin{bmatrix} 1 & 0 & 0 \\ 2 & 1 & 0 \\ 5 & 4 & 1 \end{bmatrix}$.

    2. 
        Consider the steps in row reducing $L$ augmented by $I$.

SOLUTION:

a) 

    1. 
        $D^{-1} = \begin{bmatrix} \frac12 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & \frac14 \\ \end{bmatrix}$.

    2. 
        When the entries on the diagonal are all nonzero.

    3. 
        Because the process of row reducing $D$ augmented by $I$ can be performed using only scalings. Then the diagonal entries of $D$ and $D^{-1}$ are reciprocals of one another.

b) 

    1. 
        $L^{-1} = \begin{bmatrix} 1 & 0 & 0 \\ 2 & 1 & 0 \\ 5 & 4 & 1 \end{bmatrix}$.

    2. 
        $L^{-1}$ is always lower triangular because the only row operations needed to row reduce $L$ augmented by $I$ are replacements in which a multiple of one row is added to a row underneath it.

:::

:::exercise {exercise-3-1-004} number=3.1.4 answered=yes src=src/exercises/exercises3-1.xml:405
PROBLEM:
Our definition of an invertible matrix requires that $A$ be a square $n\times n$ matrix. Let's examine what happens when $A$ is not square. For instance, suppose that

$$ A = \left[\begin{array}{rr} -1 & -1 \\ -2 & -1 \\ 3 & 0 \\ \end{array}\right], \hspace{24pt} B = \left[\begin{array}{rrr} -2 & 2 & 1 \\ 1 & -2 & -1 \\ \end{array}\right] $$

.

a) 
    Verify that $BA = I_2$. In this case, we say that $B$ is a *left* inverse of $A$.

    :::sage
    ```sage

    ```
    :::

b) 
    If $A$ has a left inverse $B$, we can still use it to find solutions to linear equations. If we know there is a solution to the equation $A{\mathbf x} = {\mathbf b}$, we can multiply both sides of the equation by $B$ to find ${\mathbf x} = B{\mathbf b}$.

    Suppose you know there is a solution to the equation $A{\mathbf x} = \left[\begin{array}{r}-1 \\ -3 \\ 6 \end{array}\right]$. Use the left inverse $B$ to find ${\mathbf x}$ and verify that it is a solution.

c) 
    Now consider the matrix

    $$ C = \left[\begin{array}{rrr} 1 & -1 & 0 \\ -2 & 1 & 0 \\ \end{array}\right] $$

    and verify that $C$ is also a left inverse of $A$. This shows that the matrix $A$ may have more than one left inverse.

ANSWER:

a) 
    $BA=I_2$.

b) 
    ${\mathbf x}= \left[\begin{array}{r}2 \\ -1 \end{array}\right]$

c) 
    $CA=I_2$.

SOLUTION:

a) 
    We compute that $BA=I_2$.

b) 
    We find ${\mathbf x}=B\left[\begin{array}{r}-1 \\ -3 \\ 6 \end{array}\right] = \left[\begin{array}{r}2 \\ -1 \end{array}\right]$, which is indeed a solution to the equation $A{\mathbf x}=\left[\begin{array}{r}-1 \\ -3 \\ 6 \end{array}\right]$.

c) 
    In the same way, we compute $CA=I_2$.

:::

:::exercise {exercise-3-1-005} number=3.1.5 answered=yes src=src/exercises/exercises3-1.xml:499
PROBLEM:
If a matrix $A$ is invertible, there is a sequence of row operations that transforms $A$ into the identity matrix $I$. We have seen that every row operation can be performed by matrix multiplication. If the $j^{th}$ step in the Gaussian elimination process is performed by multiplying by $E_j$, then we have

$$ E_p\cdots E_2E_1 A = I $$

, which means that

$$ A^{-1} = E_p\cdots E_2E_1 $$

. For each of the following matrices, find a sequence of row operations that transforms the matrix to the identity $I$. Write the matrices $E_j$ that perform the steps and use them to find $A^{-1}$.

a) 

    $$ A = \left[\begin{array}{rrr} 0 & 2 & 0 \\ -3 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] $$

    .

b) 

    $$ A = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 2 & 1 & 0 & 0 \\ 0 & -3 & 1 & 0 \\ 0 & 0 & 2 & 1 \\ \end{array}\right] $$

    .

c) 

    $$ A = \left[\begin{array}{rrr} 1 & 1 & 1 \\ 0 & 1 & 1 \\ 0 & 0 & 2 \\ \end{array}\right] $$

    .

ANSWER:

a) 
    $A^{-1}= \left[\begin{array}{rrr} 0 & -\frac13 & 0 \\ \frac12 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    $A^{-1} = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ -2 & 1 & 0 & 0 \\ -6 & 3 & 1 & 0 \\ 12 & -6 & -2 & 1 \\ \end{array}\right]$.

c) 
    $A^{-1} = \left[\begin{array}{rrr} 1 & -1 & 0 \\ 0 & 1 & -\frac12 \\ 0 & 0 & \frac12 \\ \end{array}\right]$.

SOLUTION:

a) 
    If

    $$ P = \left[\begin{array}{rrr} 0 & 1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right], S_1 = \left[\begin{array}{rrr} -\frac13 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right], S_2 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & \frac12 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]\text{,} $$

    then $S_2S_1P A = I$ so that $A^{-1}=S_2S_1P= \left[\begin{array}{rrr} 0 & -\frac13 & 0 \\ \frac12 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    We use three replacement operations

    $$ \begin{array}{l} L_1 = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ -2 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right], L_2 = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 3 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right], \\ L_3 = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & -2 & 1 \\ \end{array}\right]\text{.} \end{array} $$

    Therefore, $L_3L_2L_1A = I$ so $A^{-1} = L_3L_2L_1 = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ -2 & 1 & 0 & 0 \\ -6 & 3 & 1 & 0 \\ 12 & -6 & -2 & 1 \\ \end{array}\right]$.

c) 
    We use a scaling followed by replacement operations:

    $$ S = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & \frac12 \\ \end{array}\right], U_1 = \left[\begin{array}{rrr} 1 & 0 & -1 \\ 0 & 1 & -1 \\ 0 & 0 & 1 \\ \end{array}\right], U_2 = \begin{bmatrix} 1 & 0 & -1 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix}, U_3 = \left[\begin{array}{rrr} 1 & -1 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]\text{.} $$

    This gives $U_3U_2U_1SA = I$ so that $A^{-1} = U_3U_2U_1S = \left[\begin{array}{rrr} 1 & -1 & 0 \\ 0 & 1 & -\frac12 \\ 0 & 0 & \frac12 \\ \end{array}\right]$.

:::

:::exercise {exercise-3-1-006} number=3.1.6 answered=yes src=src/exercises/exercises3-1.xml:698
PROBLEM:
Suppose that $A$ is an $n\times n$ matrix.

a) 
    Suppose that $A^2 = AA$ is invertible with inverse $B$. This means that $A^2B = AAB = I$. Explain why $A$ must be invertible with inverse $AB$.

b) 
    Suppose that $A^{100}$ is invertible with inverse $B$. Explain why $A$ is invertible. What is $A^{-1}$ in terms of $A$ and $B$?

ANSWER:

a) 
    If $A^2$ has inverse $B$, then $A^2B = I$. This means that $A(AB)=I$ so $A$ is invertible with inverse $AB$.

b) 
    In the same way, we have $A^{100}B = A(A^{99}B)=I$, which shows that $A^{-1}=A^{99}B$.

SOLUTION:

a) 
    If $A^2$ has inverse $B$, then $A^2B = I$. This means that $A(AB)=I$ so $A$ is invertible with inverse $AB$.

b) 
    In the same way, we have $A^{100}B = A(A^{99}B)=I$, which shows that $A^{-1}=A^{99}B$.

:::

:::exercise {exercise-3-1-007} number=3.1.7 answered=yes src=src/exercises/exercises3-1.xml:743
PROBLEM:
Determine whether the following statements are true or false and explain your reasoning.

a) 
    If $A$ is invertible, then the columns of $A$ are linearly independent.

b) 
    If $A$ is a square matrix whose diagonal entries are all nonzero, then $A$ is invertible.

c) 
    If $A$ is an invertible $n\times n$ matrix, then span of the columns of $A$ is ${\mathbb R}^n$.

d) 
    If $A$ is invertible, then there is a nonzero solution to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$.

e) 
    If $A$ is an $n\times n$ matrix and the equation $A{\mathbf x} = {\mathbf b}$ has a solution for every vector ${\mathbf b}$, then $A$ is invertible.

ANSWER:

a) 
    True

b) 
    False

c) 
    True

d) 
    False

e) 
    True

SOLUTION:

a) 
    True. If $A$ is invertible, then it has a pivot position in every column, which implies that the columns are linearly independent.

b) 
    False. We only know this if $A$ is a triangular matrix. For instance, the matrix $\left[\begin{array}{rr} 1 & 1 \\ 1 & 1 \\ \end{array}\right]$ is not invertible.

c) 
    True. If $A$ is invertible, then it has a pivot position in every row, which implies that the columns span ${\mathbb R}^n$.

d) 
    False. Since there is a pivot position in every column, the homogeneous equation $A{\mathbf x}={\mathbf 0}$ has only the zero solution ${\mathbf x}={\mathbf 0}$.

e) 
    True. In this case, the columns of $A$ span ${\mathbb R}^n$ so there must be a pivot position in every row. Because $A$ is a square matrix, it must be row equivalent to the identity matrix $I$.

:::

:::exercise {exercise-3-1-008} number=3.1.8 answered=yes src=src/exercises/exercises3-1.xml:820
PROBLEM:
Provide a justification for your response to the following questions.

a) 
    Suppose that $A$ is a square matrix with two identical columns. Can $A$ be invertible?

b) 
    Suppose that $A$ is a square matrix with two identical rows. Can $A$ be invertible?

c) 
    Suppose that $A$ is an invertible matrix and that $AB = AC$. Can you conclude that $B = C$?

d) 
    Suppose that $A$ is an invertible $n\times n$ matrix. What can you say about the span of the columns of $A^{-1}$?

e) 
    Suppose that $A$ is an invertible matrix and that $B$ is row equivalent to $A$. Can you guarantee that $B$ is invertible?

ANSWER:

a) 
    No

b) 
    No

c) 
    Yes

d) 
    The span is ${\mathbb R}^n$.

e) 
    Yes

SOLUTION:

a) 
    No. If $A$ has two identical columns, then the columns are not linearly independent. This means there is a column without a pivot position and so $A$ is not row equivalent to the identity matrix $I$.

b) 
    No. If we perform a replacement operation that multiplies one of the equal rows by $-1$ and adds it to the other equal row, we obtain a matrix having a row whose entries are all zero. This says that the reduced row echelon form has such a row as well. Therefore, there is a row that does not contain a pivot position so the reduced row echelon form cannot be the identity $I$.

c) 
    Yes. If we multiply both sides of $AB=AC$ by $A^{-1}$ on the left, then we see that $B=C$.

d) 
    The inverse $A^{-1}$ is also invertible since $A$ is its inverse. Therefore, the span of the columns of $A^{-1}$ is ${\mathbb R}^n$.

e) 
    Yes. Since $A$ is row equivalent to the identity matrix $I$, the matrix $B$ is as well. Therefore, $B$ is invertible.

:::

:::exercise {exercise-3-1-009} number=3.1.9 answered=yes src=src/exercises/exercises3-1.xml:895
PROBLEM:
Suppose that we start with the $3\times3$ matrix $A$, perform the following sequence of row operations:

1. 
    Multiply row 1 by -2 and add to row 2.

2. 
    Multiply row 1 by 4 and add to row 3.

3. 
    Scale row 2 by $1/2$.

4. 
    Multiply row 2 by -1 and add to row 3,

and arrive at the upper triangular matrix

$$ U = \left[\begin{array}{rrr} 3 & 2 & -1 \\ 0 & 1 & 3 \\ 0 & 0 & -4 \\ \end{array}\right] $$

.
:::sage
```sage

```
:::

a) 
    Write the matrices $E_1$, $E_2$, $E_3$, and $E_4$ that perform the four row operations.

b) 
    Find the matrix $E = E_4E_3E_2E_1$.

c) 
    We then have $E_4E_3E_2E_1 A = EA = U$. Now that we have the matrix $E$, find the original matrix $A = E^{-1}U$.

ANSWER:

a) 
    We have

    $$ \begin{array}{cc} E_1=\left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 0 & 1 \end{array}\right], & E_2=\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 4 & 0 & 1 \end{array}\right], \\ E_3 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & \frac{1}{2} & 0 \\ 0 & 0 & 1 \end{array}\right], & E_4 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & -2 & 1 \end{array}\right]\text{.} \end{array} $$

b) 
    $E = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -1 & \frac{1}{2} & 0 \\ 6 & -1 & 1 \end{array}\right]$.

c) 
    $A= \left[\begin{array}{rrr} 3 & 2 & -1 \\ 6 & 6 & 4 \\ -12 & -6 & 6 \end{array}\right]$.

SOLUTION:

a) 
    We have

    $$ \begin{array}{cc} E_1=\left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 0 & 1 \end{array}\right], & E_2=\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 4 & 0 & 1 \end{array}\right], \\ E_3 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & \frac{1}{2} & 0 \\ 0 & 0 & 1 \end{array}\right], & E_4 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & -1 & 1 \end{array}\right]\text{.} \end{array} $$

b) 
    We have $E = E_4E_3E_2E_1 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -1 & \frac{1}{2} & 0 \\ 5 & -\frac12 & 1 \end{array}\right]$.

c) 
    We write $A=E^{-1}U= \left[\begin{array}{rrr} 3 & 2 & -1 \\ 6 & 6 & 4 \\ -12 & -7 & 3 \end{array}\right]$.

:::

:::exercise {exercise-3-1-010} number=3.1.10 answered=yes src=src/exercises/exercises3-1.xml:1050
PROBLEM:
We say that two square matrices $A$ and $B$ are *similar* if there is an invertible matrix $P$ such that $B = PAP^{-1}$.

a) 
    If $A$ and $B$ are similar, explain why $A^2$ and $B^2$ are similar as well. In particular, if $B = PAP^{-1}$, explain why $B^2 = PA^2P^{-1}$.

b) 
    If $A$ and $B$ are similar and $A$ is invertible, explain why $B$ is also invertible.

c) 
    If $A$ and $B$ are similar and both are invertible, explain why $A^{-1}$ and $B^{-1}$ are similar.

d) 
    If $A$ is similar to $B$ and $B$ is similar to $C$, explain why $A$ is similar to $C$. To begin, you may wish to assume that $B = PAP^{-1}$ and $C = QBQ^{-1}$.

ANSWER:

a) 
    $B^2 = PA^2P^{-1}$.

b) 
    $B^{-1} = PA^{-1}P^{-1}$.

c) 
    $B^{-1}= PA^{-1}P^{-1}$.

d) 
    $C = (QP)A(QP)^{-1}$.

SOLUTION:

a) 
    $B^2 = (PAP^{-1})(PAP^{-1}) = PA^2P^{-1}$.

b) 
    $B (PA^{-1}P^{-1}) = (PAP^{-1})(PA^{-1}P^{-1}) = I$.

c) 
    $B^{-1}=(PAP^{-1})^{-1} = PA^{-1}P^{-1}$.

d) 
    $C = QBQ^{-1}=QPAP^{-1}Q^{-1} = (QP)A(QP)^{-1}$.

:::

:::exercise {exercise-3-1-011} number=3.1.11 answered=yes src=src/exercises/exercises3-1.xml:1145
PROBLEM:
Suppose that $A$ and $B$ are two $n\times n$ matrices and that $AB$ is invertible. We would like to explain why both $A$ and $B$ are invertible.

a) 
    We first explain why $B$ is invertible.

    1. 
        Since $AB$ is invertible, explain why any solution to the homogeneous equation $AB{\mathbf x} = {\mathbf 0}$ is ${\mathbf x}={\mathbf 0}$.

    2. 
        Use this fact to explain why any solution to $B{\mathbf x} = {\mathbf 0}$ must be ${\mathbf x}={\mathbf 0}$.

    3. 
        Explain why $B$ must be invertible.

b) 
    Now we explain why $A$ is invertible.

    1. 
        Since $AB$ is invertible, explain why the equation $AB{\mathbf x}={\mathbf b}$ is consistent for every vector ${\mathbf b}$.

    2. 
        Using the fact that $AB{\mathbf x} = A(B{\mathbf x}) = {\mathbf b}$ is consistent for every ${\mathbf b}$, explain why every equation $A{\mathbf x} = {\mathbf b}$ is consistent.

    3. 
        Explain why $A$ must be invertible.

ANSWER:

a) 

    1. 
        $AB\sim I$.

    2. 
        If $B{\mathbf x}={\mathbf 0}$, then $AB{\mathbf x} = {\mathbf 0}$.

    3. 
        We now know that $B\sim I$.

b) 

    1. 
        The span of the columns of $AB$ is ${\mathbb R}^n$.

    2. 
        A solution to $AB{\mathbf x} = {\mathbf b}$ produces a solution to $A{\mathbf x} = {\mathbf b}$.

    3. 
        The span of the columns of $A$ is ${\mathbb R}^n$.

SOLUTION:

a) 

    1. 
        Since $AB$ is invertible, $AB\sim I$, which says that there is pivot position in every column. Therefore, ${\mathbf x}={\mathbf 0}$ is the only solution to the equation $AB{\mathbf x} = {\mathbf 0}$.

    2. 
        If ${\mathbf x}$ is a solution to the equation $B{\mathbf x} = {\mathbf 0}$, then $AB{\mathbf x} = A{\mathbf 0} = {\mathbf 0}$, which says that ${\mathbf x} = {\mathbf 0}$.

    3. 
        Since the only solution to the homogeneous equation $B{\mathbf x} = {\mathbf 0}$ is the zero solution, we know that $B\sim I$ so $B$ is invertible.

b) 

    1. 
        Since $AB$ is invertible, the span of the columns of $AB$ is ${\mathbb R}^n$, which says that every equation $AB{\mathbf x} = {\mathbf b}$ is consistent.

    2. 
        If ${\mathbf y}$ is the solution to the equation $AB{\mathbf x} = {\mathbf b}$, then $B{\mathbf y}$ satisfies $A(B{\mathbf y}) = {\mathbf b}$, which means that $A{\mathbf x} = {\mathbf b}$ is consistent.

    3. 
        We now know that the span of the columns of $A$ is ${\mathbb R}^n$, which tells us that $A$ is invertible.

:::

:::exercise {exercise-3-1-012} number=3.1.12 answered=yes src=src/exercises/exercises3-1.xml:1329 label=ex-right-inverse
PROBLEM:
We defined an $n\times n$ matrix to be invertible if there is a matrix $B$ such that $AB=I_n$. In this exercise, we will explain why it is also true that $BA = I$, which is the statement of [Proposition 3.1.6](ref:proposition-inverse-inverse). This means that, if $B=A^{-1}$, then $A = B^{-1}$.

a) 
    Suppose that ${\mathbf x}$ is an $n$-dimensional vector. Since $AB=I$, explain why $AB{\mathbf x} = {\mathbf x}$ and use this to explain why the only vector for which $B{\mathbf x} = {\mathbf 0}$ is ${\mathbf x} = {\mathbf 0}$.

b) 
    Explain why this implies that $B$ must be invertible. We will call the inverse $C$ so that $BC = I$.

c) 
    Beginning with $AB = I$, explain why $B(AB)C = BIC$ and why this tells us that $BA = I$.

ANSWER:

a) 
    If $B{\mathbf x} = {\mathbf 0}$, then $AB{\mathbf x} = {\mathbf x} = {\mathbf 0}$.

b) 
    $B$ is invertible because $B\sim I$.

c) 
    Multiply $AB=I$ on the left by $B$ and the right by $C$ and regroup the matrix multiplications.

SOLUTION:

a) 
    If $B{\mathbf x} = {\mathbf 0}$, then $AB{\mathbf x} = A{\mathbf 0} = {\mathbf 0} = {\mathbf x}$.

b) 
    Since the only solution to the homogeneous equation $B{\mathbf x} = {\mathbf 0}$ is ${\mathbf x}={\mathbf 0}$, we know that the columns of $B$ are linearly independent and so $B$ has a pivot position in every column. Since $B$ is a square matrix, this tells us that $B\sim I$ so that $B$ is invertible.

c) 
    If we multiply $AB=I$ on the left by $B$ and the right by $C$, then we have

    $$ \begin{aligned} B(AB)C & = BIC \\ BA(BC) & = BC \\ BAI & = I \\ BA & = I \end{aligned}. $$

:::
