# 2.2 Matrix multiplication and linear combinations {sec-matrices-lin-combs}

The previous section introduced vectors and linear combinations and demonstrated how they provide a way to think about linear systems geometrically. In particular, we saw that the vector ${\mathbf b}$ is a linear combination of the vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ precisely when the linear system corresponding to the augmented matrix

$$ \left[\begin{array}{rrrr|r} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_n & {\mathbf b} \end{array}\right] $$

is consistent.
Our goal in this section is to introduce matrix multiplication, another algebraic operation that deepens the connection between linear systems and linear combinations.

## 2.2.1 Scalar multiplication and addition of matrices

{index-entry:matrix, shape} We first thought of a matrix as a rectangular array of numbers. If we say that the *shape* of a matrix is $m\times n$, we mean that it has $m$ rows and $n$ columns. For instance, the shape of the matrix below is $3\times4$:

$$ \left[ \begin{array}{rrrr} 0 & 4 & -3 & 1 \\ 3 & -1 & 2 & 0 \\ 2 & 0 & -1 & 1 \\ \end{array} \right] $$

.

We may also think of the columns of a matrix as a set of vectors. For instance, the matrix above may be represented as

$$ \left[ \begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 & {\mathbf v}_4 \end{array} \right] $$

where

$$ {\mathbf v}_1=\left[\begin{array}{r}0\\3\\2\\ \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}4\\-1\\0\\ \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}-3\\2\\-1\\ \end{array}\right], {\mathbf v}_4=\left[\begin{array}{r}1\\0\\1\\ \end{array}\right] $$

. In this way, we see that the $3\times 4$ matrix is equivalent to an ordered set of 4 vectors in ${\mathbb R}^3$.

{index-entry:matrix, addition} {index-entry:matrix, scalar multiplication} This means that we may define scalar multiplication and matrix addition operations using the corresponding column-wise vector operations. For instance,

$$ \begin{aligned} c\left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_n \end{array} \right] {}={} & \left[\begin{array}{rrrr} c{\mathbf v}_1 & c{\mathbf v}_2 & \cdots & c{\mathbf v}_n \end{array} \right] \\ \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_n \end{array} \right] {}+{} & \left[\begin{array}{rrrr} {\mathbf w}_1 & {\mathbf w}_2 & \cdots & {\mathbf w}_n \end{array} \right] \\ {}={} & \left[\begin{array}{rrrr} {\mathbf v}_1+{\mathbf w}_1 & {\mathbf v}_2+{\mathbf w}_2 & \cdots & {\mathbf v}_n+{\mathbf w}_n \end{array} \right]. \\ \end{aligned} $$

:::exploration {act:preview-2-2-1} Preview Activity 2.2.1 (Matrix operations)
PROBLEM:
a) Compute the scalar multiple

    $$ -3\left[ \begin{array}{rrr} 3 & 1 & 0 \\ -4 & 3 & -1 \\ \end{array} \right] $$

    .
b) Find the sum

    $$ \left[ \begin{array}{rr} 0 & -3 \\ 1 & -2 \\ 3 & 4 \\ \end{array} \right] + \left[ \begin{array}{rrr} 4 & -1 \\ -2 & 2 \\ 1 & 1 \\ \end{array} \right] $$

    .
c) Suppose that $A$ and $B$ are two matrices. What do we need to know about their shapes before we can form the sum $A+B$?
d) The matrix $I_n$, which we call the *identity* matrix, is the $n\times n$ matrix whose entries are zero except for the diagonal entries, all of which are 1. {index-entry:matrix, identity} For instance,

    $$ I_3 = \left[ \begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array} \right] $$

    . If we can form the sum $A+I_n$, what must be true about the matrix $A$?
e) Find the matrix $A - 2I_3$ where

    $$ A = \left[ \begin{array}{rrr} 1 & 2 & -2 \\ 2 & -3 & 3 \\ -2 & 3 & 4 \\ \end{array} \right] $$

    .
ANSWER:
a) $\left[\begin{array}{rrr} -9 & -3 & 0 \\ 12 & -9 & 3 \\ \end{array}\right]$
b) $\left[\begin{array}{rr} 4 & -4 \\ -1 & 0 \\ 4 & 5 \\ \end{array}\right]$
c) The shapes must be the same.
d) The shape of $A$ must be $n\times n$.
e) $A-2I_3 = \left[\begin{array}{rrr} -1 & 2 & -2 \\ 2 & -5 & 3 \\ -2 & 3 & 2 \\ \end{array}\right]$
SOLUTION:
a) $\left[\begin{array}{rrr} -9 & -3 & 0 \\ 12 & -9 & 3 \\ \end{array}\right]$
b) $\left[\begin{array}{rr} 4 & -4 \\ -1 & 0 \\ 4 & 5 \\ \end{array}\right]$
c) The shapes must be the same.
d) The shape of $A$ must be $n\times n$.
e) $A-2I_3 = \left[\begin{array}{rrr} -1 & 2 & -2 \\ 2 & -5 & 3 \\ -2 & 3 & 2 \\ \end{array}\right]$
:::

As this preview activity shows, the operations of scalar multiplication and addition of matrices are natural extensions of their vector counterparts. Some care, however, is required when adding matrices. Since we need the same number of vectors to add and since those vectors must be of the same dimension, two matrices must have the same shape if we wish to form their sum.

## 2.2.2 Matrix-vector multiplication and linear combinations

A more important operation will be matrix multiplication as it allows us to compactly express linear systems. We now introduce the product of a matrix and a vector with an example.

:::example {ex:example-2-2-1} Example 2.2.1 (Matrix-vector multiplication)
Suppose we have the matrix $A$ and vector ${\mathbf x}$:

$$ A = \left[\begin{array}{rr} -2 & 3 \\ 0 & 2 \\ 3 & 1 \\ \end{array}\right],~~~ {\mathbf x} = \left[\begin{array}{r} 2 \\ 3 \\ \end{array}\right] $$

. Their product will be defined to be the linear combination of the columns of $A$ using the components of ${\mathbf x}$ as weights. This means that

$$ \begin{aligned} A{\mathbf x} = \left[\begin{array}{rr} -2 & 3 \\ 0 & 2 \\ 3 & 1 \\ \end{array}\right] \left[\begin{array}{r} 2 \\ 3 \\ \end{array}\right] {}={} & 2 \left[\begin{array}{r} -2 \\ 0 \\ 3 \\ \end{array}\right] + 3 \left[\begin{array}{r} 3 \\ 2 \\ 1 \\ \end{array}\right] \\ \\ {}={} & \left[\begin{array}{r} -4 \\ 0 \\ 6 \\ \end{array}\right] + \left[\begin{array}{r} 9 \\ 6 \\ 3 \\ \end{array}\right] \\ \\ {}={} & \left[\begin{array}{r} 5 \\ 6 \\ 9 \\ \end{array}\right]. \\ \end{aligned} $$

Because $A$ has two columns, we need two weights to form a linear combination of those columns, which means that ${\mathbf x}$ must have two components. In other words, the number of columns of $A$ must equal the dimension of the vector ${\mathbf x}$.
Similarly, the columns of $A$ are 3-dimensional so any linear combination of them is 3-dimensional as well. Therefore, $A{\mathbf x}$ will be 3-dimensional.
We then see that if $A$ is a $3\times2$ matrix, ${\mathbf x}$ must be a 2-dimensional vector and $A{\mathbf x}$ will be 3-dimensional.
:::

More generally, we have the following definition.

:::definition {def:definition-2-2-2} Definition 2.2.2 (Matrix-vector multiplication)
The product of a matrix $A$ by a vector ${\mathbf x}$ will be the linear combination of the columns of $A$ using the components of ${\mathbf x}$ as weights. More specifically, if

$$ A=\left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n \end{array}\right],~~~ {\mathbf x} = \left[\begin{array}{r} c_1 \\ c_2 \\ \vdots \\ c_n \end{array}\right], $$

then

$$ A{\mathbf x} = c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + \ldots + c_n{\mathbf v}_n $$

.
If $A$ is an $m\times n$ matrix, then ${\mathbf x}$ must be an $n$-dimensional vector, and the product $A{\mathbf x}$ will be an $m$-dimensional vector.
:::

The next activity explores some properties of matrix multiplication.

:::activity {act:activity-2-2-2} Activity 2.2.2 (Matrix-vector multiplication)

a) 
    Find the matrix product

    $$ \left[ \begin{array}{rrrr} 1 & 2 & 0 & -1 \\ 2 & 4 & -3 & -2 \\ -1 & -2 & 6 & 1 \\ \end{array} \right] \left[ \begin{array}{r} 3 \\ 1 \\ -1 \\ 1 \\ \end{array} \right] $$

    .

b) 
    Suppose that $A$ is the matrix

    $$ \left[ \begin{array}{rrr} 3 & -1 & 0 \\ 0 & -2 & 4 \\ 2 & 1 & 5 \\ 1 & 0 & 3 \\ \end{array} \right] $$

    . If $A{\mathbf x}$ is defined, what is the dimension of the vector ${\mathbf x}$ and what is the dimension of $A{\mathbf x}$?

c) 
    A vector whose entries are all zero is denoted by ${\mathbf 0}$. If $A$ is a matrix, what is the product $A{\mathbf 0}$?

d) 
    Suppose that $I = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$ is the identity matrix and ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]$. Find the product $I{\mathbf x}$ and explain why $I$ is called the identity matrix.

