# 5.1 Gaussian elimination revisited {sec-gaussian-revisited}

In this section, we revisit Gaussian elimination and explore some problems with implementing it in the straightforward way that we described back in [Section 1.2](ref:1.2#sec-finding-solutions). In particular, we will see how the fact that computers only approximate arithmetic operations can lead us to find solutions that are far from the actual solutions. Second, we will explore how much work is required to implement Gaussian elimination and devise a more efficient means of implementing it when we want to solve equations $A{\mathbf x} = {\mathbf b}$ for several different vectors ${\mathbf b}$.

## 5.1.1 Introduction

:::exploration {act:preview-5-1-1} Preview Activity 5.1.1
To begin, let's recall how we implemented Gaussian elimination by considering the matrix

$$ A = \left[\begin{array}{rrrr} 1 & 2 & -1 & 2 \\ 1 & 0 & -2 & 1 \\ 3 & 2 & 1 & 0 \\ \end{array}\right] $$

.
PROBLEM:
a) What is the first row operation we perform? If the resulting matrix is $A_1$, find a matrix $E_1$ such that $E_1A = A_1$.
b) What is the matrix inverse $E_1^{-1}$? You can find this using your favorite technique for finding a matrix inverse. However, it may be easier to think about the effect that the row operation has and how it can be undone.
c) Perform the next two steps in the Gaussian elimination algorithm to obtain $A_3$. Represent these steps using multiplication by matrices $E_2$ and $E_3$ so that

    $$ E_3E_2E_1A = A_3 $$

    .
d) Suppose we need to scale the second row by $-2$. What is the $3\times3$ matrix that perfoms this row operation by left multiplication?
e) Suppose that we need to interchange the first and second rows. What is the $3\times3$ matrix that performs this row operation by left multiplication?
SOLUTION:
a) We first multiply the first row by $-1$ and add to the second row. This can be represented by multiplying $E_1A=A_1$ where

    $$ E_1=\left[\begin{array}{rrr} 1 & 0 & 0 \\ -1 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right], A_1= \left[\begin{array}{rrrr} 1 & 2 & -1 & 2 \\ 0 & -2 & -1 & -1 \\ 3 & 2 & 1 & 0 \end{array}\right]\text{.} $$

b) To undo the row operation, we multiply the first row by $1$ and add to the second row. This shows that $E_1^{-1} = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 1 & 1 & 0 \\ 0 & 0 & 1 \end{array}\right]$.
c) We have

    $$ \begin{array}{c} E_2 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ -3 & 0 & 1 \end{array}\right], E_3=\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & -2 & 1 \end{array}\right], \\ A_3=\left[\begin{array}{rrrr} 1 & 2 & -1 & 2 \\ 0 & -2 & -1 & -1 \\ 0 & 0 & 6 & -4 \end{array}\right]\text{.} \end{array} $$

    .
d) The matrix performing this scaling is $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & -2 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.
e) The matrix performing this interchange is $\left[\begin{array}{rrr} 0 & 1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.
:::

## 5.1.2 Partial pivoting {subsec-partial-pivot}

The first issue that we address is the fact that computers do not perform arithemtic operations exactly. For instance, Python will evaluate `0.1 + 0.2` and report `0.30000000000000004` even though we know that the true value is 0.3. There are a couple of reasons for this.

First, computers perform arithmetic using base 2 numbers, which means that numbers we enter in decimal form, such as $0.1$, must be converted to base 2. Even though 0.1 has a simple decimal form, its representation in base 2 is the repeating decimal

$$ 0.000110011001100110011001100110011001100110011\ldots\text{.} $$

, To accurately represent this number inside a computer would require infinitely many digits. Since a computer can only hold a finite number of digits, we are necessarily using an approximation just by representing this number in a computer.

In addition, arithmetic operations, such as addition, are prone to error. To keep things simple, suppose we have a computer that represents numbers using only three decimal digits. For instance, the number 1.023 would be represented as `1.02` while 0.023421 would be `0.0234`. If we add these numbers, we have 1.023 + 0.023421 = 1.046421; the computer reports this sum as ` 1.02 + 0.0234 = 1.04`, whose last digit is not correctly rounded. Generally speaking, we will see this problem, which is called *round off error*, whenever we add numbers of signficantly different magnitudes. {index-entry:round off error}

Remember that Gaussian elimination, when applied to an $n\times n$ matrix, requires approximately $\frac 23 n^3$ operations. If we have a $1000\times1000$ matrix, performing Gaussian elimination requires roughly a billion operations, and the errors introduced in each operation could accumulate. How can we have confidence in the final result? We can never completely avoid these errors, but we can take steps to mitigate them. The next activity will introduce one such technique.

:::activity {act:activity-5-1-2} Activity 5.1.2
Suppose we have a hypothetical computer that represents numbers using only three decimal digits. We will consider the linear system

$$ \begin{alignedat}{3} 0.0001x & {}+{} & y & {}={} & 1 \\ x & {}+{} & y & {}={} & 2\text{.} \\ \end{alignedat} $$

a) 
    Show that this system has the unique solution

    $$ \begin{aligned} x & {}={} \frac{10000}{9999} = 1.00010001\ldots, \\ y & {}={} \frac{9998}{9999} = 0.99989998\ldots\text{.} \end{aligned} $$

b) 
    If we represent this solution inside our computer that only holds 3 decimal digits, what do we find for the solution? This is the best that we can hope to find using our computer.

c) 
    Let's imagine that we use our computer to find the solution using Gaussian elimination; that is, after every arithmetic operation, we keep only three decimal digits. Our first step is to multiply the first equation by 10000 and subtract it from the second equation. If we represent numbers using only three decimal digits, what does this give for the value of $y$?

d) 
    By substituting our value for $y$ into the first equation, what do we find for $x$?

e) 
    Compare the solution we find on our computer with the actual solution and assess the quality of the approximation.

f) 
    Let's now modify the linear system by simplying interchanging the equations:

    $$ \begin{alignedat}{3} x & {}+{} & y & {}={} & 2 \\ 0.0001x & {}+{} & y & {}={} & 1\text{.} \\ \end{alignedat} $$

    Of course, this doesn't change the actual solution. Let's imagine we use our computer to find the solution using Gaussian elimination. Perform the first step where we multiply the first equation by 0.0001 and subtract from the second equation. What does this give for $y$ if we represent numbers using only three decimal digits?

g) 
    Substitute the value you found for $y$ into the first equation and solve for $x$. Then compare the approximate solution found with our hypothetical computer to the exact solution.

h) 
    Which approach produces the most accurate approximation?

SOLUTION:

a) 
    We may find this result by forming the augmented matrix

    $$ \left[\begin{array}{rr|r} \frac1{10000} & 1 & 1 \\ 1 & 1 & 2 \\ \end{array}\right] $$

    and row reducing.