e) 
    Suppose we write the matrix $A$ in terms of its columns as

    $$ A = \left[ \begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_n \\ \end{array} \right] $$

    . If the vector ${\mathbf e}_1 = \left[\begin{array}{c} 1 \\ 0 \\ \vdots \\ 0 \end{array}\right]$, what is the product $A{\mathbf e}_1$?

f) 
    Suppose that

    $$ A = \left[ \begin{array}{rrrr} 1 & 2 \\ -1 & 1 \\ \end{array} \right], {\mathbf b} = \left[ \begin{array}{r} 6 \\ 0 \end{array} \right] $$

    . Is there a vector ${\mathbf x}$ such that $A{\mathbf x} = {\mathbf b}$?

ANSWER:

a) 
    $\left[\begin{array}{r}4 \\ 11 \\ -10 \end{array}\right]\text{.}$

b) 
    The dimension of ${\mathbf x}$ must three, and the dimension of $A{\mathbf x}$ must be four.

c) 
    $A{\mathbf 0} = {\mathbf 0}$.

d) 
    $I{\mathbf x} = {\mathbf x}$.

e) 
    $A{\mathbf e}_1 = 1{\mathbf v}_1+0{\mathbf v}_2+\ldots+0{\mathbf v}_n = {\mathbf v}_1$.

f) 
    ${\mathbf x}=\left[\begin{array}{r}2 \\ 2 \end{array}\right]$ is the unique solution.

SOLUTION:

a) 
    We have

    $$ \begin{alignedat}{2} \left[\begin{array}{rrrr} 1 & 2 & 0 & -2 \\ 2 & 4 & -3 & -2 \\ -1 & -2 & 6 & 1 \\ \end{array}\right] & \left[\begin{array}{r}3 \\ 1 \\ -1 \\ 1 \end{array}\right] \\ & = \left[\begin{array}{r}3(1)+1(2)-1(0)+1(-1) \\ 3(2)+1(4)-1(-3)+1(-2) \\ 3(-1)+1(-2)-1(6)+1(1) \end{array}\right] \\ & =\left[\begin{array}{r}4 \\ 11 \\ -10 \end{array}\right]\text{.} \end{alignedat} $$

b) 
    The dimension of ${\mathbf x}$ must be the same as the number of columns of $A$ so ${\mathbf x}$ is three-dimensional. The dimension of $A{\mathbf x}$ equals the number of rows of $A$ so $A{\mathbf x}$ is four-dimensional.

c) 
    We have $A{\mathbf 0} = {\mathbf 0}$.

d) 
    We have $I{\mathbf x}={\mathbf x}$; that is, multiplying a vector by $I$ produces the same vector.

e) 
    The product $A{\mathbf e}_1 = 1{\mathbf v}_1+0{\mathbf v}_2+\ldots+0{\mathbf v}_n = {\mathbf v}_1$.

f) 
    If $A{\mathbf x}={\mathbf b}$, then we have

    $$ \begin{alignedat}{3} x_1 & {}+{} & 2x_2 & {}={} & 6 \\ -x_1 & {}+{} & x_2 & {}={} & 0\text{.} \\ \end{alignedat} $$

    with corresponding augmented matrix

    $$ \left[\begin{array}{rr|r} 1 & 2 & 6 \\ -1 & 1 & 0 \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 2 \\ 0 & 1 & 2 \end{array}\right]\text{.} $$

    This means that ${\mathbf x}=\left[\begin{array}{r}2 \\ 2 \end{array}\right]$ is the unique solution to the equation $A{\mathbf x}={\mathbf b}$.

:::

Multiplication of a matrix $A$ and a vector is defined as a linear combination of the columns of $A$. However, there is a shortcut for computing such a product. Let's look at our previous example and focus on the first row of the product.

$$ \left[\begin{array}{rr} -2 & 3 \\ 0 & 2 \\ 3 & 1 \\ \end{array}\right] \left[\begin{array}{r} 2 \\ 3 \\ \end{array}\right] = 2 \left[\begin{array}{r} -2 \\ * \\ * \\ \end{array}\right] + 3 \left[\begin{array}{r} 3 \\ * \\ * \\ \end{array}\right] = \left[\begin{array}{c} 2(-2)+3(3) \\ * \\ * \\ \end{array}\right] = \left[\begin{array}{r} 5 \\ * \\ * \\ \end{array}\right] $$

.

To find the first component of the product, we consider the first row of the matrix. We then multiply the first entry in that row by the first component of the vector, the second entry by the second component of the vector, and so on, and add the results. In this way, we see that the third component of the product would be obtained from the third row of the matrix by computing $2(3) + 3(1) = 9$.

You are encouraged to evaluate the product [Item a](ref:li-example-product) of the previous activity using this shortcut and compare the result to what you found while completing that activity.

:::activity {act:activity-2-2-3} Activity 2.2.3
Sage can find the product of a matrix and vector using the `*` operator. For example,
:::sage
```sage
	    A = matrix(2,2,[1,2,2,1])
	    v = vector([3,-1])
	    A*v

```
:::

a) 
    Use Sage to evaluate the product

    $$ \left[ \begin{array}{rrrr} 1 & 2 & 0 & -1 \\ 2 & 4 & -3 & -2 \\ -1 & -2 & 6 & 1 \\ \end{array} \right] \left[ \begin{array}{r} 3 \\ 1 \\ -1 \\ 1 \\ \end{array} \right] $$

    from [Item a](ref:li-example-product) of the previous activity.

    :::sage
    ```sage

    ```
    :::

b) 
    In Sage, define the matrix and vectors

    $$ A = \left[ \begin{array}{rrr} -2 & 0 \\ 3 & 1 \\ 4 & 2 \\ \end{array} \right], {\mathbf 0} = \left[ \begin{array}{r} 0 \\ 0 \end{array} \right], {\mathbf v} = \left[ \begin{array}{r} -2 \\ 3 \end{array} \right], {\mathbf w} = \left[ \begin{array}{r} 1 \\ 2 \end{array} \right] $$

    .

    :::sage
    ```sage

    ```
    :::

c) 
    What do you find when you evaluate $A{\mathbf 0}$?

d) 
    What do you find when you evaluate $A(3{\mathbf v})$ and $3(A{\mathbf v})$ and compare your results?

e) 
    What do you find when you evaluate $A({\mathbf v}+{\mathbf w})$ and $A{\mathbf v} + A{\mathbf w}$ and compare your results?

ANSWER:

a) 
    We define

    ```
    A = matrix(3, 4, [1, 2, 0, -1,
                      2, 4, -3, -2,
                      -1, -2, 6, 1])
    v = vector([3, 1, -1, 1])
    A*v
    	    
    ```

b) 
    We define

    ```
    A = matrix(3, 2, [-2, 0, 3, 1, 4, 2])
    zero = vector([0, 0])
    v = vector([-2, 3])
    w = vector([1, 2])
    	    
    ```

c) 
    $A{\mathbf 0} = {\mathbf 0}$.

d) 
    $A(3{\mathbf v}) = 3(A{\mathbf v})$.

e) 
    $A({\mathbf v}+{\mathbf w}) = A{\mathbf v} + A{\mathbf w}$

SOLUTION:

a) 
    We define

    ```
    A = matrix(3, 4, [1, 2, 0, -1,
                      2, 4, -3, -2,
                      -1, -2, 6, 1])
    v = vector([3, 1, -1, 1])
    A*v		  
    	    
    ```

b) 
    We define

    ```
    A = matrix(3, 2, [-2, 0, 3, 1, 4, 2])
    zero = vector([0, 0])
    v = vector([-2, 3])
    w = vector([1, 2])
    	    
    ```

c) 
    $A{\mathbf 0} = {\mathbf 0}$.

d) 
    $A(3{\mathbf v}) = 3(A{\mathbf v})$.

e) 
    $A({\mathbf v}+{\mathbf w}) = A{\mathbf v} + A{\mathbf w}$

:::

This activity demonstrates several general properties satisfied by matrix multiplication that we record here.

:::proposition {prop:prop-matrix-mult-prop} Proposition 2.2.3 (Linearity of matrix multiplication)
If $A$ is a matrix, ${\mathbf v}$ and ${\mathbf w}$ vectors of the appropriate dimensions, and $c$ a scalar, then

- 
    $A{\mathbf 0} = {\mathbf 0}$.

- 
    $A(c{\mathbf v}) = cA{\mathbf v}$.

- 
    $A({\mathbf v}+{\mathbf w}) = A{\mathbf v} + A{\mathbf w}$.

:::

## 2.2.3 Matrix-vector multiplication and linear systems

So far, we have begun with a matrix $A$ and a vector ${\mathbf x}$ and formed their product $A{\mathbf x} = {\mathbf b}$. We would now like to turn this around: beginning with a matrix $A$ and a vector ${\mathbf b}$, we will ask if we can find a vector ${\mathbf x}$ such that $A{\mathbf x} = {\mathbf b}$. This will naturally lead back to linear systems.

To see the connection between the matrix equation $A{\mathbf x} = {\mathbf b}$ and linear systems, let's write the matrix $A$ in terms of its columns ${\mathbf v}_i$ and ${\mathbf x}$ in terms of its components.

$$ A = \left[ \begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots {\mathbf v}_n \end{array} \right], {\mathbf x} = \left[ \begin{array}{c} c_1 \\ c_2 \\ \vdots \\ c_n \\ \end{array} \right] $$

.

We know that the matrix product $A{\mathbf x}$ forms a linear combination of the columns of $A$. Therefore, the equation $A{\mathbf x} = {\mathbf b}$ is merely a compact way of writing the equation for the weights $c_i$:

$$ c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + \ldots + c_n{\mathbf v}_n = {\mathbf b} $$

. We have seen this equation before: Remember that [Proposition 2.1.12](ref:2.1#prop-system-comb) says that the solutions of this equation are the same as the solutions to the linear system whose augmented matrix is

$$ \left[\begin{array}{rrrr|r} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n & {\mathbf b} \end{array}\right] $$

.

This gives us three different ways of looking at the same solution space.

:::proposition {prop:prop-matrix-eq-solution} Proposition 2.2.4
If $A=\left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\ldots{\mathbf v}_n \end{array}\right]$ and ${\mathbf x}=\left[ \begin{array}{c} x_1 \\ x_2 \\ \vdots \\ x_n \\ \end{array}\right]$, then the following statements are equivalent.

- 
    The vector ${\mathbf x}$ satisfies the equation $A{\mathbf x} = {\mathbf b}$.

- 
    The vector ${\mathbf b}$ is a linear combination of the columns of $A$ with weights $x_j$:

    $$ x_1{\mathbf v}_1 + x_2{\mathbf v}_2 + \ldots + x_n{\mathbf v}_n = {\mathbf b} $$

    .

- 
    The components of ${\mathbf x}$ form a solution to the linear system corresponding to the augmented matrix

    $$ \left[\begin{array}{rrrr|r} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_n & {\mathbf b} \end{array}\right]\text{.} $$

:::

When the matrix $A = \left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\cdots&{\mathbf v}_n\end{array}\right]$, we will frequently write

$$ \left[\begin{array}{rrrr|r} {\mathbf v}_1&{\mathbf v}_2&\cdots&{\mathbf v}_n&{\mathbf b}\end{array}\right] = \left[ \begin{array}{r|r} A & {\mathbf b} \end{array}\right] $$

and say that the matrix $A$ is augmented by the vector ${\mathbf b}$.

The equation $A{\mathbf x} = {\mathbf b}$ gives a notationally compact way to write a linear system. Moreover, this notation will allow us to focus on important features of the system that determine its solution space.

:::example {ex:example-2-2-5} Example 2.2.5
We will describe the solution space of the equation

$$ \left[\begin{array}{rrr} 2 & 0 & 2 \\ 4 & -1 & 6 \\ 1 & 3 & -5 \\ \end{array}\right] {\mathbf x} = \left[\begin{array}{r} 0 \\ -5 \\ 15 \end{array}\right]. $$

By [Proposition 2.2.4](ref:prop-matrix-eq-solution), this equation may be equivalently expressed as

$$ x_1\left[\begin{array}{r}2\\4\\1\end{array}\right] + x_2\left[\begin{array}{r}0\\-1\\3\end{array}\right]+ x_3\left[\begin{array}{r}2\\6\\-5\end{array}\right]= \left[\begin{array}{r}0\\-5\\15\end{array}\right] $$

, which is the linear system corresponding to the augmented matrix

$$ \left[\begin{array}{rrr|r} 2 & 0 & 2 & 0 \\ 4 & -1 & 6 & -5 \\ 1 & 3 & -5 & 15 \\ \end{array} \right] $$

. The reduced row echelon form of the augmented matrix is

$$ \left[\begin{array}{rrr|r} 2 & 0 & 2 & 0 \\ 4 & -1 & 6 & -5 \\ 1 & 3 & -5 & 15 \\ \end{array} \right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 1 & 0 \\ 0 & 1 & -2 & 5 \\ 0 & 0 & 0 & 0 \\ \end{array} \right], $$

which corresponds to the linear system

$$ \begin{alignedat}{4} x_1 & & & {}+{} & x_3 & {}={} & 0 \\ & & x_2 & {}-{} & 2x_3 & {}={} & 5. \\ \end{alignedat} $$

The variable $x_3$ is free so we may write the solution space parametrically as

$$ \begin{aligned} x_1 & {}={} -x_3 \\ x_2 & {}={} 5+2x_3. \\ \end{aligned} $$

Since we originally asked to describe the solutions to the equation $A{\mathbf x} = {\mathbf b}$, we will express the solution in terms of the vector ${\mathbf x}$:

$$ {\mathbf x} =\left[ \begin{array}{r} x_1 \\ x_2 \\ x_3 \end{array} \right] = \left[ \begin{array}{r} -x_3 \\ 5 + 2x_3 \\ x_3 \end{array} \right] =\left[\begin{array}{r}0\\5\\0\end{array}\right] +x_3\left[\begin{array}{r}-1\\2\\1\end{array}\right] $$

As before, we call this a parametric description of the solution space.
This shows that the solutions ${\mathbf x}$ may be written in the form ${\mathbf v} + x_3{\mathbf w}$, for appropriate vectors ${\mathbf v}$ and ${\mathbf w}$. Geometrically, the solution space is a line in ${\mathbb R}^3$ through ${\mathbf v}$ moving parallel to ${\mathbf w}$.
:::

:::activity {act:activity-2-2-4} Activity 2.2.4 (The equation $A{\mathbf x} = {\mathbf b}$)

a) 
    Consider the linear system

    $$ \begin{alignedat}{4} 2x & {}+{} & y & {}-{} & 3z & {}={} & 4 \\ -x & {}+{} & 2y & {}+{} & z & {}={} & 3 \\ 3x & {}-{} & y & & & {}={} & -4. \\ \end{alignedat} $$

    Identify the matrix $A$ and vector ${\mathbf b}$ to express this system in the form $A{\mathbf x} = {\mathbf b}$.

b) 
    If $A$ and ${\mathbf b}$ are as below, write the linear system corresponding to the equation $A{\mathbf x}={\mathbf b}$ and describe its solution space, using a parametric description if appropriate:

    $$ A = \left[\begin{array}{rrr} 3 & -1 & 0 \\ -2 & 0 & 6 \end{array} \right],~~~ {\mathbf b} = \left[\begin{array}{r} -6 \\ 2 \end{array} \right] $$

    .

    :::sage
    ```sage

    ```
    :::

c) 
    Describe the solution space of the equation

    $$ \left[ \begin{array}{rrrr} 1 & 2 & 0 & -1 \\ 2 & 4 & -3 & -2 \\ -1 & -2 & 6 & 1 \\ \end{array} \right] {\mathbf x} = \left[\begin{array}{r} -1 \\ 1 \\ 5 \end{array} \right] $$

    .

    :::sage
    ```sage

    ```
    :::

d) 
    Suppose $A$ is an $m\times n$ matrix. What can you guarantee about the solution space of the equation $A{\mathbf x} = {\mathbf 0}$?

ANSWER:

a) 
    $A = \left[\begin{array}{rrr} 2 & 1 & -3 \\ -1 & 2 & 1 \\ 3 & -1 & 0 \\ \end{array}\right]$ and ${\mathbf b}=\left[\begin{array}{r}4 \\ 3 \\ -4 \end{array}\right]$.

b) 
    ${\mathbf x} = \left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right] = \left[\begin{array}{r}-1 \\ 3 \\ 0 \end{array}\right]+x_3\left[\begin{array}{r}3 \\ 9 \\ 1 \end{array}\right]\text{.}$

c) 
    There are no solutions.

d) 
    There is at least one solution, namely, ${\mathbf x}={\mathbf 0}$.

SOLUTION:

a) 
    $A = \left[\begin{array}{rrr} 2 & 1 & -3 \\ -1 & 2 & 1 \\ 3 & -1 & 0 \\ \end{array}\right]$ and ${\mathbf b}=\left[\begin{array}{r}4 \\ 3 \\ -4 \end{array}\right]$.

b) 
    Form the augmented matrix

    $$ \left[\begin{array}{rrrr} 3 & -1 & 0 & -6 \\ -2 & 0 & 6 & 2 \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 0 & -3 & -1 \\ 0 & 1 & -9 & 3 \end{array}\right] $$

    so that

    $$ {\mathbf x} = \left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right] = \left[\begin{array}{r}-1+3x_3 \\ 3+9x_3 \\ x_3 \end{array}\right] = \left[\begin{array}{r}-1 \\ 3 \\ 0 \end{array}\right]+x_3\left[\begin{array}{r}3 \\ 9 \\ 1 \end{array}\right]\text{.} $$

c) 
    We have the augmented matrix

    $$ \left[\begin{array}{rrrrr} 1 & 2 & 0 & -1 & -1 \\ 2 & 4 & -3 & -2 & 1 \\ -1 & -2 & 6 & 1 & 5 \end{array}\right] \sim \left[\begin{array}{rrrrr} 1 & 2 & 0 & -1 & 0 \\ 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 0 & 1 \end{array}\right]\text{.} $$

    Since this system is inconsistent, there are no solutions to the matrix equation.

d) 
    We know that there is at least one solution, namely, ${\mathbf x}={\mathbf 0}$.

:::

## 2.2.4 Matrix-matrix products

In this section, we have developed some algebraic operations on matrices with the aim of simplifying our description of linear systems. We now introduce a final operation, the product of two matrices, that will become important when we study linear transformations in [Section 2.5](ref:2.5#sec-linear-trans).

:::definition {def:definition-2-2-6} Definition 2.2.6 (Matrix-matrix multiplication)
Given matrices $A$ and $B$, we form their product $AB$ by first writing $B$ in terms of its columns

$$ B = \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_p \end{array}\right] $$

and then defining

$$ AB = \left[\begin{array}{rrrr} A{\mathbf v}_1 & A{\mathbf v}_2 & \cdots & A{\mathbf v}_p \end{array}\right]. $$