b) 
    The solution would be rounded to $x=1.00$ and $y=1.00$.

c) 
    We first multiply the first row by $-10000$ and add to the second row. This gives

    $$ \begin{array}{l} \left[\begin{array}{rr|r} 0.0001 & 1 & 1 \\ 0 & -9999 & -9998 \\ \end{array}\right] \\ \approx \left[\begin{array}{rr|r} 0.0001 & 1 & 1 \\ 0 & -10000 & -10000 \\ \end{array}\right] \\ \sim \left[\begin{array}{rr|r} 0.0001 & 1 & 1 \\ 0 & 1 & 1 \\ \end{array}\right] \text{.} \end{array} $$

    This tells us that $y\approx 1$.

d) 
    The next steps in the Gaussian elimination algorithm give us

    $$ \left[\begin{array}{rr|r} 0.0001 & 0 & 0 \\ 0 & 1 & 1 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 0 \\ 0 & 1 & 1 \\ \end{array}\right] $$

    so have the approximation solution $x=0.00$ and $y=1.00$.

e) 
    This compares to the actual solution, as represented in our computer, as $x=1.00$ and $y=1.00$. Notice that the value of $x$ differs considerably.

f) 
    Now we have

    $$ \begin{array}{rcl} \left[\begin{array}{rr|r} 1 & 1 & 2 \\ 0.0001 & 1 & 1 \\ \end{array}\right] & \sim & \left[\begin{array}{rr|r} 1 & 1 & 2 \\ 0 & 0.9999 & 0.9998 \\ \end{array}\right] \\ & \approx & \left[\begin{array}{rr|r} 1 & 1 & 2 \\ 0 & 1 & 1 \\ \end{array}\right]\text{,} \end{array} $$

    which gives $y=1.00$.

g) 
    Performing one more row operation gives us

    $$ \left[\begin{array}{rr|r} 1 & 0 & 1 \\ 0 & 1 & 1 \\ \end{array}\right]\text{,} $$

    which shows the approximate solution as $x=1.00$ and $y=1.00$.

h) 
    The second approach gives an approximate solution that is as accurate as possible given the computer's limited ability to store digits.

:::

This activity demonstrates how the practical aspects of computing differ from the theoretical. We know that the order in which we write the equations has no effect on the solution space; row interchange is one of our three allowed row operations in the Gaussian elimination algorithm. However, when we are only able to perform arithmetic operations approximately, applying row interchanges can dramatically improve the accuracy of our approximations.

If we could compute the solution exactly, we find

$$ x = 1.00010001\ldots, \qquad y = 0.99989998\ldots\text{.} $$

Since our hypothetical computer represents numbers using only three decimal digits, our computer finds

$$ x \approx 1.00, \qquad y \approx 1.00. $$

This is the best we can hope to do with our computer since it is impossible to represent the solution exactly.

When the equations are written in their original order and we multiply the first equation by 10000 and subtract from the second, we find

$$ \begin{aligned} (1-10000)y & {}={}2-10000 \\ -9999 y & {}={} -9998 \\ -10000y& {}\approx{} -10000 \\ y & {}\approx{} 1.00\text{.} \\ \end{aligned} $$

In fact, we find the same value for $y$ when we interchange the equations. Here we multiply the first equation by 0.0001 and subtract from the second equation. We then find

$$ \begin{aligned} (1-0.0001)y & {}={}2-0.0001 \\ -0.9999 y & {}={} -0.9998 \\ -y& {}\approx{} -1.00 \\ y & {}\approx{} 1.00\text{.} \\ \end{aligned} $$

The difference occurs when we substitute $y\approx 1$ into the first equation. When the equations are written in their original order, we have

$$ \begin{aligned} 0.0001x + 1.00 & {}\approx{} 1.00 \\ 0.0001x & {}\approx{} 0.00 \\ x & {}\approx{} 0.00\text{.} \\ \end{aligned} $$

When the equations are written in their original order, we find the solution $x\approx 0.00, y \approx 1.00$.

When we write the equation in the opposite order, however, substituting $y\approx 1$ into the first equation gives

$$ \begin{aligned} x + 1.00 & {}\approx{} 2.00 \\ x & {}\approx{} 1.00\text{.} \\ \end{aligned} $$

In this case, we find the approximate solution $x\approx 1.00, y\approx1.00$, which is the most accurate solution that our hypothetical computer can find. Simply interchanging the order of the equation produces a much more accurate solution.

We can understand why this works graphically. Each equation represents a line in the plane, and the solution is the intersection point. Notice that the slopes of these lines differ considerably.

> IMAGE {img:partial-pivot-ex} src=../../media/ch05/partial-pivot-ex.svg
> alt: Two lines in the plane intersecting at a point.

When the equations are written in their original order, we substitute $y\approx1$ into the equation $0.00001x + y = 1$, which is a nearly horizontal line. Along this line, a small change in $y$ leads to a large change in $x$. The slight difference in our approximation $y\approx 1$ from the exact value $y=0.9998999\ldots$ leads to a large difference in the approximation $x\approx0$ from the exact value $x=1.00010001\ldots$.

If we exchange the order in which the equations are written, we substitute our approximation $y\approx 1$ into the equation $x+y=2$. Notice that the slope of the associated line is $-1$. On this line, a small change in $y$ leads to a relatively small change in $x$ as well. Therefore, the difference in our approximation $y\approx1$ from the exact value leads to only a small difference in the approximation $x\approx1$ from the exact value.

This example motivates the technique that computers usually use to perform Gaussian elimation. We only need to perform a row interchange when a zero occurs in a pivot position, such as

$$ \left[\begin{array}{rrrr} 1 & -1 & 2 & 2 \\ 0 & 0 & -3 & 1 \\ 0 & 2 & 2 & -3 \\ \end{array}\right] $$

. However, we will perform a row interchange to put the entry having the largest possible absolute value into the pivot position. For instance, when performing Gaussian elimination on the following matrix, we begin by interchanging the first and third rows so that the upper left entry has the largest possible absolute value.

$$ \left[\begin{array}{rrrr} 2 & 1 & 2 & 3 \\ 1 & -3 & -2 & 1 \\ -3 & 2 & 3 & -2 \\ \end{array}\right] \sim \left[\begin{array}{rrrr} -3 & 2 & 3 & -2 \\ 1 & -3 & -2 & 1 \\ 2 & 1 & 2 & 3 \\ \end{array}\right]\text{.} $$

{index-entry:partial pivoting} This technique is called *partial pivoting*, and it means that, in practice, we will perform many more row interchange operations than we typically do when computing exactly by hand.

## 5.1.3 $LU$ factorizations