:::

:::example {ex:example-2-2-7} Example 2.2.7
Given the matrices

$$ A = \left[\begin{array}{rr} 4 & 2 \\ 0 & 1 \\ -3 & 4 \\ 2 & 0 \\ \end{array}\right],~~~ B = \left[\begin{array}{rrr} -2 & 3 & 0 \\ 1 & 2 & -2 \\ \end{array}\right] $$

, we have

$$ AB = \left[\begin{array}{rrr} A \left[\begin{array}{r}-2 \\ 1 \end{array}\right] & A \left[\begin{array}{r}3 \\ 2 \end{array}\right] & A \left[\begin{array}{r}0 \\ -2 \end{array}\right] \end{array}\right] = \left[\begin{array}{rrr} -6 & 16 & -4 \\ 1 & 2 & -2 \\ 10 & -1 & -8 \\ -4 & 6 & 0 \end{array}\right] $$

.
:::

:::observation {obs:observation-2-2-8} Observation 2.2.8
It is important to note that we can only multiply matrices if the shapes of the matrices are compatible. More specifically, when constructing the product $AB$, the matrix $A$ multiplies the columns of $B$. Therefore, the number of columns of $A$ must equal the number of rows of $B$. When this condition is met, the number of rows of $AB$ is the number of rows of $A$, and the number of columns of $AB$ is the number of columns of $B$.
:::

:::activity {act:activity-2-2-5} Activity 2.2.5
Consider the matrices

$$ A = \left[\begin{array}{rrr} 1 & 3 & 2 \\ -3 & 4 & -1 \\ \end{array}\right],~~~ B = \left[\begin{array}{rr} 3 & 0 \\ 1 & 2 \\ -2 & -1 \\ \end{array}\right] $$

.

a) 
    Before computing, first explain why the shapes of $A$ and $B$ enable us to form the product $AB$. Then describe the shape of $AB$.

b) 
    Compute the product $AB$.

c) 
    Sage can multiply matrices using the `*` operator. Define the matrices $A$ and $B$ in the Sage cell below and check your work by computing $AB$.

    :::sage
    ```sage

    ```
    :::

d) 
    Are we able to form the matrix product $BA$? If so, use the Sage cell above to find $BA$. Is it generally true that $AB = BA$?

e) 
    Suppose we form the three matrices.

    $$ A = \left[\begin{array}{rr} 1 & 2 \\ 3 & -2 \\ \end{array}\right], B = \left[\begin{array}{rr} 0 & 4 \\ 2 & -1 \\ \end{array}\right], C = \left[\begin{array}{rr} -1 & 3 \\ 4 & 3 \\ \end{array}\right] $$

    . Compare what happens when you compute $A(B+C)$ and $AB + AC$. State your finding as a general principle.

    :::sage
    ```sage

    ```
    :::

f) 
    Compare the results of evaluating $A(BC)$ and $(AB)C$ and state your finding as a general principle.

g) 
    When we are dealing with real numbers, we know if $a\neq 0$ and $ab = ac$, then $b=c$. Define matrices

    $$ A = \left[\begin{array}{rr} 1 & 2 \\ -2 & -4 \\ \end{array}\right], B = \left[\begin{array}{rr} 3 & 0 \\ 1 & 3 \\ \end{array}\right], C = \left[\begin{array}{rr} 1 & 2 \\ 2 & 2 \\ \end{array}\right] $$

    and compute $AB$ and $AC$.

    :::sage
    ```sage

    ```
    :::

    If $AB = AC$, is it necessarily true that $B = C$?

h) 
    Again, with real numbers, we know that if $ab = 0$, then either $a = 0$ or $b=0$. Define

    $$ A = \left[\begin{array}{rr} 1 & 2 \\ -2 & -4 \\ \end{array}\right], B = \left[\begin{array}{rr} 2 & -4 \\ -1 & 2 \\ \end{array}\right] $$

    and compute $AB$.

    :::sage
    ```sage

    ```
    :::

    If $AB = 0$, is it necessarily true that either $A=0$ or $B=0$?

ANSWER:

a) 
    The product $AB$ exists because the number of columns of $A$ equals the number of rows of $B$. The dimensions of $AB$ are $2\times 2$.

b) 
    We have $AB = \left[\begin{array}{rr} 2 & 4 \\ -3 & 9 \end{array}\right]$.

c) 
    Define

    ```
    A = matrix(2, 3, [1, 3, 2, -3, 4, -1])
    B = matrix(3, 2, [3, 0, 1, 2, -2, -1])
    A*B
    	    
    ```

d) 
    It is not generally true that $AB=BA$.

e) 
    We find that $A(B+C)=AB + AC$.

f) 
    We find that $A(BC) = (AB)C$.

g) 
    It is not generally true that $B=C$ if $AB=AC$.

h) 
    It is not generally true that $A=0$ or $B=0$ if $AB=0$.

SOLUTION:

a) 
    The product $AB$ exists because the number of columns of $A$ equals the number of rows of $B$. The dimensions of $AB$ are $2\times 2$.

b) 
    We have $AB = \left[\begin{array}{rr} 2 & 4 \\ -3 & 9 \end{array}\right]$.

c) 
    Define

    ```
    A = matrix(2, 3, [1, 3, 2, -3, 4, -1])
    B = matrix(3, 2, [3, 0, 1, 2, -2, -1])
    A*B
    	    
    ```

d) 
    Yes, we can form the product $BA$ because the number of columns of $B$ equals the number of rows of $A$. This product $BA$ will be $3\times3$, however, so it must be true that $AB\neq BA$.

e) 
    We find that $A(B+C)=AB + AC$.

f) 
    We find that $A(BC) = (AB)C$.

g) 
    It is not generally true that $B=C$ if $AB=AC$, as illustrated by this example.

h) 
    It is not generally true that $A=0$ or $B=0$ if $AB=0$, as illustrated by this example.

:::

This activity demonstrated some general properties about products of matrices, which mirror some properties about operations with real numbers.

:::assemblage {asm:assemblage-} Properties of Matrix-matrix Multiplication
If $A$, $B$, and $C$ are matrices such that the following operations are defined, it follows that

- **Associativity:**: 
    $A(BC) = (AB)C$.

- **Distributivity:**: 
    $A(B+C) = AB+AC$.

    $(A+B)C = AC+BC$.

:::

At the same time, there are a few properties that hold for real numbers that do not hold for matrices.

:::assemblage {asm:assemblage-} Caution
The following properties hold for real numbers but not for matrices.

- **Commutativity:**: 
    It is *not* generally true that $AB = BA$.

- **Cancellation:**: 
    It is *not* generally true that $AB = AC$ implies that $B = C$.

- **Zero divisors:**: 
    It is *not* generally true that $AB = 0$ implies that either $A=0$ or $B=0$.

:::

## 2.2.5 Summary

In this section, we have found an especially simple way to express linear systems using matrix multiplication.

- 
    If $A$ is an $m\times n$ matrix and ${\mathbf x}$ an $n$-dimensional vector, then $A{\mathbf x}$ is the linear combination of the columns of $A$ using the components of ${\mathbf x}$ as weights. The vector $A{\mathbf x}$ is $m$-dimensional.

- 
    The solution space to the equation $A{\mathbf x} = {\mathbf b}$ is the same as the solution space to the linear system corresponding to the augmented matrix $\left[ \begin{array}{r|r} A & {\mathbf b} \end{array}\right]$.

- 
    If $A$ is an $m\times n$ matrix and $B$ is an $n\times p$ matrix, we can form the product $AB$, which is an $m\times p$ matrix whose columns are the products of $A$ and the columns of $B$.

## 2.2.6 Exercises

:::exercise {exercise-2-2-001} number=2.2.1 answered=yes src=src/exercises/exercises2-2.xml:4
PROBLEM:
Consider the system of linear equations

$$ \begin{alignedat}{4} x & {}+{} & 2y & {}-{} & z & {}={} & 1 \\ 3x & {}+{} & 2y & {}+{} & 2z & {}={} & 7 \\ -x & & & {}+{} & 4z & {}={} & -3 \\ \end{alignedat} $$

.

a) 
    Find the matrix $A$ and vector ${\mathbf b}$ that expresses this linear system in the form $A{\mathbf x}={\mathbf b}$.

b) 
    Give a description of the solution space to the equation $A{\mathbf x} = {\mathbf b}$.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    $A = \left[\begin{array}{rrr} 1 & 2 & -1 \\ 3 & 2 & 2 \\ -1 & 0 & 4 \\ \end{array}\right]$ and ${\mathbf b}=\left[\begin{array}{r}1 \\ 7 \\ -3 \end{array}\right]$.

b) 
    There is a unique solution ${\mathbf x}=\left[\begin{array}{r}3 \\ -1 \\ 0 \end{array}\right]$.

SOLUTION:

a) 
    $A = \left[\begin{array}{rrr} 1 & 2 & -1 \\ 3 & 2 & 2 \\ -1 & 0 & 4 \\ \end{array}\right]$ and ${\mathbf b}=\left[\begin{array}{r}1 \\ 7 \\ -3 \end{array}\right]$.

b) 
    We have

    $$ \left[\begin{array}{rrr|r} 1 & 2 & -1 & 1 \\ 3 & 2 & 2 & 7 \\ -1 & 0 & 4 & -3 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 0 & 3 \\ 0 & 1 & 0 & -1 \\ 0 & 0 & 1 & 0 \end{array}\right] $$

    so there is a unique solution ${\mathbf x}=\left[\begin{array}{r}3 \\ -1 \\ 0 \end{array}\right]$.

:::

:::exercise {exercise-2-2-002} number=2.2.2 answered=yes src=src/exercises/exercises2-2.xml:83
PROBLEM:
Suppose that $A$ is a $135\times2201$ matrix, and that ${\mathbf x}$ is a vector. If $A{\mathbf x}$ is defined, what is the dimension of ${\mathbf x}$? What is the dimension of $A{\mathbf x}$?
ANSWER:
${\mathbf x}\in{\mathbb R}^{2201}$ and $A{\mathbf x}\in{\mathbb R}^{135}$.
SOLUTION:
If $A{\mathbf x}$ is defined, then ${\mathbf x}\in{\mathbb R}^{2201}$ and $A{\mathbf x}\in{\mathbb R}^{135}$.
:::

:::exercise {exercise-2-2-003} number=2.2.3 answered=yes src=src/exercises/exercises2-2.xml:106
PROBLEM:
Suppose that $A$ is a $3\times2$ matrix whose columns are ${\mathbf v}_1$ and ${\mathbf v}_2$; that is,

$$ A = \left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array} \right] $$

.

a) 
    What is the dimension of the vectors ${\mathbf v}_1$ and ${\mathbf v}_2$?

b) 
    What is the product $A\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ in terms of ${\mathbf v}_1$ and ${\mathbf v}_2$? What is the product $A\left[\begin{array}{r}0 \\ 1 \end{array}\right]$? What is the product $A\left[\begin{array}{r}2 \\ 3 \end{array}\right]$?

c) 
    If we know that

    $$ A\left[\begin{array}{r}1 \\ 0 \end{array}\right] = \left[\begin{array}{r}3 \\ -2 \\ 1 \end{array}\right],~~~ A\left[\begin{array}{r}0 \\ 1 \end{array}\right] = \left[\begin{array}{r}0 \\ 3 \\ 2 \end{array}\right], $$

    what is the matrix $A$?

ANSWER:

a) 
    Both ${\mathbf v}_1$ and ${\mathbf v}_2$ are three-dimensional.

b) 
    $A\left[\begin{array}{r}1 \\ 0 \end{array}\right] = {\mathbf v}_1$ and $A\left[\begin{array}{r}0 \\ 1 \end{array}\right] = {\mathbf v}_2$. Also, $A\left[\begin{array}{r}2 \\ 3 \end{array}\right] = 2{\mathbf v}_1+3{\mathbf v}_3$.

c) 
    $A = \left[\begin{array}{rr} 3 & 0 \\ -2 & 3 \\ 1 & 2 \\ \end{array}\right]$

SOLUTION:

a) 
    Both ${\mathbf v}_1$ and ${\mathbf v}_2$ are three-dimensional.

b) 
    $A\left[\begin{array}{r}1 \\ 0 \end{array}\right] = {\mathbf v}_1$ and $A\left[\begin{array}{r}0 \\ 1 \end{array}\right] = {\mathbf v}_2$. Also, $A\left[\begin{array}{r}2 \\ 3 \end{array}\right] = 2{\mathbf v}_1+3{\mathbf v}_3$.

c) 
    $A = \left[\begin{array}{rr} 3 & 0 \\ -2 & 3 \\ 1 & 2 \\ \end{array}\right]$

:::

:::exercise {exercise-2-2-004} number=2.2.4 answered=yes src=src/exercises/exercises2-2.xml:183
PROBLEM:
Suppose that the matrix $A = \left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right]$ where ${\mathbf v}_1$ and ${\mathbf v}_2$ are shown in [Figure 2.2.9](ref:ex-eq-graphical).
> FIGURE {fig:ex-eq-graphical} number=2.2.9 src=../../media/ch02/ex-matrix-cols-2-2.svg
> alt: Two vectors v one and v two and their linear combinations
> width: 60%
> caption: Two vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ that form the columns of the matrix $A$.

a) 
    What is the shape of the matrix $A$?

b) 
    On [Figure 2.2.9](ref:ex-eq-graphical), indicate the vectors

    $$ A\left[\begin{array}{r}1 \\ 0 \end{array}\right], ~~~A\left[\begin{array}{r}2 \\ 3 \end{array}\right], ~~~A\left[\begin{array}{r}0 \\ -3 \end{array}\right] $$

    .

c) 
    Find all vectors ${\mathbf x}$ such that $A{\mathbf x}={\mathbf b}$.

d) 
    Find all vectors ${\mathbf x}$ such that $A{\mathbf x} = {\mathbf 0}$.

ANSWER:

a) 
    $A$ is a $2\times2$ matrix.

b) 
    We have

    > FIGURE {fig:fig-} number= src=../../media/ch02/ex-matrix-cols-sol-2-2.svg
    > alt: 
    > width: 50%
    > caption: The matrix-vector products

c) 
    There is a unique vector ${\mathbf x}=\left[\begin{array}{r}-3 \\ -3 \end{array}\right]$.

d) 
    There is a unique vector ${\mathbf x}=\left[\begin{array}{r}0 \\ 0 \end{array}\right]$.

SOLUTION:

a) 
    $A$ is a $2\times2$ matrix.

b) 
    We have

    > FIGURE {fig:fig-} number= src=../../media/ch02/ex-matrix-cols-sol-2-2.svg
    > alt: 
    > width: 50%
    > caption: The matrix-vector products

c) 
    There is a unique vector ${\mathbf x}=\left[\begin{array}{r}-3 \\ -3 \end{array}\right]$.

d) 
    There is a unique vector ${\mathbf x}=\left[\begin{array}{r}0 \\ 0 \end{array}\right]$.

:::

:::exercise {exercise-2-2-005} number=2.2.5 answered=yes src=src/exercises/exercises2-2.xml:286
PROBLEM:
Suppose that

$$ A=\left[\begin{array}{rrr} 1 & 0 & 2 \\ 2 & 2 & 2 \\ -1 & -3 & 1 \end{array}\right] $$

.

a) 
    Describe the solution space to the equation $A{\mathbf x} = {\mathbf 0}$.

b) 
    Find a $3\times2$ matrix $B$ with no zero entries such that $AB = 0$.

ANSWER:

a) 
    ${\mathbf x}=\left[\begin{array}{r}-2x_3 \\ x_3 \\ x_3 \end{array}\right] = x_3\left[\begin{array}{r}-2 \\ 1 \\ 1 \end{array}\right]\text{.}$

b) 
    There are many possibilities. For instance, $B = \left[\begin{array}{rr} -2 & 2 \\ 1 & -1 \\ 1 & -1 \\ \end{array}\right]\text{.}$

SOLUTION:

a) 
    We construct the augmented matrix

    $$ \left[\begin{array}{rrr|r} 1 & 0 & 2 & 0 \\ 2 & 2 & 2 & 0 \\ -1 & -3 & 1 & 0 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 2 & 0 \\ 0 & 1 & -1 & 0 \\ 0 & 0 & 0 & 0 \end{array}\right]\text{,} $$

    which shows that

    $$ {\mathbf x}=\left[\begin{array}{r}-2x_3 \\ x_3 \\ x_3 \end{array}\right] = x_3\left[\begin{array}{r}-2 \\ 1 \\ 1 \end{array}\right]\text{.} $$

b) 
    We form $B$ by choosing two vectors in the solution space to $A{\mathbf x}={\mathbf 0}$. For instance, $B = \left[\begin{array}{rr} -2 & 2 \\ 1 & -1 \\ 1 & -1 \\ \end{array}\right]\text{.}$

:::

:::exercise {exercise-2-2-006} number=2.2.6 answered=yes src=src/exercises/exercises2-2.xml:364
PROBLEM:
Consider the matrix

$$ A=\left[\begin{array}{rrrr} 1 & 2 & -4 & -4 \\ 2 & 3 & 0 & 1 \\ 1 & 0 & 4 & 6 \\ \end{array}\right] $$

.

a) 
    Find the product $A{\mathbf x}$ where

    $$ {\mathbf x} = \left[\begin{array}{r}1 \\ -2 \\ 0 \\ 2 \end{array}\right] $$

    .

b) 
    Give a description of the vectors ${\mathbf x}$ such that

    $$ A{\mathbf x} = \left[\begin{array}{r}-1 \\ 15 \\ 17 \end{array}\right] $$

    .

    :::sage
    ```sage

    ```
    :::

c) 
    Find the reduced row echelon form of $A$ and identify the pivot positions.

d) 
    Can you find a vector ${\mathbf b}$ such that $A{\mathbf x}={\mathbf b}$ is inconsistent?

e) 
    For a general 3-dimensional vector ${\mathbf b}$, what can you say about the solution space of the equation $A{\mathbf x} = {\mathbf b}$?

ANSWER:

a) 
    $A{\mathbf x} = \left[\begin{array}{r}-11 \\ -2 \\ 13 \end{array}\right]$.

b) 
    ${\mathbf x}=\left[\begin{array}{r}9-2x_4 \\ -1+x_4 \\ 2-x_4 \\ x_4 \end{array}\right] =\left[\begin{array}{r}9 \\ -1 \\ 2 \\ 0 \end{array}\right]+x_4\left[\begin{array}{r}-2 \\ 1 \\ -1 \\ 1 \end{array}\right]$.

c) 
    We see that $A \sim \left[\begin{array}{rrrr} {\mathbf 1} & 0 & 0 & 2 \\ 0 & {\mathbf 1} & 0 & -1 \\ 0 & 0 & {\mathbf 1} & 1 \\ \end{array}\right]\text{.}$