In [Subsection 1.3.3](ref:1.3#subsec-compute-effort), we saw that the number of arithmetic operations needed to perform Gaussian elimination on an $n\times n$ matrix is about $\frac23 n^3$. This means that a $1000\times1000$ matrix, requires about two thirds of a billion operations.

Suppose that we have two equations, $A{\mathbf x} = {\mathbf b}_1$ and $A{\mathbf x} = {\mathbf b}_2$, that we would like to solve. Usually, we would form augmented matrices $\left[\begin{array}{c|c} A & {\mathbf b}_1 \\ \end{array}\right]$ and $\left[\begin{array}{c|c} A & {\mathbf b}_2 \\ \end{array}\right]$ and apply Gaussian elimination. Of course, the steps we perform in these two computations are nearly identical. Is there a way to store some of the computation we perform in reducing $\left[\begin{array}{c|c} A & {\mathbf b}_1 \\ \end{array}\right]$ and reuse it in solving subsequent equations? The next activity will point us in the right direction.

:::activity {act:activity-5-1-3} Activity 5.1.3
We will consider the matrix

$$ A = \left[\begin{array}{rrr} 1 & 2 & 1 \\ -2 & -3 & -2 \\ 3 & 7 & 4 \\ \end{array}\right] $$

and begin performing Gaussian elimination without using partial pivoting.

a) 
    Perform two row replacement operations to find the row equivalent matrix

    $$ A' = \left[\begin{array}{rrr} 1 & 2 & 1 \\ 0 & 1 & 0 \\ 0 & 1 & 1 \\ \end{array}\right]\text{.} $$

    Find elementary matrices $E_1$ and $E_2$ that perform these two operations so that $E_2E_1 A = A'$.

b) 
    Perform a third row replacement to find the upper triangular matrix

    $$ U = \left[\begin{array}{rrr} 1 & 2 & 1 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]\text{.} $$

    Find the elementary matrix $E_3$ such that $E_3E_2E_1A = U$.

c) 
    We can write $A=E_1^{-1}E_2^{-1}E_3^{-1} U$. Find the inverse matrices $E_1^{-1}$, $E_2^{-1}$, and $E_3^{-1}$ and the product $L = E_1^{-1}E_2^{-1}E_3^{-1}$. Then verify that $A=LU$.

    :::sage
    ```sage

    ```
    :::

d) 
    Suppose that we want to solve the equation $A{\mathbf x} = {\mathbf b} = \left[\begin{array}{r}4 \\ -7 \\ 12 \end{array}\right]$. We will write

    $$ A{\mathbf x} = LU{\mathbf x} = L(U{\mathbf x}) = {\mathbf b} $$

    and introduce an unknown vector ${\mathbf c}$ such that $U{\mathbf x} = {\mathbf c}$. Find ${\mathbf c}$ by noting that $L{\mathbf c} = {\mathbf b}$ and solving this equation.

e) 
    Now that we have found ${\mathbf c}$, find ${\mathbf x}$ by solving $U{\mathbf x} = {\mathbf c}$.

f) 
    Using the factorization $A=LU$ and this two-step process, solve the equation $A{\mathbf x} = \left[\begin{array}{r}2 \\ -2 \\ 7 \end{array}\right]$.

SOLUTION:

a) 
    We have

    $$ E_1 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 2 & 1 & 0 \\ 0 & 0 & 1 \end{array}\right], E_2 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ -3 & 0 & 1 \end{array}\right]\text{.} $$

b) 
    The third row replacement is performed by

    $$ E_3 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & -1 & 1 \\ \end{array}\right]\text{.} $$

c) 
    The inverse matrices are found to be

    $$ E_1^{-1}= \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right], E_2^{-1}= \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 3 & 0 & 1 \\ \end{array}\right], E_3^{-1}= \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 1 & 1 \\ \end{array}\right] $$

    giving $L = E_1^{-1}E_2^{-1}E_3^{-1} = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 3 & 1 & 1 \end{array}\right]$ so that $A = LU$.

d) 
    Noting that $L{\mathbf c}={\mathbf b}$, we find ${\mathbf c}=\left[\begin{array}{r}4 \\ 1 \\ -1 \end{array}\right]$.

e) 
    To find ${\mathbf x}$, we solve the equation $U{\mathbf x}={\mathbf c}$ to obtain ${\mathbf x}=\left[\begin{array}{r}3 \\ 1 \\ -1 \end{array}\right]$.

f) 
    We solve $L{\mathbf c}=\left[\begin{array}{r}2 \\ -2 \\ 7 \end{array}\right]$ to find ${\mathbf c}=\left[\begin{array}{r}2 \\ 2 \\ -1 \end{array}\right]$ and $U{\mathbf x}={\mathbf c}$ to find ${\mathbf x}=\left[\begin{array}{r}-1 \\ 2 \\ -1 \end{array}\right]$.

:::

This activity introduces a method for factoring a matrix $A$ as a product of two triangular matrices, $A=LU$, where $L$ is lower triangular and $U$ is upper triangular. The key to finding this factorization is to represent the row operations that we apply in the Gaussian elimination algorithm through multiplication by elementary matrices.

:::example {ex:example-LU} Example 5.1.1
Suppose we have the equation

$$ \begin{bmatrix} 2 & -3 & 1 \\ -4 & 5 & 0 \\ 2 & -2 & 2 \end{bmatrix} {\mathbf x} = \left[\begin{array}{c}8 \\ -13 \\ 8 \end{array}\right], $$

which we write in the form $A{\mathbf x} = {\mathbf b}$. We begin by applying the Gaussian elimination algorithm to find an $LU$ factorization of $A$.
The first step is to multiply the first row of $A$ by $2$ and add it to the second row. The elementary matrix

$$ E_1 = \begin{bmatrix} 1 & 0 & 0 \\ 2 & 1 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix} $$

performs this operation so that $E_1A = \begin{bmatrix} 2 & -3 & 1 \\ 0 & -1 & 2 \\ 2 & -2 & 2 \end{bmatrix}$.
We next apply matrices

$$ E_2 = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ -1 & 0 & 1 \end{bmatrix},~~~ E_3 = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 1 & 1 \end{bmatrix} $$

to obtain the upper triangular matrix $U = E_3E_2E_1 A = \begin{bmatrix} 2 & -3 & 1 \\ 0 & -1 & 2 \\ 0 & 0 & 3 \end{bmatrix}$.
We can write $U = (E_3E_2E_1)A$, which tells us that

$$ A = (E_3E_2E_1)^{-1}U = \begin{bmatrix} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 1 & -1 & 1 \end{bmatrix} U = LU. $$

That is, we have

$$ A = LU = \begin{bmatrix} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 1 & -1 & 1 \end{bmatrix} \begin{bmatrix} 2 & -3 & 1 \\ 0 & -1 & 2 \\ 0 & 0 & 3 \end{bmatrix}. $$