d) 
    No

e) 
    The solution space will form a line in ${\mathbb R}^4$, as in part b.

SOLUTION:

a) 
    $A{\mathbf x} = \left[\begin{array}{r}-11 \\ -2 \\ 13 \end{array}\right]$.

b) 
    We consider the augmented matrix

    $$ \left[\begin{array}{rrrr|r} 1 & 2 & -4 & -4 & -1 \\ 2 & 3 & 0 & 1 & 15 \\ 1 & 0 & 4 & 6 & 17 \end{array}\right] \sim \left[\begin{array}{rrrr|r} 1 & 0 & 0 & 2 & 9 \\ 0 & 1 & 0 & -1 & -1 \\ 0 & 0 & 1 & 1 & 2 \end{array}\right] $$

    so that ${\mathbf x}=\left[\begin{array}{r}9-2x_4 \\ -1+x_4 \\ 2-x_4 \\ x_4 \end{array}\right] =\left[\begin{array}{r}9 \\ -1 \\ 2 \\ 0 \end{array}\right]+x_4\left[\begin{array}{r}-2 \\ 1 \\ -1 \\ 1 \end{array}\right]$.

c) 
    We see that $A \sim \left[\begin{array}{rrrr} {\mathbf 1} & 0 & 0 & 2 \\ 0 & {\mathbf 1} & 0 & -1 \\ 0 & 0 & {\mathbf 1} & 1 \\ \end{array}\right]\text{.}$

d) 
    There is no vector ${\mathbf b}$ such that $A{\mathbf x}={\mathbf b}$ is inconsistent because the augmented matrix $\left[\begin{array}{r|r} A & {\mathbf b} \end{array}\right]$ cannot have a pivot position in the rightmost column.

e) 
    The coefficient matrix $\left[\begin{array}{r|r} A & {\mathbf b} \end{array}\right]$ will have exactly one column without a pivot position. Therefore, the solution space will form a line in ${\mathbb R}^4$, as in part b.

:::

:::exercise {exercise-2-2-007} number=2.2.7 answered=yes src=src/exercises/exercises2-2.xml:491
PROBLEM:
The operations that we perform in Gaussian elimination can be accomplished using matrix multiplication. This observation is the basis of an important technique that we will investigate in a subsequent chapter.
Let's consider the matrix

$$ A = \left[\begin{array}{rrr} 1 & 2 & -1 \\ 2 & 0 & 2 \\ -3 & 2 & 3 \\ \end{array}\right] $$

.

a) 
    Suppose that

    $$ S = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 7 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] $$

    . Verify that $SA$ is the matrix that results when the second row of $A$ is scaled by a factor of 7. What matrix $S$ would scale the third row by -3?

b) 
    Suppose that

    $$ P = \left[\begin{array}{rrr} 0 & 1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] $$

    . Verify that $PA$ is the matrix that results from interchanging the first and second rows. What matrix $P$ would interchange the first and third rows?

c) 
    Suppose that

    $$ L_1 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] $$

    . Verify that $L_1A$ is the matrix that results from multiplying the first row of $A$ by $-2$ and adding it to the second row. What matrix $L_2$ would multiply the first row by 3 and add it to the third row?

d) 
    When we performed Gaussian elimination, our first goal was to perform row operations that brought the matrix into a triangular form. For our matrix $A$, find the row operations needed to find a row equivalent matrix $U$ in triangular form. By expressing these row operations in terms of matrix multiplication, find a matrix $L$ such that $LA = U$.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    To scale the third row by $-3$, we would use the matrix $S= \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & -3 \\ \end{array}\right]$.

b) 
    To interchange the first and third rows, we would use $P= \left[\begin{array}{rrr} 0 & 0 & 1 \\ 0 & 1 & 0 \\ 1 & 0 & 0 \\ \end{array}\right]$.

c) 
    To multiply the first row by 3 and add to the third row, we would use $L_2= \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 3 & 0 & 1 \\ \end{array}\right]$.

d) 
    $L= \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ -1 & 2 & 1 \end{array}\right]$.

SOLUTION:

a) 
    We compute that

    $$ SA = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 7 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 1 & 2 & -1 \\ 2 & 0 & 2 \\ -3 & 2 & 3 \\ \end{array}\right] = \left[\begin{array}{rrr} 1 & 2 & -1 \\ 14 & 0 & 14 \\ -3 & 2 & 3 \\ \end{array}\right]\text{.} $$

    To scale the third row by $-3$, we would use the matrix $S= \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & -3 \\ \end{array}\right]$.

b) 
    We compute that

    $$ PA = \left[\begin{array}{rrr} 0 & 1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 1 & 2 & -1 \\ 2 & 0 & 2 \\ -3 & 2 & 3 \\ \end{array}\right] = \left[\begin{array}{rrr} 2 & 0 & 2 \\ 1 & 2 & -1 \\ -3 & 2 & 3 \\ \end{array}\right]\text{.} $$

    To interchange the first and third rows, we would use $P= \left[\begin{array}{rrr} 0 & 0 & 1 \\ 0 & 1 & 0 \\ 1 & 0 & 0 \\ \end{array}\right]$.

c) 
    We compute that

    $$ L_1A = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 1 & 2 & -1 \\ 2 & 0 & 2 \\ -3 & 2 & 3 \\ \end{array}\right] = \left[\begin{array}{rrr} 1 & 2 & -1 \\ 0 & -4 & 4 \\ -3 & 2 & 3 \\ \end{array}\right]\text{.} $$

    To multiply the first row by 3 and add to the third row, we would use $L_2= \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 3 & 0 & 1 \\ \end{array}\right]$.

d) 
    Keeping track of the operations we perform in Gaussian elimination, we define

    $$ \begin{array}{cc} L_1= \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right], & L_2= \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 3 & 0 & 1 \\ \end{array}\right], \\ L_3 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 2 & 1 \\ \end{array}\right]\text{.} \end{array} $$

    Then $L_3L_2L_1A = \left[\begin{array}{rrr} 1 & 2 & -1 \\ 0 & -4 & 4 \\ 0 & 0 & 8 \\ \end{array}\right]$. So $L=L_3L_2L_1 = \left[\begin{array}{rrr} 1 & 0 & 0 \\ -2 & 1 & 0 \\ -1 & 2 & 1 \end{array}\right]$.

:::

:::exercise {exercise-2-2-008} number=2.2.8 answered=yes src=src/exercises/exercises2-2.xml:748
PROBLEM:
In this exercise, you will construct the *inverse* of a matrix, a subject that we will investigate more fully in the next chapter. Suppose that $A$ is the $2\times2$ matrix:

$$ A = \left[\begin{array}{rr} 3 & -2 \\ -2 & 1 \\ \end{array}\right] $$

.

a) 
    Find the vectors ${\mathbf b}_1$ and ${\mathbf b}_2$ such that the matrix $B=\left[\begin{array}{rr} {\mathbf b}_1 & {\mathbf b}_2 \end{array}\right]$ satisfies

    $$ AB = I = \left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ \end{array}\right] $$

    .

    :::sage
    ```sage

    ```
    :::

b) 
    In general, it is not true that $AB = BA$. Check that it is true, however, for the specific $A$ and $B$ that appear in this problem.

    :::sage
    ```sage

    ```
    :::

c) 
    Suppose that ${\mathbf x} = \left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]$. What do you find when you evaluate $I{\mathbf x}$?

d) 
    Suppose that we want to solve the equation $A{\mathbf x} = {\mathbf b}$. We know how to do this using Gaussian elimination; let's use our matrix $B$ to find a different way:

    $$ \begin{aligned} A{\mathbf x} & {}={} {\mathbf b} \\ B(A{\mathbf x}) & {}={} B{\mathbf b} \\ (BA){\mathbf x} & {}={} B{\mathbf b} \\ I{\mathbf x} & {}={} B{\mathbf b} \\ {\mathbf x} & {}={} B{\mathbf b} \\ \end{aligned} $$

    . In other words, the solution to the equation $A{\mathbf x}={\mathbf b}$ is ${\mathbf x} = B{\mathbf b}$.

    Consider the equation $A{\mathbf x} = \left[\begin{array}{r}5 \\ -2 \end{array}\right]$. Find the solution in two different ways, first using Gaussian elimination and then as ${\mathbf x} = B{\mathbf b}$, and verify that you have found the same result.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    $B = \left[ \begin{array}{rr} -1 & -2 \\ -2 & -3 \\ \end{array}\right]\text{.}$

b) 
    It is true, in this case, that $AB=BA=I$.

c) 
    $I{\mathbf x} = {\mathbf x}$.

d) 
    ${\mathbf x}=B{\mathbf b}=\left[\begin{array}{r}-1 \\ -4 \end{array}\right]$.

SOLUTION:

a) 
    We find ${\mathbf b}_1$ and ${\mathbf b}_2$ by solving the equations

    $$ A{\mathbf b}_1=\left[\begin{array}{r}1 \\ 0 \end{array}\right], A{\mathbf b}_2=\left[\begin{array}{r}0 \\ 1 \end{array}\right]\text{.} $$

    This gives

    $$ B = \left[ \begin{array}{rr} -1 & -2 \\ -2 & -3 \\ \end{array}\right]\text{.} $$

b) 
    It is true, in this case, that $AB=BA=I$.

c) 
    We have seen that $I{\mathbf x} = {\mathbf x}$.

d) 
    If ${\mathbf b}=\left[\begin{array}{r}5 \\ -2 \end{array}\right]$, then ${\mathbf x}=B{\mathbf b}=\left[\begin{array}{r}-1 \\ -4 \end{array}\right]$ is the solution to the equation $A{\mathbf x}={\mathbf b}$.