Notice that the matrix $L$ is lower triangular, a result of the fact that the elementary matrices $E_1$, $E_2$, and $E_3$ are lower triangular.
Now that we have factored $A=LU$ into two triangular matrices, we can solve the equation $A{\mathbf x} = {\mathbf b}$ by solving two triangular systems. We write

$$ A{\mathbf x} = L(U{\mathbf x}) = {\mathbf b} $$

and define the unknown vector ${\mathbf c} = U{\mathbf x}$, which is determined by the equation $L{\mathbf c} = {\mathbf b}$. Because $L$ is lower triangular, we find the solution using forward substitution, ${\mathbf c} = \left[\begin{array}{r}8 \\ 3 \\ 3 \end{array}\right]$. Finally, we find ${\mathbf x}$, the solution to our original system $A{\mathbf x} = {\mathbf b}$, by applying back substitution to solve $U{\mathbf x} = {\mathbf c}$. This gives ${\mathbf x} = \left[\begin{array}{r}2 \\ -1 \\ 1 \end{array}\right]$.
If we want to solve $A{\mathbf x} = {\mathbf b}$ for a different right-hand side ${\mathbf b}$, we can simply repeat this two-step process.
:::

An $LU$ factorization allow us to trade in one equation $A{\mathbf x} = {\mathbf b}$ for two simpler equations

$$ \begin{aligned} L{\mathbf c} & = {\mathbf b} \\ U{\mathbf x} & = {\mathbf c}. \\ \end{aligned} $$

For instance, the equation $L{\mathbf c} = {\mathbf b}$ in our example has the form

$$ \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 1 & -1 & 1 \end{array}\right]{\mathbf c} = \left[\begin{array}{r}8 \\ -13 \\ 8 \end{array}\right]\text{.} $$

Because $L$ is a lower-triangular matrix, we can read off the first component of ${\mathbf c}$ directly from the equations: $c_1 = 8$. We then have $-2c_1+c_2 = -13$, which gives $c_2 = 3$, and $c_1 - c_2 + c_3 = 8$, which gives $c_3=3$. Solving a triangular system is simplified because we only need to perform a sequence of substitutions.

In fact, solving an equation with an $n\times n$ triangular matrix requires approximately $\frac 12 n^2$ operations. Once we have the factorization $A=LU$, we solve the equation $A{\mathbf x}={\mathbf b}$ by solving two equations involving triangular matrices, which requires about $n^2$ operations. For example, if $A$ is a $1000\times1000$ matrix, we solve the equation $A{\mathbf x} = {\mathbf b}$ using about one million steps. The compares with roughly a billion operations needed to perform Gaussian elimination, which represents a significant savings. Of course, we have to first find the $LU$ factorization of $A$ and this requires roughly the same amount of work as performing Gaussian elimination. However, once we have the $LU$ factorization, we can use it to solve $A{\mathbf x}={\mathbf b}$ for different right hand sides ${\mathbf b}$.

Our discussion so far has ignored one issue, however. Remember that we sometimes have to perform row interchange operations in addition to row replacement. A typical row interchange is represented by multiplication by a matrix such as

$$ P = \left[\begin{array}{rrr} 0 & 0 & 1 \\ 0 & 1 & 0 \\ 1 & 0 & 0 \\ \end{array}\right]\text{,} $$

which has the effect of interchanging the first and third rows. Notice that this matrix is not triangular so performing a row interchange will disrupt the structure of the $LU$ factorization we seek. Without giving the details, we simply note that linear algebra software packages provide a matrix $P$ that describes how the rows are permuted in the Gaussian elimination process. In particular, we will write $PA = LU$, where $P$ is a permutation matrix, $L$ is lower triangular, and $U$ is upper triangular.

Therefore, to solve the equation $A{\mathbf x} = {\mathbf b}$, we first multiply both sides by $P$ to obtain

$$ PA{\mathbf x} = LU{\mathbf x} = P{\mathbf b} $$

. That is, we multiply ${\mathbf b}$ by $P$ and then find ${\mathbf x}$ using the factorization: $L{\mathbf c} = P{\mathbf b}$ and $U{\mathbf x} = {\mathbf c}$.

:::activity {act:activity-5-1-4} Activity 5.1.4
Sage will create $LU$ factorizations; once we have a matrix `A`, we write `P, L, U = A.LU()` to obtain the matrices $P$, $L$, and $U$ such that $PA = LU$.
:::sage
```sage

```
:::

a) 
    In [Example 5.1.1](ref:example-LU), we found the $LU$ factorization

    $$ A = \begin{bmatrix} 2 & -3 & 1 \\ -4 & 5 & 0 \\ 2 & -2 & 2 \end{bmatrix} = \begin{bmatrix} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 1 & -1 & 1 \end{bmatrix} \begin{bmatrix} 2 & -3 & 1 \\ 0 & -1 & 2 \\ 0 & 0 & 3 \end{bmatrix}=LU. $$

    Using Sage, define the matrix $A$, and then ask Sage for the $LU$ factorization. What are the matrices $P$, $L$, and $U$?

    Notice that Sage finds a different $LU$ factorization than we found in the previous example because Sage uses partial pivoting, as described in the previous section, when it performs Gaussian elimination.

b) 
    Define the vector ${\mathbf b} = \left[\begin{array}{r}8 \\ -13 \\ 8 \end{array}\right]$ in Sage and compute $P{\mathbf b}$.

c) 
    Use the matrices `L` and `U` to solve $L{\mathbf c} = P{\mathbf b}$ and $U{\mathbf x} = {\mathbf c}$. You should find the same solution ${\mathbf x}$ that we found in the previous example.

d) 
    Use the factorization to solve the equation $A{\mathbf x} = \left[\begin{array}{r}9 \\ -16 \\ 10 \end{array}\right]$.

e) 
    How does the factorization show us that $A$ is invertible and that, therefore, every equation $A{\mathbf x}={\mathbf b}$ has a unique solution?

f) 
    Suppose that we have the matrix

    $$ B = \left[\begin{array}{rrr} 3 & -1 & 2 \\ 2 & -1 & 1 \\ 2 & 1 & 3 \\ \end{array}\right] $$

    . Use Sage to find the $LU$ factorization. Explain how the factorization shows that $B$ is not invertible.

g) 
    Consider the matrix

    $$ C = \left[\begin{array}{rrrr} -2 & 1 & 2 & -1 \\ 1 & -1 & 0 & 2 \\ 3 & 2 & -1 & 0 \\ \end{array}\right] $$

    and find its $LU$ factorization. Explain why $C$ and $U$ have the same null space and use this observation to find a basis for $\text{Nul}(A)$.

SOLUTION:

a) 
    Sage gives us the matrices

    $$ P=\left[\begin{array}{rrr} 0 & 1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \end{array}\right],~~~ L=\begin{bmatrix} 1 & 0 & 0 \\ -\frac12 & 1 & 0 \\ -\frac12 & -1 & 1 \end{bmatrix},~~~ \begin{bmatrix} -4 & 5 & 0 \\ 0 & -\frac12 & 1 \\ 0 & 0 & 3 \\ \end{bmatrix}. $$

b) 
    We find $P{\mathbf b}=\left[\begin{array}{r}-13 \\ 8 \\ 8 \end{array}\right]$.

c) 
    Solving $L{\mathbf c}=P{\mathbf b}$, we have ${\mathbf c}=\left[\begin{array}{r}-13 \\ \frac32 \\ 3 \end{array}\right]$. Finally, solving $U{\mathbf x}={\mathbf c}$, we obtain ${\mathbf x}=\left[\begin{array}{r}2 \\ -1 \\ 1 \end{array}\right]$.

d) 
    We find

    $$ P{\mathbf b}=\left[\begin{array}{r}-16 \\ 9 \\ 10 \end{array}\right],~~~ {\mathbf c}=\left[\begin{array}{r}-16 \\ 1 \\ 3 \end{array}\right],~~~ {\mathbf x}=\left[\begin{array}{r}4 \\ 0 \\ 1 \end{array}\right]. $$

e) 
    Because $P$, $L$, and $U$ are invertible, it follows that $\det A = (\det L \det U)/\det P\neq 0$, which means that $A$ is invertible.

f) 
    Sage tells us that

    $$ P = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 1 & 0 \end{array}\right], L = \left[\begin{array}{rrr} 1 & 0 & 0 \\ \frac{2}{3} & 1 & 0 \\ \frac{2}{3} & -\frac{1}{5} & 1 \end{array}\right], U= \left[\begin{array}{rrr} 3 & -1 & 2 \\ 0 & \frac{5}{3} & \frac{5}{3} \\ 0 & 0 & 0 \end{array}\right]\text{.} $$

    Because $U$ is not invertible, we see that $\det B = (\det L\det U)/\det P = 0$ so $B$ is not invertible.

g) 
    We have

    $$ \begin{array}{c} P= \left[\begin{array}{rrr} 0 & 1 & 0 \\ 0 & 0 & 1 \\ 1 & 0 & 0 \end{array}\right], L= \left[\begin{array}{rrr} 1 & 0 & 0 \\ -\frac{2}{3} & 1 & 0 \\ \frac{1}{3} & -\frac{5}{7} & 1 \end{array}\right], \\ U= \left[\begin{array}{rrrr} 3 & 2 & -1 & 0 \\ 0 & \frac{7}{3} & \frac{4}{3} & -1 \\ 0 & 0 & \frac{9}{7} & \frac{9}{7} \end{array}\right]\text{.} \end{array} $$

    We may rewrite $PC=LU$ as $C=P^{-1}LU$ so if $C{\mathbf x}=P^{-1}LU{\mathbf x}={\mathbf 0}$, then $U{\mathbf x}={\mathbf 0}$ because $P$ and $L$ are invertible.

    Notice that $U$ is upper triangular, which means that it is straightforward to find its reduced row echelon form:

    $$ \begin{array}{rcl} U= \left[\begin{array}{rrrr} 3 & 2 & -1 & 0 \\ 0 & \frac{7}{3} & \frac{4}{3} & -1 \\ 0 & 0 & \frac{9}{7} & \frac{9}{7} \end{array}\right] & \sim & \left[\begin{array}{rrrr} 3 & 2 & -1 & 0 \\ 0 & 7 & 4 & -3 \\ 0 & 0 & 1 & 1 \end{array}\right] \\ & \sim & \left[\begin{array}{rrrr} 3 & 2 & 0 & 1 \\ 0 & 1 & 0 & -1 \\ 0 & 0 & 1 & 1 \end{array}\right] \\ & \sim & \left[\begin{array}{rrrr} 1 & 0 & 0 & 1 \\ 0 & 1 & 0 & -1 \\ 0 & 0 & 1 & 1 \end{array}\right]\text{.} \\ \end{array} $$

    This shows that a basis for $\text{Nul}(C)=\text{Nul}(U)$ is $\left[\begin{array}{r}-1 \\ 1 \\ -1 \\ 1 \end{array}\right]$.

:::

## 5.1.4 Summary

We returned to Gaussian elimination, which we have used as a primary tool for finding solutions to linear systems, and explored its practicality, both in terms of numerical accuracy and computational effort.

- 
    We saw that the accuracy of computations implemented on a computer could be improved using *partial pivoting*, a technique that performs row interchanges so that the entry in a pivot position has the largest possible magnitude.

- 
    Beginning with a matrix $A$, we used the Gaussian elimination algorithm to write $PA = LU$, where $P$ is a permutation matrix, $L$ is lower triangular, and $U$ is upper triangular.

- 
    Finding this factorization involves roughly as much work as performing Gaussian elimination. However, once we have the factorization, we are able to quickly solve equations of the form $A{\mathbf x} = {\mathbf b}$ by first solving $L{\mathbf c} = P{\mathbf b}$ and then $U{\mathbf x} = {\mathbf c}$.

## 5.1.5 Exercises

:::exercise {exercise-5-1-001} number=5.1.1 answered=yes src=src/exercises/exercises5-1.xml:5
PROBLEM:
In this section, we saw that errors made in computer arithmetic can produce approximate solutions that are far from the exact solutions. Here is another example in which this can happen. Consider the matrix

$$ A = \left[\begin{array}{cc} 1 & 1 \\ 1 & 1.0001 \\ \end{array}\right]\text{.} $$

a) 
    Find the exact solution to the equation $A{\mathbf x} = \left[\begin{array}{r}2 \\ 2 \end{array}\right]$.

b) 
    Suppose that this linear system arises in the midst of a larger computation except that, due to some error in the computation of the right hand side of the equation, our computer thinks we want to solve $A{\mathbf x} = \left[\begin{array}{c}2 \\ 2.0001 \end{array}\right]$. Find the solution to this equation and compare it to the solution of the equation in the previous part of this exercise.

Notice how a small change in the right hand side of the equation leads to a large change in the solution. In this case, we say that the matrix $A$ is *ill-conditioned* because the solutions are extremely sensitive to small changes in the right hand side of the equation. Though we will not do so here, it is possible to create a measure of the matrix that tells us when a matrix is ill-conditioned. Regrettably, there is not much we can do to remedy this problem.
ANSWER:

a) 
    ${\mathbf x}=\left[\begin{array}{r}2 \\ 0 \end{array}\right]$.

b) 
    ${\mathbf x}=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$.

SOLUTION:

a) 
    We find the solution ${\mathbf x}=\left[\begin{array}{r}2 \\ 0 \end{array}\right]$.

b) 
    Here we find the solution ${\mathbf x}=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$.

:::

:::exercise {exercise-5-1-002} number=5.1.2 answered=yes src=src/exercises/exercises5-1.xml:55
PROBLEM:
In this section, we found the $LU$ factorization of the matrix

$$ A = \left[\begin{array}{rrr} 1 & 2 & 1 \\ -2 & -3 & -2 \\ 3 & 7 & 4 \\ \end{array}\right] $$

in one of the activities, without using partial pivoting. Apply a sequence of row operations, now using partial pivoting, to find an upper triangular matrix $U$ that is row equivalent to $A$.
:::sage
```sage

```
:::
ANSWER:
$U=	\left[\begin{array}{rrr} 3 & 7 & 4 \\ 0 & \frac53 & \frac23 \\ 0 & 0 & -\frac15 \\ \end{array}\right]$
SOLUTION:
Using partial pivoting, we find

$$ \begin{array}{rcl} A = \left[\begin{array}{rrr} 1 & 2 & 1 \\ -2 & -3 & -2 \\ 3 & 7 & 4 \\ \end{array}\right] & \sim & \left[\begin{array}{rrr} 3 & 7 & 4 \\ -2 & -3 & -2 \\ 1 & 2 & 1 \\ \end{array}\right] \\ & \sim & \left[\begin{array}{rrr} 3 & 7 & 4 \\ 0 & \frac53 & \frac23 \\ 0 & -\frac13 & -\frac13 \\ \end{array}\right] \\ & \sim & \left[\begin{array}{rrr} 3 & 7 & 4 \\ 0 & \frac53 & \frac23 \\ 0 & 0 & -\frac15 \\ \end{array}\right]\text{.} \\ \end{array} $$

This agrees with the result that Sage returns using the `LU` command.
:::

:::exercise {exercise-5-1-003} number=5.1.3 answered=yes src=src/exercises/exercises5-1.xml:121
PROBLEM:
In the following exercises, use the given $LU$ factorizations to solve the equations $A{\mathbf x} = {\mathbf b}$.

a) 
    Solve the equation

    $$ A{\mathbf x} = \left[\begin{array}{rr} 1 & 0 \\ -2 & 1 \\ \end{array}\right] \left[\begin{array}{rr} 3 & 1 \\ 0 & -2 \\ \end{array}\right]{\mathbf x} = \left[\begin{array}{r}-3 \\ 0 \end{array}\right]\text{.} $$

b) 
    Solve the equation

    $$ A{\mathbf x} = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ -1 & 2 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 2 & 1 & 0 \\ 0 & -1 & 3 \\ 0 & 0 & 1 \\ \end{array}\right]{\mathbf x} = \left[\begin{array}{r}5 \\ -5 \\ 7 \end{array}\right]\text{.} $$

ANSWER:

a) 
    ${\mathbf x}=\left[\begin{array}{r}-2 \\ 3 \end{array}\right]$

b) 
    ${\mathbf x}=\left[\begin{array}{r}2 \\ 1 \\ 2 \end{array}\right]$

SOLUTION:

a) 
    We solve $L{\mathbf c}=\left[\begin{array}{r}-3 \\ 0 \end{array}\right]$ to find ${\mathbf c}=\left[\begin{array}{r}-3 \\ -6 \end{array}\right]$ and $U{\mathbf x}={\mathbf c}$ to find ${\mathbf x}=\left[\begin{array}{r}-2 \\ 3 \end{array}\right]$.

b) 
    We solve $L{\mathbf c}=\left[\begin{array}{r}5 \\ -5 \\ 7 \end{array}\right]$ to find ${\mathbf c}=\left[\begin{array}{r}5 \\ 5 \\ 2 \end{array}\right]$ and $U{\mathbf x}={\mathbf c}$ to find ${\mathbf x}=\left[\begin{array}{r}2 \\ 1 \\ 2 \end{array}\right]$.

:::

:::exercise {exercise-5-1-004} number=5.1.4 answered=yes src=src/exercises/exercises5-1.xml:185
PROBLEM:
Use Sage to solve the following equation by finding an $LU$ factorization:

$$ \left[\begin{array}{rrr} 3 & 4 & -1 \\ 2 & 4 & 1 \\ -3 & 1 & 4 \\ \end{array}\right] {\mathbf x} = \left[\begin{array}{r}-3 \\ -3 \\ -4 \end{array}\right] $$

.
:::sage
```sage

```
:::
ANSWER:
${\mathbf x}=\left[\begin{array}{r}2 \\ -2 \\ 1 \end{array}\right]$
SOLUTION:
We obtain the decomposition

$$ P= \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 1 & 0 \end{array}\right], L= \left[\begin{array}{rrr} 1 & 0 & 0 \\ -1 & 1 & 0 \\ \frac{2}{3} & \frac{4}{15} & 1 \end{array}\right], U = \left[\begin{array}{rrr} 3 & 4 & -1 \\ 0 & 5 & 3 \\ 0 & 0 & \frac{13}{15} \end{array}\right]\text{.} $$

To solve the equation $A{\mathbf x}={\mathbf b}=\left[\begin{array}{r}-3 \\ -3 \\ -4 \end{array}\right]$, we first find $P{\mathbf b}= \left[\begin{array}{r}-3 \\ -4 \\ -3 \end{array}\right]$, then solve $L{\mathbf c}=P{\mathbf b}$ to find ${\mathbf c}=\left[\begin{array}{r}-3 \\ -7 \\ \frac{13}{15} \end{array}\right]$, and finally solve $U{\mathbf x}={\mathbf c}$ to find ${\mathbf x}=\left[\begin{array}{r}2 \\ -2 \\ 1 \end{array}\right]$.
:::

:::exercise {exercise-5-1-005} number=5.1.5 answered=yes src=src/exercises/exercises5-1.xml:243 label=exercise-eigenvector-approx
PROBLEM:
Here is another problem with approximate computer arithmetic that we will encounter in the next section. Consider the matrix

$$ A = \left[\begin{array}{rrr} 0.2 & 0.2 & 0.4 \\ 0.2 & 0.3 & 0.1 \\ 0.6 & 0.5 & 0.5 \\ \end{array}\right]\text{.} $$

a) 
    Notice that this is a positive stochastic matrix. What do we know about the eigenvalues of this matrix?

b) 
    Use Sage to define the matrix $A$ using decimals such as `0.2` and the $3\times3$ identity matrix $I$. Ask Sage to compute $B = A-I$ and find the reduced row echelon form of $B$.

    :::sage
    ```sage

    ```
    :::

c) 
    Why is the computation that Sage performed incorrect?

d) 
    Explain why using a computer to find the eigenvectors of a matrix $A$ by finding a basis for $\text{Nul}(A-\lambda I)$ is problematic.

ANSWER:

a) 
    $\lambda=1$ is an eigenvalue.

b) 
    $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