:::

:::exercise {exercise-2-2-009} number=2.2.9 answered=yes src=src/exercises/exercises2-2.xml:881
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response.

a) 
    If $A{\mathbf x}$ is defined, then the number of components of ${\mathbf x}$ equals the number of rows of $A$.

b) 
    The solution space to the equation $A{\mathbf x} = {\mathbf b}$ is equivalent to the solution space to the linear system whose augmented matrix is $\left[\begin{array}{r|r} A & {\mathbf b} \end{array}\right]$.

c) 
    If a linear system of equations has 8 equations and 5 unknowns, then the shape of the matrix $A$ in the corresponding equation $A{\mathbf x} = {\mathbf b}$ is $5\times8$.

d) 
    If $A$ has a pivot position in every row, then every equation $A{\mathbf x} = {\mathbf b}$ is consistent.

e) 
    If $A$ is a $9\times5$ matrix, then $A{\mathbf x}={\mathbf b}$ is inconsistent for some vector ${\mathbf b}$.

ANSWER:

a) 
    False

b) 
    True

c) 
    False

d) 
    True

e) 
    True

SOLUTION:

a) 
    False, the number of components of ${\mathbf x}$ equals the number of columns of $A$.

b) 
    True. This is a result of [Proposition 2.2.4](ref:prop-matrix-eq-solution).

c) 
    False. The shape of $A$ is $8\times5$.

d) 
    True, because the augmented matrix $\left[\begin{array}{r|r} A & {\mathbf b} \end{array}\right]$ cannot have a pivot position in the rightmost column.

e) 
    True. Because there is not a pivot position in every row of $A$, the augmented matrix $\left[\begin{array}{r|r} A & {\mathbf b} \end{array}\right]$ will have a pivot position in the rightmost column for some vectors ${\mathbf b}$.

:::

:::exercise {exercise-2-2-010} number=2.2.10 answered=yes src=src/exercises/exercises2-2.xml:967
PROBLEM:
Suppose that $A$ is a $4\times4$ matrix and that the equation $A{\mathbf x} = {\mathbf b}$ has a unique solution for some vector ${\mathbf b}$.

a) 
    What does this say about the pivot positions of the matrix $A$? Write the reduced row echelon form of $A$.

b) 
    Can you find another vector ${\mathbf c}$ such that $A{\mathbf x} = {\mathbf c}$ is inconsistent?

c) 
    What can you say about the solution space to the equation $A{\mathbf x} = {\mathbf 0}$?

d) 
    Suppose $A=\left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 & {\mathbf v}_4 \end{array}\right]$. Explain why every four-dimensional vector can be written as a linear combination of the vectors ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_3$, and ${\mathbf v}_4$ in exactly one way.

ANSWER:

a) 
    $A \sim \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    No

c) 
    ${\mathbf x}={\mathbf 0}$.

d) 
    Every equation $A{\mathbf x}={\mathbf b}$ has exactly one solution.

SOLUTION:

a) 
    Since the solution is unique, there must be a pivot position in every column of $A$. This means that there are four pivot positions so there is a pivot position in every row. In other words, $A \sim \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    No, because $A$ has a pivot in every row.

c) 
    There is only one solution, which is ${\mathbf x}={\mathbf 0}$.

d) 
    If ${\mathbf b}$ is a four-dimensional vector, then $A{\mathbf x}={\mathbf b}$ has a unique solution since $A$ has a pivot position in every row and every column. This means that ${\mathbf b}$ can be written as a linear combination of the columns of $A$ in exactly one way.

:::

:::exercise {exercise-2-2-011} number=2.2.11 answered=yes src=src/exercises/exercises2-2.xml:1050
PROBLEM:
Define the matrix

$$ A = \left[\begin{array}{rrr} 1 & 2 & 4 \\ -2 & 1 & -3 \\ 3 & 1 & 7 \\ \end{array}\right] $$

.

a) 
    Describe the solution space to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$ using a parametric description, if appropriate. What does this solution space represent geometrically?

    :::sage
    ```sage

    ```
    :::

b) 
    Describe the solution space to the equation $A{\mathbf x}={\mathbf b}$ where ${\mathbf b} = \left[\begin{array}{r}-3 \\ -4 \\ 1 \end{array}\right]$. What does this solution space represent geometrically and how does it compare to the previous solution space?

    :::sage
    ```sage

    ```
    :::

c) 
    We will now explain the relationship between the previous two solution spaces. Suppose that ${\mathbf x}_h$ is a solution to the homogeneous equation; that is $A{\mathbf x}_h={\mathbf 0}$. Suppose also that ${\mathbf x}_p$ is a solution to the equation $A{\mathbf x} = {\mathbf b}$; that is, $A{\mathbf x}_p={\mathbf b}$.

    Use the Linearity Principle expressed in [Proposition 2.2.3](ref:prop-matrix-mult-prop) to explain why ${\mathbf x}_h+{\mathbf x}_p$ is a solution to the equation $A{\mathbf x} = {\mathbf b}$. You may do this by evaluating $A({\mathbf x}_h+{\mathbf x}_p)$.

    That is, if we find one solution ${\mathbf x}_p$ to an equation $A{\mathbf x} = {\mathbf b}$, we may add any solution to the homogeneous equation to ${\mathbf x}_p$ and still have a solution to the equation $A{\mathbf x} = {\mathbf b}$. In other words, the solution space to the equation $A{\mathbf x} = {\mathbf b}$ is given by translating the solution space to the homogeneous equation by the vector ${\mathbf x}_p$.

ANSWER:

a) 
    ${\mathbf x} = x_3\left[\begin{array}{r}-2 \\ -1 \\ 1 \end{array}\right]$.

b) 
    ${\mathbf x}=\left[\begin{array}{r}1 \\ -2 \\ 0 \end{array}\right]+x_3\left[\begin{array}{r}-2 \\ -1 \\ 1 \end{array}\right]$.

c) 
    Notice that $A({\mathbf x}_h + {\mathbf x}_p) = A{\mathbf x}_h + A{\mathbf x}_p = {\mathbf 0} + {\mathbf b} = {\mathbf b}$.

SOLUTION:

a) 
    We have the augmented matrix

    $$ \left[\begin{array}{rrr|r} 1 & 2 & 4 & 0 \\ -2 & 1 & -3 & 0 \\ 3 & 1 & 7 & 0 \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 2 & 0 \\ 0 & 1 & 1 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array}\right] $$

    so that ${\mathbf x} = x_3\left[\begin{array}{r}-2 \\ -1 \\ 1 \end{array}\right]$. The solution space is a line that passes through the origin.

b) 
    Now we have

    $$ \left[\begin{array}{rrr|r} 1 & 2 & 4 & -3 \\ -2 & 1 & -3 & -4 \\ 3 & 1 & 7 & 1 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 2 & 1 \\ 0 & 1 & 1 & -2 \\ 0 & 0 & 0 & 0 \end{array}\right] $$

    so that ${\mathbf x}=\left[\begin{array}{r}1 \\ -2 \\ 0 \end{array}\right]+x_3\left[\begin{array}{r}-2 \\ -1 \\ 1 \end{array}\right]$. This is a line through $\left[\begin{array}{r}1 \\ -2 \\ 0 \end{array}\right]$ parallel to $\left[\begin{array}{r}-2 \\ -1 \\ 1 \end{array}\right]$. Notice that this line is parallel to the line in part a.

c) 
    Notice that $A({\mathbf x}_h + {\mathbf x}_p) = A{\mathbf x}_h + A{\mathbf x}_p = {\mathbf 0} + {\mathbf b} = {\mathbf b}$. This shows that if we add a vector from the solution space to $A{\mathbf x}={\mathbf 0}$ to a vector from the solution space to $A{\mathbf x}={\mathbf b}$, we obtain a vector in the solution space to $A{\mathbf x}={\mathbf b}$.

:::

:::exercise {exercise-2-2-012} number=2.2.12 answered=yes src=src/exercises/exercises2-2.xml:1184
PROBLEM:
Suppose that a city is starting a bicycle sharing program with bicycles at locations $B$ and $C$. Bicycles that are rented at one location may be returned to either location at the end of the day. Over time, the city finds that 80% of bicycles rented at location $B$ are returned to $B$ with the other 20% returned to $C$. Similarly, 50% of bicycles rented at location $C$ are returned to $B$ and 50% to $C$.
To keep track of the bicycles, we form a vector

$$ {\mathbf x}_k = \left[\begin{array}{r}B_k \\ C_k \end{array}\right] $$

where $B_k$ is the number of bicycles at location $B$ at the beginning of day $k$ and $C_k$ is the number of bicycles at $C$. The information above tells us how to determine the distribution of bicycles the following day:

$$ \begin{alignedat}{3} B_{k+1} & {}={} 0.8B_k & {}+{} & 0.5 C_k \\ C_{k+1} & {}={} 0.2B_k & {}+{} & 0.5 C_k. \\ \end{alignedat} $$

Expressed in matrix-vector form, these expressions give

$$ {\mathbf x}_{k+1} = A{\mathbf x}_k $$

where

$$ A = \left[\begin{array}{rr} 0.8 & 0.5 \\ 0.2 & 0.5 \\ \end{array}\right] $$

.
:::sage
```sage

```
:::