c) 
    The computation tells us that $A-I$ is invertible, which is not true.

d) 
    The approximate arithmetic creates a nonexistent third pivot position.

SOLUTION:

a) 
    Since $A$ is a positive stochastic matrix, we know that $\lambda=1$ is an eigenvalue. Therefore, $A-I$ should not be invertible.

b) 
    Sage tells us that the reduced row echelon form of $A-I$ is $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

c) 
    The computation tells us that $A-I$ is invertible. We know that this can't be the case, however, since $\lambda=1$ is an eigenvalue.

d) 
    Let's trace through the work that goes into finding the reduced row echelon form of $A-I$:

    $$ A-I= \left[\begin{array}{rrr} -0.8 & 0.2 & 0.4 \\ 0.2 & -0.7 & 0.1 \\ 0.6 & 0.5 & -0.5 \\ \end{array}\right] \sim \left[\begin{array}{rrr} -0.8 & 0.2 & 0.4 \\ 0.0 & -0.65 & 0.2 \\ 0.0 & 0.65 & -0.2 \\ \end{array}\right]\text{.} $$

    The next step is to multiply the second row by $0.65/0.65$ and add it to the third row. The last entry in the third row would be $-0.2 + 0.2(0.65)/0.65$, which we identify as being $0$. The problem is that the computer only approximates this result so it finds something close to $0$ but not quite equal to $0$. It therefore, thinks this is a pivot position and scales the row to have $1$ in that position.

:::

:::exercise {exercise-5-1-006} number=5.1.6 answered=yes src=src/exercises/exercises5-1.xml:340
PROBLEM:
In practice, one rarely finds the inverse of a matrix $A$. It requires considerable effort to compute, and we can solve any equation of the form $A{\mathbf x} = {\mathbf b}$ using an $LU$ factorization, which means that the inverse isn't necessary. In any case, the best way to compute an inverse is using an $LU$ factorization, as this exercise demonstrates.

a) 
    Suppose that $PA = LU$. Explain why $A^{-1} = U^{-1}L^{-1}P$.

    Since $L$ and $U$ are triangular, finding their inverses is relatively efficient. That makes this an effective means of finding $A^{-1}$.

b) 
    Consider the matrix

    $$ A = \left[\begin{array}{rrr} 3 & 4 & -1 \\ 2 & 4 & 1 \\ -3 & 1 & 4 \\ \end{array}\right] $$

    . Find the $LU$ factorization of $A$ and use it to find $A^{-1}$.

    :::sage
    ```sage

    ```
    :::

ANSWER:
$A^{-1} = U^{-1}L^{-1}P = \left[\begin{array}{rrr} -\frac{15}{13} & \frac{17}{13} & -\frac{8}{13} \\ \frac{11}{13} & -\frac{9}{13} & \frac{5}{13} \\ -\frac{14}{13} & \frac{15}{13} & -\frac{4}{13} \end{array}\right]$.
SOLUTION:

a) 
    Notice that a row interchange is undone by the same row interchange. Therefore, the permutation matrix $P$ is its own inverse so that $P^{-1} = P$. If $PA=LU$, it then follows that $A=PLU$ so that $A^{-1} = U^{-1}L^{-1} P$.

b) 
    We find that

    $$ \begin{array}{c} U^{-1} = \left[\begin{array}{rrr} \frac{1}{3} & -\frac{4}{15} & \frac{17}{13} \\ 0 & \frac{1}{5} & -\frac{9}{13} \\ 0 & 0 & \frac{15}{13} \end{array}\right], L^{-1} = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 1 & 1 & 0 \\ -\frac{14}{15} & -\frac{4}{15} & 1 \end{array}\right], \\ P = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 1 & 0 \end{array}\right]\text{,} \end{array} $$

    which gives

    $$ A^{-1} = U^{-1}L^{-1}P = \left[\begin{array}{rrr} -\frac{15}{13} & \frac{17}{13} & -\frac{8}{13} \\ \frac{11}{13} & -\frac{9}{13} & \frac{5}{13} \\ -\frac{14}{13} & \frac{15}{13} & -\frac{4}{13} \end{array}\right]\text{.} $$

:::

:::exercise {exercise-5-1-007} number=5.1.7 answered=yes src=src/exercises/exercises5-1.xml:437
PROBLEM:
Consider the matrix

$$ A = \left[\begin{array}{rrrr} a & a & a & a \\ a & b & b & b \\ a & b & c & c \\ a & b & c & d \\ \end{array}\right]\text{.} $$

a) 
    Find the $LU$ factorization of $A$.

b) 
    What conditions on $a$, $b$, $c$, and $d$ guarantee that $A$ is invertible?

ANSWER:

a) 
    We find

    $$ L = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 1 & 1 & 0 & 0 \\ 1 & 1 & 1 & 0 \\ 1 & 1 & 1 & 1 \\ \end{array}\right], U = \left[\begin{array}{rrrr} a & a & a & a \\ 0 & b-a & b-a & b-a \\ 0 & 0 & c-b & c-b \\ 0 & 0 & 0 & d-c \\ \end{array}\right]\text{.} $$

b) 
    $a\neq0$, $b\neq a$, $c\neq b$, and $d\neq c$.

SOLUTION:

a) 
    We begin with $E_1A=A_1$ where

    $$ E_1=\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ -1 & 1 & 0 & 0 \\ -1 & 0 & 1 & 0 \\ -1 & 0 & 0 & 1 \\ \end{array}\right], A_1= \left[\begin{array}{rrrr} a & a & a & a \\ 0 & b-a & b-a & b-a \\ 0 & b-a & c-a & c-a \\ 0 & b-a & c-a & d-a \\ \end{array}\right]\text{.} $$

    Next we have $E_2A_1=A_2$ where

    $$ E_2=\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & -1 & 1 & 0 \\ 0 & -1 & 0 & 1 \\ \end{array}\right], A_2= \left[\begin{array}{rrrr} a & a & a & a \\ 0 & b-a & b-a & b-a \\ 0 & 0 & c-b & c-b \\ 0 & 0 & c-b & d-b \\ \end{array}\right]\text{.} $$

    Finally, we have $E_3A_2=U$, an upper triangular matrix where

    $$ E_3=\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & -1 & 1 \\ \end{array}\right], U = \left[\begin{array}{rrrr} a & a & a & a \\ 0 & b-a & b-a & b-a \\ 0 & 0 & c-b & c-b \\ 0 & 0 & 0 & d-c \\ \end{array}\right]\text{.} $$

    This gives

    $$ L = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 1 & 1 & 0 & 0 \\ 1 & 1 & 1 & 0 \\ 1 & 1 & 1 & 1 \\ \end{array}\right], U = \left[\begin{array}{rrrr} a & a & a & a \\ 0 & b-a & b-a & b-a \\ 0 & 0 & c-b & c-b \\ 0 & 0 & 0 & d-c \\ \end{array}\right]\text{.} $$