a) 
    Let's check that this makes sense.

    1. 
        Suppose that there are 1000 bicycles at location $B$ and none at $C$ on day 1. This means we have ${\mathbf x}_1 = \left[\begin{array}{r}1000 \\ 0 \end{array}\right]$. Find the number of bicycles at both locations on day 2 by evaluating ${\mathbf x}_2 = A{\mathbf x}_1$.

    2. 
        Suppose that there are 1000 bicycles at location $C$ and none at $B$ on day 1. Form the vector ${\mathbf x}_1$ and determine the number of bicycles at the two locations the next day by finding ${\mathbf x}_2 = A{\mathbf x}_1$.

b) 
    Suppose that one day there are 1050 bicycles at location $B$ and 450 at location $C$. How many bicycles were there at each location the previous day?

c) 
    Suppose that there are 500 bicycles at location $B$ and 500 at location $C$ on Monday. How many bicycles are there at the two locations on Tuesday? on Wednesday? on Thursday?

ANSWER:

a) 
    We see that

    1. 
        $x_2 = \left[\begin{array}{r}800 \\ 200 \end{array}\right]$.

    2. 
        $x_2 = \left[\begin{array}{r}500 \\ 500 \end{array}\right]$.

b) 
    ${\mathbf x} = \left[\begin{array}{r}1000 \\ 500 \end{array}\right]$.

c) 
    $\left[\begin{array}{r}650 \\ 350 \end{array}\right]$ represents the distribution of bicycles on Tuesday, $\left[\begin{array}{r}695 \\ 305 \end{array}\right]$ represents the distribution of bicycles on Wednesday, and $\left[\begin{array}{r}708.5 \\ 291.5 \end{array}\right]$ on Thursday.

SOLUTION:

a) 
    We see that

    1. 
        $x_2 = \left[\begin{array}{r}800 \\ 200 \end{array}\right]$.

    2. 
        $x_2 = \left[\begin{array}{r}500 \\ 500 \end{array}\right]$.

b) 
    We solve the equation $A{\mathbf x} = \left[\begin{array}{r}1050 \\ 450 \end{array}\right]$ to obtain ${\mathbf x} = \left[\begin{array}{r}1000 \\ 500 \end{array}\right]$.

c) 
    If ${\mathbf x}_1 = \left[\begin{array}{r}500 \\ 500 \end{array}\right]$ represents the distribution of bicycles on Monday, then ${\mathbf x}_2=A{\mathbf x}_1 = \left[\begin{array}{r}650 \\ 350 \end{array}\right]$ represents the distribution of bicycles on Tuesday, ${\mathbf x}_3=A{\mathbf x}_2=\left[\begin{array}{r}695 \\ 305 \end{array}\right]$ represents the distribution of bicycles on Wednesday, and ${\mathbf x}_4=A{\mathbf x}_3=\left[\begin{array}{r}708.5 \\ 291.5 \end{array}\right]$ on Thursday.

:::

:::exercise {exercise-2-2-013} number=2.2.13 answered=yes src=src/exercises/exercises2-2.xml:1306
PROBLEM:
This problem is a continuation of the previous problem.

a) 
    Let us define vectors

    $$ {\mathbf v}_1 = \left[\begin{array}{r}5 \\ 2 \end{array}\right], ~~~ {\mathbf v}_2 = \left[\begin{array}{r}-1 \\ 1 \end{array}\right] $$

    . Show that

    $$ A{\mathbf v}_1 = {\mathbf v}_1, ~~~A{\mathbf v}_2 = 0.3{\mathbf v}_2 $$

    .

b) 
    Suppose that ${\mathbf x}_1 = c_1 {\mathbf v}_1 + c_2 {\mathbf v}_2$ where $c_1$ and $c_2$ are scalars. Use the Linearity Principle expressed in [Proposition 2.2.3](ref:prop-matrix-mult-prop) to explain why

    $$ {\mathbf x}_{2} = A{\mathbf x}_1 = c_1{\mathbf v}_1 + 0.3c_2{\mathbf v}_2 $$

    .

c) 
    Continuing in this way, explain why

    $$ \begin{aligned} {\mathbf x}_{3} = A{\mathbf x}_2 & {}={} c_1{\mathbf v}_1 +0.3^2c_2{\mathbf v}_2 \\ {\mathbf x}_{4} = A{\mathbf x}_3 & {}={} c_1{\mathbf v}_1 +0.3^3c_2{\mathbf v}_2 \\ {\mathbf x}_{5} = A{\mathbf x}_4 & {}={} c_1{\mathbf v}_1 +0.3^4c_2{\mathbf v}_2 \\ \end{aligned} $$

    .

d) 
    Suppose that there are initially 500 bicycles at location $B$ and 500 at location $C$. Write the vector ${\mathbf x}_1$ and find the scalars $c_1$ and $c_2$ such that ${\mathbf x}_1=c_1{\mathbf v}_1 + c_2{\mathbf v}_2$.

e) 
    Use the previous part of this problem to determine ${\mathbf x}_2$, ${\mathbf x}_3$ and ${\mathbf x}_4$.

f) 
    After a very long time, how are all the bicycles distributed?

ANSWER:

a) 
    $A{\mathbf v}_1 = \left[\begin{array}{r}5 \\ 2 \end{array}\right] = {\mathbf v}_1$ and $A{\mathbf v}_2 = \left[\begin{array}{r}-0.3 \\ 0.3 \end{array}\right] = 0.3{\mathbf v}_2$.

b) 
    We have

    $$ \begin{array}{rl} {\mathbf x}_2=A{\mathbf x}_1 = & A(c_1{\mathbf v}_1+c_2{\mathbf v}_2) \\ =& c_1A{\mathbf v}_1 + c_2A{\mathbf v}_2 = c_1{\mathbf v}_1 +0.3c_2{\mathbf v}_2\text{.} \end{array} $$

c) 

    $$ \begin{array}{rl} {\mathbf x}_3=A{\mathbf x}_2=& A(c_1{\mathbf v}_1+0.3c_2{\mathbf v}_2) \\ = & c_1A{\mathbf v}_1 +0.3c_2A{\mathbf v}_2 = c_1{\mathbf v}_1 +0.3^2c_2{\mathbf v}_2\text{.} \end{array} $$

    and so on.

d) 
    We find that

    $$ {\mathbf x}_1=\left[\begin{array}{r}500 \\ 500 \end{array}\right] = \frac{1000}{7}{\mathbf v}_1 + \frac{1500}{7}{\mathbf v}_2 $$

    .

e) 
    Then

    $$ \begin{array}{l} {\mathbf x}_2=\frac{1000}{7}{\mathbf v}_1 + 0.3\frac{1500}{7}{\mathbf v}{2}, \\ {\mathbf x}_3=\frac{1000}{7}{\mathbf v}_1 + 0.3^2\frac{1500}{7}{\mathbf v}{2}, \\ {\mathbf x}_4=\frac{1000}{7}{\mathbf v}_1 + 0.3^3\frac{1500}{7}{\mathbf v}{2}\text{.} \end{array} $$

f) 
    After a very long time, the second term becomes increasingly close to zero and so

    $$ {\mathbf x}\approx\frac{1000}{7}{\mathbf v}_1 = \left[\begin{array}{r}5000/7 \\ 2000/7 \end{array}\right] = \left[\begin{array}{r}714.3 \\ 285.7 \end{array}\right]\text{.} $$

SOLUTION:

a) 
    $A{\mathbf v}_1 = \left[\begin{array}{r}5 \\ 2 \end{array}\right] = {\mathbf v}_1$ and $A{\mathbf v}_2 = \left[\begin{array}{r}-0.3 \\ 0.3 \end{array}\right] = 0.3{\mathbf v}_2$.

b) 
    We have

    $$ \begin{array}{rl} {\mathbf x}_2=A{\mathbf x}_1 = & A(c_1{\mathbf v}_1+c_2{\mathbf v}_2) \\ =& c_1A{\mathbf v}_1 + c_2A{\mathbf v}_2 = c_1{\mathbf v}_1 +0.3c_2{\mathbf v}_2\text{.} \end{array} $$

c) 

    $$ \begin{array}{rl} {\mathbf x}_3=A{\mathbf x}_2=& A(c_1{\mathbf v}_1+0.3c_2{\mathbf v}_2) \\ = & c_1A{\mathbf v}_1 -0.3c_2A{\mathbf v}_2 = c_1{\mathbf v}_1 +0.3^2c_2{\mathbf v}_2\text{.} \end{array} $$

    and so on.

d) 
    We find that

    $$ {\mathbf x}_1=\left[\begin{array}{r}500 \\ 500 \end{array}\right] = \frac{1000}{7}{\mathbf v}_1 + \frac{1500}{7}{\mathbf v}_2 $$

    .

e) 
    Then

    $$ \begin{array}{l} {\mathbf x}_2=\frac{1000}{7}{\mathbf v}_1 + 0.3\frac{1500}{7}{\mathbf v}{2}, \\ {\mathbf x}_3=\frac{1000}{7}{\mathbf v}_1 + 0.3^2\frac{1500}{7}{\mathbf v}{2}, \\ {\mathbf x}_4=\frac{1000}{7}{\mathbf v}_1 + 0.3^3\frac{1500}{7}{\mathbf v}{2}\text{.} \end{array} $$

f) 
    After a very long time, the second term becomes increasingly close to zero and so

    $$ {\mathbf x}\approx\frac{1000}{7}{\mathbf v}_1 = \left[\begin{array}{r}5000/7 \\ 2000/7 \end{array}\right] = \left[\begin{array}{r}714.3 \\ 285.7 \end{array}\right]\text{.} $$

:::