b) 
    Notice that $A$ is invertible if and only if $U$ is invertible and $U$ is invertible if and only all the diagonal terms are not equal. This means that $A$ is invertible provided that $a\neq0$, $b\neq a$, $c\neq b$, and $d\neq c$.

:::

:::exercise {exercise-5-1-008} number=5.1.8 answered=yes src=src/exercises/exercises5-1.xml:563
PROBLEM:
In the $LU$ factorization of a matrix, the diagonal entries of $L$ are all $1$ while the diagonal entries of $U$ are not necessarily $1$. This exercise will explore that observation by considering the matrix

$$ A = \left[\begin{array}{rrr} 3 & 1 & 1 \\ -6 & -4 & -1 \\ 0 & -4 & 1 \\ \end{array}\right] $$

.

a) 
    Perform Gaussian elimination without partial pivoting to find $U$, an upper triangular matrix that is row equivalent to $A$.

b) 
    The diagonal entries of $U$ are called *pivots*. Explain why $\det A$ equals the product of the pivots.

c) 
    What is $\det A$ for our matrix $A$?

d) 
    More generally, if we have $PA=LU$, explain why $\det A$ equals plus or minus the product of the pivots.

ANSWER:

a) 
    $A= LU = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 2 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 3 & 1 & 1 \\ 0 & -2 & -1 \\ 0 & 0 & -1 \\ \end{array}\right]$.

b) 
    $\det A = \det L \det U = \det U$.

c) 
    $\det A = 6$

d) 
    $\det A = \det P \det L \det U = \pm \det U$.

SOLUTION:

a) 
    We have

    $$ A = \left[\begin{array}{rrr} 3 & 1 & 1 \\ -6 & -4 & -1 \\ 0 & -4 & 1 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 3 & 1 & 1 \\ 0 & -2 & -1 \\ 0 & -4 & 1 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 3 & 1 & 1 \\ 0 & -2 & -1 \\ 0 & 0 & -1 \\ \end{array}\right]=U\text{.} $$

    This leads to $A=LU$ where

    $$ L = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 2 & 1 \\ \end{array}\right], U = \left[\begin{array}{rrr} 3 & 1 & 1 \\ 0 & -2 & -1 \\ 0 & 0 & -1 \\ \end{array}\right]\text{.} $$

b) 
    Because the diagonal entries of $L$ are $1$, we have $\det L = 1$. Therefore, $\det A = \det L \det U = \det U$, which equals the product of the pivots.

c) 
    $\det A = \det U = 6$

d) 
    More generally, if we have $PA=LU$, we can rewrite as $A=PLU$ so that $\det A = \det P \det L \det U = \pm\det U$, which is plus or minus the product of the pivots.

:::

:::exercise {exercise-5-1-009} number=5.1.9 answered=yes src=src/exercises/exercises5-1.xml:673
PROBLEM:
Please provide a justification to your responses to these questions.

a) 
    In this section, our hypothetical computer could only store numbers using 3 decimal places. Most computers can store numbers using 15 or more decimal places. Why do we still need to be concerned about the accuracy of our computations when solving systems of linear equations?

b) 
    Finding the $LU$ factorization of a matrix $A$ is roughly the same amount of work as finding its reduced row echelon form. Why is the $LU$ factorization useful then?

c) 
    How can we detect whether a matrix is invertible from its $LU$ factorization?

ANSWER:

a) 
    When working with a large matrix, the errors from individual calculations may accumulate.

b) 
    We can solve $A{\mathbf x}={\mathbf b}$ for a couple of different ${\mathbf b}$ without performing Gaussian elimination again.

c) 
    $A$ is invertible if and only if $U$ is.

SOLUTION:

a) 
    Since a typical computer has 15 or more decimal places of accuracy, the error in each individual calculation is relatively small. However, if we are working with a large matrix, we are performing many calculations and the errors from each of them may accumulate to become significant.

b) 
    If we need to solve $A{\mathbf x}={\mathbf b}$ for a couple of different vectors ${\mathbf b}$, we do not have to perform Gaussian elimination again. Some other quantities, like the inverse and determinant of $A$, are more easily computed using an $LU$ factorization.

c) 
    The matrix $A$ is invertible if and only if $U$ is, and we can easily see if $U$ is invertible by noting if every row has a pivot.

:::

:::exercise {exercise-5-1-010} number=5.1.10 answered=yes src=src/exercises/exercises5-1.xml:733
PROBLEM:
Consider the matrix

$$ A = \left[\begin{array}{rrrr} -1 & 1 & 0 & 0 \\ 1 & -2 & 1 & 0 \\ 0 & 1 & -2 & 1 \\ 0 & 0 & -1 & 1 \\ \end{array}\right]\text{.} $$

a) 
    Find the $LU$ factorization of $A$.

b) 
    Use the factorization to find a basis for $\text{Nul}(A)$.

c) 
    We have seen that $\text{Nul}(A) = \text{Nul}(U)$. Is it true that $\text{Col}(A) = \text{Col}(L)$?

ANSWER:

a) 
    We see that

    $$ \begin{array}{c} P=\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right], L=\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ -1 & 1 & 0 & 0 \\ 0 & -1 & 1 & 0 \\ 0 & 0 & 1 & 1 \\ \end{array}\right], \\ U=\left[\begin{array}{rrrr} -1 & 1 & 0 & 0 \\ 0 & -1 & 1 & 0 \\ 0 & 0 & -1 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.} \end{array} $$

b) 
    $\left[\begin{array}{r}1 \\ 1 \\ 1 \\ 1 \end{array}\right]$.

c) 
    No

SOLUTION:

a) 
    We see that

    $$ \begin{array}{c} P=\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right], L=\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ -1 & 1 & 0 & 0 \\ 0 & -1 & 1 & 0 \\ 0 & 0 & 1 & 1 \\ \end{array}\right], \\ U=\left[\begin{array}{rrrr} -1 & 1 & 0 & 0 \\ 0 & -1 & 1 & 0 \\ 0 & 0 & -1 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.} \end{array} $$

b) 
    Because $\text{Nul}(A) = \text{Nul}(U)$, we see that $\dim~\text{Nul}(A)=1$ with a basis vector $\left[\begin{array}{r}1 \\ 1 \\ 1 \\ 1 \end{array}\right]$.

c) 
    It is not true that $\text{Col}(A) = \text{Col}(L)$. Since there is a nonzero vector ${\mathbf x}$ such that $A{\mathbf x}={\mathbf 0}$, we know that $A$ is not invertible and hence its column space $\text{Col}(A)$ is not ${\mathbb R}^4$. However, $L$ is invertible so we have $\text{Col}(L)={\mathbb R}^4$.

:::
