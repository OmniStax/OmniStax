# 4.1 An introduction to eigenvalues and eigenvectors {sec-eigen-intro}

This section introduces the concept of eigenvalues and eigenvectors and offers an example that motivates our interest in them. The point here is to develop an intuitive understanding of eigenvalues and eigenvectors and explain how they can be used to simplify some problems that we have previously encountered. In the rest of this chapter, we will develop this concept into a richer theory and illustrate its use with more meaningful examples.

## 4.1.1 Introduction

:::exploration {act:preview-4-1-1} Preview Activity 4.1.1
Before we introduce the definition of eigenvectors and eigenvalues, it will be helpful to remember some ideas we have seen previously.
PROBLEM:
a) Suppose that ${\mathbf v}$ is the vector shown in the figure. Sketch the vector $2{\mathbf v}$ and the vector $-{\mathbf v}$.

    > IMAGE {img:eigen-intro-vec} src=../../media/ch04/eigen-intro-vec.svg
    > alt: A two dimensional vector and coordinate grid.

b) State the geometric effect that scalar multiplication has on the vector ${\mathbf v}$. Then sketch all the vectors of the form $\lambda {\mathbf v}$ where $\lambda$ is a scalar.
c) State the geometric effect of the matrix transformation defined by

    $$ \left[\begin{array}{rr} 3 & 0 \\ 0 & -1 \\ \end{array}\right] $$

    .
d) Suppose that $A$ is a $2\times 2$ matrix and that ${\mathbf v}_1$ and ${\mathbf v}_2$ are vectors such that

    $$ A{\mathbf v}_1 = 3 {\mathbf v}_1, \qquad A{\mathbf v}_2 = -{\mathbf v}_2 $$

    . Use the linearity of matrix multiplication to express the following vectors in terms of ${\mathbf v}_1$ and ${\mathbf v}_2$.

    1. 
        $A(4{\mathbf v}_1)$.

    2. 
        $A({\mathbf v}_1 + {\mathbf v}_2)$.

    3. 
        $A(4{\mathbf v}_1 -3{\mathbf v}_2)$.

    4. 
        $A^2{\mathbf v}_1$.

    5. 
        $A^2(4{\mathbf v}_1 - 3{\mathbf v}_2)$.

    6. 
        $A^4{\mathbf v}_1$.

SOLUTION:
a) The vectors are as shown.
    > IMAGE {img:ex-eigen-intro-vec} src=../../media/ch04/ex-eigen-intro-vec.svg
    > width: 40%
b) Scalar multiplication has the effect of stretching and possibly flipping ${\mathbf v}$ along the line defined by ${\mathbf v}$.
c) This matrix transformation stretches vectors by a factor of $3$ in the horizontal direction and flips vectors vertically.
d) Applying linearity, we see that

    1. 
        $A(4{\mathbf v}_1) = 4A{\mathbf v}_1 = 12{\mathbf v}_1$.

    2. 
        $A({\mathbf v}_1+{\mathbf v}_2) = A{\mathbf v}_1 + A{\mathbf v}_2 = 3{\mathbf v}_1 - {\mathbf v}_2$.

    3. 
        $A(4{\mathbf v}_1-3{\mathbf v}_2) = 4A{\mathbf v}_1 -3A{\mathbf v}_2 = 12{\mathbf v}_1 + 3{\mathbf v}_2$.

    4. 
        $A^2{\mathbf v}_1 = A(3{\mathbf v}_1) = 9{\mathbf v}_1$.

    5. 
        $A^2(4{\mathbf v}_1-3{\mathbf v}_2) = A(12{\mathbf v}_1 +3{\mathbf v}_2) = 36{\mathbf v}_1 - 3{\mathbf v}_2$.

    6. 
        $A^4{\mathbf v}_1 = 3^4{\mathbf v}_1 = 81{\mathbf v}_1$.

:::

## 4.1.2 A few examples

We will now introduce the definition of eigenvalues and eigenvectors and then look at a few simple examples.

:::definition {def:definition-eigenvectors} Definition 4.1.1
{index-entry:eigenvalue} {index-entry:eigenvector} Given a square $n\times n$ matrix $A$, we say that a nonzero vector ${\mathbf v}$ is an *eigenvector* of $A$ if there is a scalar $\lambda$ such that

$$ A{\mathbf v} = \lambda {\mathbf v} $$

. The scalar $\lambda$ is called the *eigenvalue* associated to the eigenvector ${\mathbf v}$.
:::

At first glance, there is a lot going on in this definition so let's look at an example.

:::example {ex:example-4-1-2} Example 4.1.2
Consider the matrix $A = \left[\begin{array}{rr} 7 & 6 \\ 6 & -2 \\ \end{array}\right]$ and the vector ${\mathbf v}=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$. We find that

$$ A{\mathbf v} = \left[\begin{array}{rr} 7 & 6 \\ 6 & -2 \\ \end{array}\right] \left[\begin{array}{r}2 \\ 1 \end{array}\right] = \left[\begin{array}{r}20 \\ 10 \end{array}\right] =10\left[\begin{array}{r}2 \\ 1 \end{array}\right] =10{\mathbf v} $$

. In other words, $A{\mathbf v} = 10{\mathbf v}$, which says that ${\mathbf v}$ is an eigenvector of the matrix $A$ with associated eigenvalue $\lambda = 10$.
Similarly, if ${\mathbf w} = \left[\begin{array}{r}-1 \\ 2 \end{array}\right]$, we find that

$$ A{\mathbf w} = \left[\begin{array}{rr} 7 & 6 \\ 6 & -2 \\ \end{array}\right] \left[\begin{array}{r}-1 \\ 2 \end{array}\right] = \left[\begin{array}{r}5 \\ -10 \end{array}\right] =-5\left[\begin{array}{r}-1 \\ 2 \end{array}\right] =-5{\mathbf w} $$

. Here again, we have $A{\mathbf w} = -5{\mathbf w}$ showing that ${\mathbf w}$ is an eigenvector of $A$ with associated eigenvalue $\lambda=-5$.
:::

:::activity {act:activity-eigen-geom} Activity 4.1.2
This definition has an important geometric interpretation that we will investigate here.

a) 
    Suppose that ${\mathbf v}$ is a nonzero vector and that $\lambda$ is a scalar. What is the geometric relationship between ${\mathbf v}$ and $\lambda{\mathbf v}$?

b) 
    Let's now consider the eigenvector condition: $A{\mathbf v} = \lambda{\mathbf v}$. Here we have two vectors, ${\mathbf v}$ and $A{\mathbf v}$. If $A{\mathbf v} = \lambda{\mathbf v}$, what is the geometric relationship between ${\mathbf v}$ and $A{\mathbf v}$?

c) 
    > FIGURE {fig:js-eigen} number=4.1.3 src=../../media/ch04/eigenvectors-preview.png
    > alt: 
    > caption: A geometric interpretation of the eigenvalue-eigenvector condition $A{\mathbf v} = \lambda{\mathbf v}$ .

    Choose the matrix $A= \left[\begin{array}{rr} 1& 2 \\ 2& 1 \\ \end{array}\right]$. Move the vector ${\mathbf v}$ so that the eigenvector condition holds. What is the eigenvector ${\mathbf v}$ and what is the associated eigenvalue?

d) 
    By algebraically computing $A{\mathbf v}$, verify that the eigenvector condition holds for the vector ${\mathbf v}$ that you found.

e) 
    If you multiply the eigenvector ${\mathbf v}$ that you found by $2$, do you still have an eigenvector? If so, what is the associated eigenvalue?

f) 
    Are you able to find another eigenvector ${\mathbf v}$ that is not a scalar multiple of the first one that you found? If so, what is the eigenvector and what is the associated eigenvalue?

g) 
    Now consider the matrix $A = \left[\begin{array}{rr} 2 & 1 \\ 0 & 2 \\ \end{array}\right]$. Use the diagram to describe any eigenvectors and associated eigenvalues.

h) 
    Finally, consider the matrix $A = \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$. Use the diagram to describe any eigenvectors and associated eigenvalues. What geometric transformation does this matrix perform on vectors? How does this explain the presence of any eigenvectors?

SOLUTION:

a) 
    The vectors ${\mathbf v}$ and $\lambda{\mathbf v}$ lie on the same line.

b) 
    The vectors ${\mathbf v}$ and $A{\mathbf v}$ lie on the same line.

c) 
    There are many possibilities, but we see that $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ is an eigenvector with associated eigenvalue $\lambda=3$.

d) 
    If we perform the matrix multiplication, we see that $A\left[\begin{array}{r}1 \\ 1 \end{array}\right] = \left[\begin{array}{r}3 \\ 3 \end{array}\right] = 3\left[\begin{array}{r}1 \\ 1 \end{array}\right]$.

e) 
    Yes, $\left[\begin{array}{r}2 \\ 2 \end{array}\right]$ is still an eigenvector with associated eigenvalue $\lambda=3$.

f) 
    We see that $\left[\begin{array}{r}1 \\ -1 \end{array}\right]$ is an eigenvector with associated eigenvalue $\lambda=-1$.

g) 
    The only eigenvectors that appear are scalar multiples of $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ with associated eigenvalue $\lambda=2$.

h) 
    There are no eigenvectors. The matrix transformation rotates vectors by $90^\circ$ so it is not possible for ${\mathbf v}$ and $A{\mathbf v}$ to lie on the same line.

:::

Let's consider the ideas we saw in the activity in some more depth. To be an eigenvector of $A$, the vector ${\mathbf v}$ must satisfy $A{\mathbf v} = \lambda{\mathbf v}$ for some scalar $\lambda$. This means that ${\mathbf v}$ and $A{\mathbf v}$ are scalar multiples of each other so they must lie on the same line.

Consider now the matrix $A = \left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right]$. On the left of [Figure 4.1.4](ref:fig-eigen-intro), we see that ${\mathbf v}=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ is not an eigenvector of $A$ since the vectors ${\mathbf v}$ and $A{\mathbf v}$ do not lie on the same line. On the right, however, we see that ${\mathbf v}=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ is an eigenvector. In fact, $A{\mathbf v}$ is obtained from ${\mathbf v}$ by stretching ${\mathbf v}$ by a factor of $3$. Therefore, ${\mathbf v}$ is an eigenvector of $A$ with eigenvalue $\lambda = 3$.

> FIGURE {fig:fig-eigen-intro} number=4.1.4 src=../../media/ch04/eigen-intro-1-0.svg
> alt: A vector that is not an eigenvector of the matrix A and the result of multiplying it by A.
> caption: On the left, the vector ${\mathbf v}$ is not an eigenvector. On the right, the vector ${\mathbf v}$ is an eigenvector with eigenvalue $\lambda = 3$.
> subfigure src=../../media/ch04/eigen-intro-1-0.svg alt: A vector that is not an eigenvector of the matrix A and the result of multiplying it by A.
> subfigure src=../../media/ch04/eigen-intro-1-1.svg alt: An eigenvector of the matrix and the result of multiplying it by the matrix.

It is not difficult to see that any multiple of $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ is also an eigenvector of $A$ with eigenvalue $\lambda = 3$. Indeed, we will see later that all the eigenvectors associated to a given eigenvalue form a subspace of ${\mathbb R}^n$.

In [Figure 4.1.5](ref:fig-eigen-intro-2), we see that ${\mathbf v}=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ is also an eigenvector with eigenvalue $\lambda =-1$.

> FIGURE {fig:fig-eigen-intro-2} number=4.1.5 src=../../media/ch04/eigen-intro-1-m1.svg
> alt: Another eigenvector of A and the result of multiplying it by A.
> caption: Here we see another eigenvector ${\mathbf v}$ with eigenvalue $\lambda = -1$.

The interactive diagram we used in the activity is meant to convey the fact that the eigenvectors of a matrix $A$ are special vectors. Most of the time, the vectors ${\mathbf v}$ and $A{\mathbf v}$ appear visually unrelated. For certain vectors, however, ${\mathbf v}$ and $A{\mathbf v}$ line up with one another. Something important is going on when that happens so we call attention to these vectors by calling them eigenvectors. For these vectors, the operation of multiplying by $A$ reduces to the much simpler operation of scalar multiplying by $\lambda$. The reason eigenvectors are important is because it is extremely convenient to be able to replace matrix multiplication by scalar multiplication.

## 4.1.3 The usefulness of eigenvalues and eigenvectors {subsec-eigen-use}

In the next section, we will introduce an algebraic technique for finding the eigenvalues and eigenvectors of a matrix. Before doing that, however, we would like to discuss why eigenvalues and eigenvectors are so useful.

Let's continue looking at the example $A = \left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right]$. We have seen that ${\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$ is an eigenvector with eigenvalue $\lambda=3$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ is an eigenvector with eigenvalue $\lambda = -1$. This means that $A{\mathbf v}_1 = 3{\mathbf v}_1$ and $A{\mathbf v}_2=-{\mathbf v}_2$. By the linearity of matrix multiplication, we can determine what happens when we multiply a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$ by $A$:

$$ A(c_1{\mathbf v}_1 + c_2{\mathbf v}_2) = 3c_1{\mathbf v}_1 - c_2{\mathbf v}_2 $$

.

For instance, if we consider the vector ${\mathbf x}={\mathbf v}_1-2{\mathbf v}_2$, we find that

$$ \begin{aligned} A{\mathbf x}&{}={}A({\mathbf v}_1 - 2{\mathbf v}_2) \\ A{\mathbf x}&{}={} 3{\mathbf v}_1 + 2{\mathbf v}_2 \end{aligned} $$

as seen in the figure.

> IMAGE {img:eigen-basis} src=../../media/ch04/eigen-basis.svg
> alt: A linear combination of eigenvectors and the result of multiplying it by the matrix.

In other words, multiplying by $A$ has the effect of stretching a vector ${\mathbf x}$ in the ${\mathbf v}_1$ direction by a factor of $3$ and flipping ${\mathbf x}$ in ${\mathbf v}_2$ direction.

We can draw an analogy with the more familiar example of the diagonal matrix $D=\left[\begin{array}{rr} 3 & 0 \\ 0 & -1 \\ \end{array}\right]$. As we have seen, the matrix transformation defined by $D$ combines a horizontal stretching by a factor of 3 with a reflection across the horizontal axis, as is illustrated in [Figure 4.1.6](ref:fig-eigen-intro-diagonal).

> FIGURE {fig:fig-eigen-intro-diagonal} number=4.1.6 src=../../media/ch04/eigen-intro-diagonal-a.svg
> alt: The unit square formed by the vectors e one and e two
> caption: The diagonal matrix $D$ stretches vectors horizontally by a factor of $3$ and flips vectors vertically.
> subfigure src=../../media/ch04/eigen-intro-diagonal-a.svg alt: The unit square formed by the vectors e one and e two
> subfigure src=../../media/ch04/eigen-intro-diagonal-b.svg alt: The effect that multiplication by the diagonal matrix has on the unit square

The matrix $A=\left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right]$ has a similar effect when viewed in the basis defined by the eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$, as seen in [Figure 4.1.7](ref:fig-eigen-intro-A).

> FIGURE {fig:fig-eigen-intro-A} number=4.1.7 src=../../media/ch04/eigen-intro-A-a.svg
> alt: The unit square in the coordinate system defined by the eigenvectors
> caption: The matrix $A$ has the same geometric effect as the diagonal matrix $D$ when expressed in the coordinate system defined by the basis of eigenvectors.
> subfigure src=../../media/ch04/eigen-intro-A-a.svg alt: The unit square in the coordinate system defined by the eigenvectors
> subfigure src=../../media/ch04/eigen-intro-A-b.svg alt: In the new coordinate system, multiplying by A transforms the unit square into a rotated rectangle.

In a sense that will be made precise later, having a set of eigenvectors of $A$ that forms a basis of ${\mathbb R}^2$ enables us to think of $A$ as being equivalent to a diagonal matrix $D$. Of course, as the other examples in the previous activity show, it may not always be possible to form a basis from the eigenvectors of a matrix. For example, the only eigenvectors of the matrix $\left[\begin{array}{rr} 2 & 1 \\ 0 & 2 \end{array}\right]$, which represents a shear, have the form $\left[\begin{array}{r}x \\ 0 \end{array}\right]$. In this example, we are not able to create a basis for ${\mathbb R}^2$ consisting of eigenvectors of the matrix. This is also true for the matrix $\left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$, which represents a $90^\circ$ rotation.

:::activity {act:activity-eigen-intro} Activity 4.1.3
Let's consider an example that illustrates how we can put these ideas to use.
Suppose that we work for a car rental company that has two locations, $P$ and $Q$. When a customer rents a car at one location, they have the option to return it to either location at the end of the day. After doing some market research, we determine:

- 
    80% of the cars rented at location $P$ are returned to $P$ and 20% are returned to $Q$.

- 
    40% of the cars rented at location $Q$ are returned to $Q$ and 60% are returned to $P$.

a) 
    Suppose that there are 1000 cars at location $P$ and no cars at location $Q$ on Monday morning. How many cars are there are locations $P$ and $Q$ at the end of the day on Monday?

b) 
    How many are at locations $P$ and $Q$ at end of the day on Tuesday?

c) 
    If we let $P_k$ and $Q_k$ be the number of cars at locations $P$ and $Q$, respectively, at the end of day $k$, we then have

    $$ \begin{aligned} P_{k+1}& {}={} 0.8P_k + 0.6Q_k \\ Q_{k+1}& {}={} 0.2P_k + 0.4Q_k\text{.} \\ \end{aligned} $$

    We can write the vector ${\mathbf x}_k = \left[\begin{array}{r}P_k \\ Q_k \end{array}\right]$ to reflect the number of cars at the two locations at the end of day $k$, which says that

    $$ {\mathbf x}_{k+1} = \left[\begin{array}{rr} 0.8 & 0.6 \\ 0.2 & 0.4 \\ \end{array}\right] {\mathbf x}_k $$

    or ${\mathbf x}_{k+1} = A{\mathbf x}_k$ where $A=\left[\begin{array}{rr}0.8 & 0.6 \\ 0.2 & 0.4 \end{array}\right]$.

    Suppose that

    $$ {\mathbf v}_1 = \left[\begin{array}{r}3 \\ 1 \end{array}\right], \qquad {\mathbf v}_2 = \left[\begin{array}{r}-1 \\ 1 \end{array}\right] $$

    . Compute $A{\mathbf v}_1$ and $A{\mathbf v}_2$ to demonstrate that ${\mathbf v}_1$ and ${\mathbf v}_2$ are eigenvectors of $A$. What are the associated eigenvalues $\lambda_1$ and $\lambda_2$?

d) 
    We said that 1000 cars are initially at location $P$ and none at location $Q$. This means that the initial vector describing the number of cars is ${\mathbf x}_0 = \left[\begin{array}{c}1000 \\ 0 \end{array}\right]$. Write ${\mathbf x}_0$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

e) 
    Remember that ${\mathbf v}_1$ and ${\mathbf v}_2$ are eigenvectors of $A$. Use the linearity of matrix multiplication to write the vector ${\mathbf x}_1 = A{\mathbf x}_0$, describing the number of cars at the two locations at the end of the first day, as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

f) 
    Write the vector ${\mathbf x}_2 = A{\mathbf x}_1$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$. Then write the next few vectors as linear combinations of ${\mathbf v}_1$ and ${\mathbf v}_2$:

    1. 
        ${\mathbf x}_3 = A{\mathbf x}_2$.

    2. 
        ${\mathbf x}_4 = A{\mathbf x}_3$.

    3. 
        ${\mathbf x}_5 = A{\mathbf x}_4$.

    4. 
        ${\mathbf x}_6 = A{\mathbf x}_5$.

g) 
    What will happen to the number of cars at the two locations after a very long time? Explain how writing ${\mathbf x}_0$ as a linear combination of eigenvectors helps you determine the long-term behavior.

SOLUTION:
The solution to this activity is given in the text below.
:::

This activity is important and motivates much of our work with eigenvalues and eigenvectors so it's worth reviewing to make sure we have a clear understanding of the concepts.

First, we compute

$$ \begin{aligned} A{\mathbf v}_1 = \left[\begin{array}{rr} 0.8 & 0.6 \\ 0.2 & 0.4 \\ \end{array}\right] \left[\begin{array}{r}3 \\ 1 \end{array}\right] & {}={} \left[\begin{array}{r}3 \\ 1 \end{array}\right] = 1{\mathbf v}_1 \\ \\ A{\mathbf v}_2 = \left[\begin{array}{rr} 0.8 & 0.6 \\ 0.2 & 0.4 \\ \end{array}\right] \left[\begin{array}{r}-1 \\ 1 \end{array}\right] & {}={} \left[\begin{array}{r}-0.2 \\ 0.2 \end{array}\right] = 0.2{\mathbf v}_2\text{.} \\ \end{aligned} $$

This shows that ${\mathbf v}_1$ is an eigenvector of $A$ with eigenvalue $\lambda_1 = 1$ and ${\mathbf v}_2$ is an eigenvector of $A$ with eigenvalue $\lambda_2=0.2$.

By the linearity of matrix matrix multiplication, we have

$$ A(c_1{\mathbf v}_1 + c_2{\mathbf v}_2) = c_1{\mathbf v}_1 + 0.2c_2{\mathbf v}_2 $$

. Therefore, we will write the vector describing the initial distribution of cars ${\mathbf x}_0=\left[\begin{array}{c}1000 \\ 0 \end{array}\right]$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$; that is, ${\mathbf x}_0 = c_1{\mathbf v}_2 + c_2 {\mathbf v}_2$. To do, we form the augmented matrix and row reduce:

$$ \left[\begin{array}{rr|r} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf x}_0 \end{array}\right] = \left[\begin{array}{rr|r} 3 & -1 & 1000 \\ 1 & 1 & 0 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 250 \\ 0 & 1 & -250 \\ \end{array}\right] $$

. Therefore, ${\mathbf x}_0 = 250{\mathbf v}_1 -250{\mathbf v}_2$.

To determine the distribution of cars on subsequent days, we will repeatedly multiply by $A$. We find that

$$ \begin{aligned} {\mathbf x}_1 = A{\mathbf x}_0 & {}={} A(250{\mathbf v}_1 - 250{\mathbf v}_2) = 250{\mathbf v}_1 - (0.2)250{\mathbf v}_2 \\ {\mathbf x}_2 = A{\mathbf x}_1 & {}={} A(250{\mathbf v}_1 - (0.2)250{\mathbf v}_2) = 250{\mathbf v}_1 - (0.2)^2250{\mathbf v}_2 \\ {\mathbf x}_3 = A{\mathbf x}_2 & {}={} A(250{\mathbf v}_1 - (0.2)^2250{\mathbf v}_2) = 250{\mathbf v}_1 - (0.2)^3250{\mathbf v}_2 \\ {\mathbf x}_4 = A{\mathbf x}_3 & {}={} A(250{\mathbf v}_1 - (0.2)^3250{\mathbf v}_2) = 250{\mathbf v}_1 - (0.2)^4250{\mathbf v}_2 \\ {\mathbf x}_5 = A{\mathbf x}_4 & {}={} A(250{\mathbf v}_1 - (0.2)^4250{\mathbf v}_2) = 250{\mathbf v}_1 - (0.2)^5250{\mathbf v}_2 \\ \end{aligned} $$

.

In particular, this shows us that

$$ {\mathbf x}_5 = 250{\mathbf v}_1 - (0.2)^5250{\mathbf v}_2 = \left[\begin{array}{r}250\cdot 3 - (0.2)^5250\cdot(-1) \\ 250\cdot 1 - (0.2)^5250\cdot 1 \end{array}\right] = \left[\begin{array}{r}750.09 \\ 249.92 \end{array}\right] $$

. Taking notice of the pattern, we may write

$$ {\mathbf x}_k = 250{\mathbf v}_1 - (0.2)^k250{\mathbf v}_2 $$

. Multiplying a number by $0.2$ is the same as taking 20% of that number. As each day goes by, the second term is multiplied by $0.2$ so the coefficient of ${\mathbf v}_2$ in the expression for ${\mathbf x}_k$ will eventually become extremely small. We therefore see that the distribution of cars will stabilize at ${\mathbf x}=250{\mathbf v}_1=\left[\begin{array}{r}750 \\ 250 \end{array}\right]$.

Notice how our understanding of the eigenvectors of the matrix allows us to replace matrix multiplication with the simpler operation of scalar multiplication. As a result, we can look far into the future without having to repeatedly perform matrix multiplication.

Furthermore, notice how this example relies on the fact that we can express the initial vector ${\mathbf x}_0$ as a linear combination of eigenvectors. For this reason, we would like, when given an $n\times n$ matrix, to be able to create a basis of ${\mathbb R}^n$ that consists of its eigenvectors. We will frequently return to this question in later sections.

:::question {q:question-eigen-basis} Question 4.1.8
If $A$ is an $n\times n$ matrix, can we form a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$?
:::

## 4.1.4 Summary

We defined an eigenvector of a square matrix $A$ to be a nonzero vector ${\mathbf v}$ such that $A{\mathbf v} = \lambda{\mathbf v}$ for some scalar $\lambda$, which is called the eigenvalue associated to ${\mathbf v}$.

- 
    If ${\mathbf v}$ is an eigenvector, then matrix multiplication by $A$ reduces to the simpler operation of scalar multiplication by $\lambda$.

- 
    Scalar multiples of an eigenvector are also eigenvectors. In fact, we will see that the eigenvectors associated to an eigenvalue $\lambda$ form a subspace.

- 
    If we can form a basis for ${\mathbb R}^n$ consisting of eigenvectors of $A$, then $A$ is, in some sense, equivalent to a diagonal matrix.

- 
    Rewriting a vector ${\mathbf x}$ as a linear combination of eigenvectors of $A$ simplifies the process of repeatedly multiplying ${\mathbf x}$ by $A$.

## 4.1.5 Exercises

:::exercise {exercise-4-1-001} number=4.1.1 answered=yes src=src/exercises/exercises4-1.xml:5
PROBLEM:
Consider the matrix and vectors

$$ A = \left[\begin{array}{rr} 8 & -10 \\ 5 & -7 \\ \end{array}\right],\qquad {\mathbf v}_1=\left[\begin{array}{r}2 \\ 1 \end{array}\right],~~~ {\mathbf v}_2=\left[\begin{array}{r}1 \\ 1 \end{array}\right] $$

.

a) 
    Show that ${\mathbf v}_1$ and ${\mathbf v}_2$ are eigenvectors of $A$ and find their associated eigenvalues.

    :::sage
    ```sage

    ```
    :::

b) 
    Express the vector ${\mathbf x} = \left[\begin{array}{r}-4 \\ -1 \end{array}\right]$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

c) 
    Use this expression to compute $A{\mathbf x}$, $A^2{\mathbf x}$, and $A^{-1}{\mathbf x}$ as a linear combination of eigenvectors.

ANSWER:

a) 
    We find that $A{\mathbf v}_1 = 3{\mathbf v}_1$ and $A{\mathbf v}_2=-2{\mathbf v}_2$ so the associated eigenvalues are $\lambda_1 = 3$ and $\lambda_2=-2$.

b) 
    ${\mathbf x}=\left[\begin{array}{r}-4 \\ -1 \end{array}\right] = -3{\mathbf v}_1 + 2{\mathbf v}_2$.

c) 
    We find

    $$ \begin{alignedat}{3} A{\mathbf x}&{}={}& -9{\mathbf v}_1 &{}-{}& 4{\mathbf v}_2\\ A^2{\mathbf x}&{}={}& -27{\mathbf v}_1&{}+{}&8{\mathbf v}_2 \\ A^{-1}{\mathbf x}&{}={}& -{\mathbf v}_1 &{}-{}& {\mathbf v}_2\text{.} \\ \end{alignedat} $$

SOLUTION:

a) 
    We find that $A{\mathbf v}_1 = 3{\mathbf v}_1$ and $A{\mathbf v}_2=-2{\mathbf v}_2$ so the associated eigenvalues are $\lambda_1 = 3$ and $\lambda_2=-2$.

b) 
    Setting up an augmented matrix and row reducing shows us that ${\mathbf x}=\left[\begin{array}{r}-4 \\ -1 \end{array}\right] = -3{\mathbf v}_1 + 2{\mathbf v}_2$.

c) 
    We then have

    $$ \begin{alignedat}{3} A{\mathbf x}&{}={}& -9{\mathbf v}_1 &{}-{}& 4{\mathbf v}_2\\ A^2{\mathbf x}&{}={}& -27{\mathbf v}_1&{}+{}&8{\mathbf v}_2 \\ A^{-1}{\mathbf x}&{}={}& -{\mathbf v}_1 &{}-{}& {\mathbf v}_2\text{.} \\ \end{alignedat} $$

:::

:::exercise {exercise-4-1-002} number=4.1.2 answered=yes src=src/exercises/exercises4-1.xml:80
PROBLEM:
Consider the matrix and vectors

$$ A = \left[\begin{array}{rrr} -5 & -2 & 2 \\ 24 & 14 & -10 \\ 21 & 14 & -10 \\ \end{array}\right],\qquad {\mathbf v}_1=\left[\begin{array}{r}1 \\ -2 \\ -1 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}2 \\ -3 \\ 0 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}0 \\ -1 \\ -1 \end{array}\right] $$

a) 
    Show that the vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ are eigenvectors of $A$ and find their associated eigenvalues.

    :::sage
    ```sage

    ```
    :::

b) 
    Express the vector ${\mathbf x} = \left[\begin{array}{r}0 \\ -3 \\ -4 \end{array}\right]$ as a linear combination of the eigenvectors.

c) 
    Use this expression to compute $A{\mathbf x}$, $A^2{\mathbf x}$, and $A^{-1}{\mathbf x}$ as a linear combination of eigenvectors.

ANSWER:

a) 
    We see that $A{\mathbf v}_1=-3{\mathbf v}_1$, $A{\mathbf v}_2 = -2{\mathbf v}_2$, and $A{\mathbf v}_3=4{\mathbf v}_3$. The associated eigenvalues are $\lambda_1 = -3$, $\lambda_2=-2$, and $\lambda_3=4$.

b) 
    ${\mathbf x}=2{\mathbf v}_1 -{\mathbf v}_2+2{\mathbf v}_3$.

c) 
    We find

    $$ \begin{alignedat}{4} A{\mathbf x}&{}={}& -6{\mathbf v}_1 &{}+{}& 2{\mathbf v}_2&{}+{} & 8{\mathbf v}_3\\ A^2{\mathbf x}&{}={}& 18{\mathbf v}_1&{}-{}& 4{\mathbf v}_2&{}+{}& 32{\mathbf v}_3\\ A^{-1}{\mathbf x}&{}={}& -\frac23{\mathbf v}_1& {}+{}&\frac12{\mathbf v}_2&{}+{}&\frac12{\mathbf v}_3\text{.} \\ \end{alignedat} $$

SOLUTION:

a) 
    We see that $A{\mathbf v}_1=-3{\mathbf v}_1$, $A{\mathbf v}_2 = -2{\mathbf v}_2$, and $A{\mathbf v}_3=4{\mathbf v}_3$. The associated eigenvalues are $\lambda_1 = -3$, $\lambda_2=-2$, and $\lambda_3=4$.

b) 
    After forming an augmented matrix, we find ${\mathbf x}=2{\mathbf v}_1 -{\mathbf v}_2+2{\mathbf v}_3$.

c) 
    We then have

    $$ \begin{alignedat}{4} A{\mathbf x}&{}={}& -6{\mathbf v}_1 &{}+{}& 2{\mathbf v}_2&{}+{} & 8{\mathbf v}_3\\ A^2{\mathbf x}&{}={}& 18{\mathbf v}_1&{}-{}& 4{\mathbf v}_2&{}+{}& 32{\mathbf v}_3\\ A^{-1}{\mathbf x}&{}={}& -\frac23{\mathbf v}_1& {}+{}&\frac12{\mathbf v}_2&{}+{}&\frac12{\mathbf v}_3\text{.} \\ \end{alignedat} $$

:::

:::exercise {exercise-4-1-003} number=4.1.3 answered=yes src=src/exercises/exercises4-1.xml:165
PROBLEM:
Suppose that $A$ is an $n\times n$ matrix.

a) 
    Explain why $\lambda = 0$ is an eigenvalue of $A$ if and only if there is a nonzero solution to the homogeneous equation $A{\mathbf x} = 0$.

b) 
    Explain why $A$ is not invertible if and only if $\lambda=0$ is an eigenvalue.

c) 
    If ${\mathbf v}$ is an eigenvector of $A$ having associated eigenvalue $\lambda$, explain why ${\mathbf v}$ is also an eigenvector of $A^2$ with associated eigenvalue $\lambda^2$.

d) 
    If $A$ is invertible and ${\mathbf v}$ is eigenvector of $A$ having associated eigenvalue $\lambda$, explain why ${\mathbf v}$ is also an eigenvector of $A^{-1}$ with associated eigenvalue $\lambda^{-1}$.

e) 
    The matrix $A=\ \left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right]$ has eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ and associated eigenvalues $\lambda_1 = 3$ and $\lambda=-1$. What are some eigenvectors and associated eigenvalues for $A^5$?

ANSWER:

a) 
    If $\lambda=0$ is an eigenvalue, then there is a nonzero vector ${\mathbf v}$ such that $A{\mathbf v}=\lambda{\mathbf v} = {\mathbf 0}$.

b) 
    If $\lambda =0$ is an eigenvalue of $A$, then there is a nonzero solution to the homogeneous equation $A{\mathbf x}={\mathbf 0}$.

c) 
    If $A{\mathbf v}=\lambda{\mathbf v}$, we can multiply both sides by $A^{-1}$ and $\frac1\lambda$ to obtain $\frac1\lambda{\mathbf v}=A^{-1}{\mathbf v}$.

d) 
    Notice that $A^2{\mathbf v} = A(A{\mathbf v}) = \lambda A{\mathbf v} = \lambda^2{\mathbf v}$, which means that ${\mathbf v}$ is an eigenvector with associated eigenvalue $\lambda^2$.

e) 
    The vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ are eigenvectors of $A^5$ with associated eigenvalues $\lambda_1^5 = 3^5=243$ and $\lambda_2^5 = (-1)^5 = -1$.

SOLUTION:

a) 
    If $\lambda=0$ is an eigenvalue, then there is a nonzero vector ${\mathbf v}$ such that $A{\mathbf v}=\lambda{\mathbf v} = {\mathbf 0}$. This means that an associated eigenvector is a nonzero solution to the homogeneous equation $A{\mathbf x}={\mathbf 0}$.

b) 
    If $\lambda =0$ is an eigenvalue of $A$, then there is a nonzero solution to the homogeneous equation $A{\mathbf x}={\mathbf 0}$, which happens exactly when $A$ is not invertible.

c) 
    If ${\mathbf v}$ is an eigenvector of $A$ with associated eigenvalue $\lambda$, then $A{\mathbf v}=\lambda{\mathbf v}$. Therefore, $A^2{\mathbf v} = A(A{\mathbf v}) = \lambda A{\mathbf v} = \lambda^2{\mathbf v}$, which means that ${\mathbf v}$ is an eigenvector with associated eigenvalue $\lambda^2$.

d) 
    If $A{\mathbf v}=\lambda{\mathbf v}$, we can multiply both sides by $A^{-1}$ and $\frac1\lambda$ to obtain $\frac1\lambda{\mathbf v}=A^{-1}{\mathbf v}$. This shows that ${\mathbf v}$ is an eigenvector of $A^{-1}$ with associated eigenvalue $\frac1\lambda$.

e) 
    The vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ are eigenvectors of $A^5$ with associated eigenvalues $\lambda_1^5 = 3^5=243$ and $\lambda_2^5 = (-1)^5 = -1$.

:::

:::exercise {exercise-4-1-004} number=4.1.4 answered=yes src=src/exercises/exercises4-1.xml:269
PROBLEM:
Suppose that $A$ is a matrix with eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$ and eigenvalues $\lambda_1 = -1$ and $\lambda_2=2$ as shown in [Figure 4.1.9](ref:figure-eigen-exercise).
> FIGURE {fig:figure-eigen-exercise} number=4.1.9 src=../../media/ch04/ex-eigen-powers.svg
> alt: A pair of eigenvectors and a linear combination formed from them.
> width: 50%
> caption: The vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ are eigenvectors of $A$.
Sketch the vectors $A{\mathbf x}$, $A^2{\mathbf x}$, and $A^{-1}{\mathbf x}$.
ANSWER:
> IMAGE {img:ex-eigen-powers-sol} src=../../media/ch04/ex-eigen-powers-sol.svg
> width: 50%
SOLUTION:
> IMAGE {img:ex-eigen-powers-sol} src=../../media/ch04/ex-eigen-powers-sol.svg
> width: 50%
:::

:::exercise {exercise-4-1-005} number=4.1.5 answered=yes src=src/exercises/exercises4-1.xml:324
PROBLEM:
For the following matrices, find the eigenvectors and associated eigenvalues by thinking geometrically about the corresponding matrix transformation.

a) 
    $\left[\begin{array}{rr} 3 & 0 \\ 0 & 3 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rr} -2 & 0 \\ 0 & 4 \\ \end{array}\right]$.

c) 
    What are the eigenvectors and associated eigenvalues of the identity matrix?

d) 
    What are the eigenvectors and associated eigenvalues of a diagonal matrix with distinct diagonal entries?

ANSWER:

a) 
    Every two-dimensional vector is an eigenvector with associated eigenvalue $\lambda=3$.

b) 
    We have eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ with associated eigenvalue $\lambda_1=-2$ and ${\mathbf v}_2=\left[\begin{array}{r}0 \\ 1 \end{array}\right]$ with $\lambda_2=4$.

c) 
    Every vector is an eigenvector of the identity matrix with associated eigenvalue $\lambda=1$.

d) 
    The standard basis vectors ${\mathbf e}_j$ are eigenvectors and the associated eigenvalues are the corresponding diagonal entries.

SOLUTION:

a) 
    The corresponding matrix transformation stretches every two-dimensional vector by a factor of $3$. Therefore, every two-dimensional vector is an eigenvector with associated eigenvalue $\lambda=3$.

b) 
    The corresponding matrix transformation stretches vectors horizontally by a factor of $2$ and reflects them while stretching by a factor of $4$ vertically. We have eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ with associated eigenvalue $\lambda_1=-2$ and ${\mathbf v}_2=\left[\begin{array}{r}0 \\ 1 \end{array}\right]$ with $\lambda_2=4$.

c) 
    For any vector ${\mathbf v}$, we have $I{\mathbf v}={\mathbf v}$. Therefore, every vector is an eigenvector of the identity matrix with associated eigenvalue $\lambda=1$.

d) 
    The standard basis vectors ${\mathbf e}_j$ are eigenvectors and the associated eigenvalues are the corresponding diagonal entries.

:::

:::exercise {exercise-4-1-006} number=4.1.6 answered=yes src=src/exercises/exercises4-1.xml:406
PROBLEM:
Suppose that $A$ is a $2\times2$ matrix having eigenvectors

$$ {\mathbf v}_1=\left[\begin{array}{r}2 \\ 1 \end{array}\right], \qquad {\mathbf v}_2=\left[\begin{array}{r}-1 \\ 2 \end{array}\right] $$

and associated eigenvalues $\lambda_1=2$ and $\lambda_2=-3$.

a) 
    If ${\mathbf x}=\left[\begin{array}{r}5 \\ 0 \end{array}\right]$, find the vector $A^4{\mathbf x}$.

b) 
    Find the vectors $A\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and $A\left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

c) 
    What is the matrix $A$?

ANSWER:

a) 
    $\left[\begin{array}{r}145 \\ -130 \end{array}\right]$.

b) 
    $A\left[\begin{array}{r}1 \\ 0 \end{array}\right] = \left[\begin{array}{r}1 \\ 2 \end{array}\right]$ and $A\left[\begin{array}{r}0 \\ 1 \end{array}\right] = \left[\begin{array}{r}2 \\ -2 \end{array}\right]$.

c) 
    $A = \begin{bmatrix} 1 & 2 \\ 2 & -2 \\ \end{bmatrix}$.

SOLUTION:

a) 
    We have ${\mathbf x} = 2{\mathbf v}_1-{\mathbf v}_2$. Therefore, $A^4{\mathbf x} = 2\lambda_1^4{\mathbf v}_1-\lambda_2^4{\mathbf v}_2 = 32{\mathbf v}_1-81{\mathbf v}_2=\left[\begin{array}{r}145 \\ -130 \end{array}\right]$.

b) 
    We have

    $$ \left[\begin{array}{r}1 \\ 0 \end{array}\right] = \frac25 {\mathbf v}_1 - \frac15 {\mathbf v}2,~~~ \left[\begin{array}{r}0 \\ 1 \end{array}\right] = \frac15 {\mathbf v}_1 + \frac25 {\mathbf v}2, $$

    and so

    $$ A\left[\begin{array}{r}1 \\ 0 \end{array}\right] = \frac45 {\mathbf v}_1 + \frac35 {\mathbf v}2 = \left[\begin{array}{r}1 \\ 2 \end{array}\right],~~~ A\left[\begin{array}{r}0 \\ 1 \end{array}\right] = \frac25 {\mathbf v}_1 - \frac65 {\mathbf v}2 = \left[\begin{array}{r}2 \\ -2 \end{array}\right]. $$

c) 
    From the results of the previous part, we have $A = \begin{bmatrix} 1 & 2 \\ 2 & -2 \\ \end{bmatrix}$.

:::

:::exercise {exercise-4-1-007} number=4.1.7 answered=yes src=src/exercises/exercises4-1.xml:503
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response.

a) 
    The eigenvalues of a diagonal matrix are equal to the entries on the diagonal.

b) 
    If $A{\mathbf v}=\lambda{\mathbf v}$, then $A^2{\mathbf v}=\lambda{\mathbf v}$ as well.

c) 
    Every vector is an eigenvector of the identity matrix.

d) 
    If $\lambda=0$ is an eigenvalue of $A$, then $A$ is invertible.

e) 
    For every $n\times n$ matrix $A$, it is possible to find a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$.

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
    False

SOLUTION:

a) 
    True. The associated eigenvectors are the standard basis vectors ${\mathbf e}_j$.

b) 
    False. $A^2{\mathbf v}=\lambda^2{\mathbf v}$.

c) 
    True, because $I{\mathbf v} = {\mathbf v}$.

d) 
    False. If $\lambda=0$ is an eigenvalue of $A$, then there is a nonzero solution to the homogeneous equation so $A$ is not invertible.

e) 
    False. We saw the example $\left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$, which represents a $90^\circ$ rotation and has no eigenvectors.

:::

:::exercise {exercise-4-1-008} number=4.1.8 answered=yes src=src/exercises/exercises4-1.xml:559
PROBLEM:
Suppose that $A$ is an $n\times n$ matrix.

a) 
    Assuming that ${\mathbf v}$ is an eigenvector of $A$ whose associated eigenvalue is nonzero, explain why ${\mathbf v}$ is in $\text{Col}(A)$.

b) 
    Assuming that ${\mathbf v}$ is an eigenvector of $A$ whose associated eigenvalue is zero, explain why ${\mathbf v}$ is in $\text{Nul}(A)$.

c) 
    Consider the two special matrices below and find their eigenvectors and associated eigenvalues.

    $$ A = \left[\begin{array}{rrr} 1 & 1 & 1 \\ 1 & 1 & 1 \\ 1 & 1 & 1 \\ \end{array}\right],~~~ B = \left[\begin{array}{rrr} 1 & 1 & 1 \\ 2 & 2 & 2 \\ 3 & 3 & 3 \\ \end{array}\right]. $$

ANSWER:

a) 
    Because $A{\mathbf v} = \lambda{\mathbf v}$.

b) 
    Because $A{\mathbf v} = 0{\mathbf v} = {\mathbf 0}$.

c) 
    For the matrix $A$, ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda_1=3$, and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_3=\left[\begin{array}{r}-1 \\ 0 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda_2=\lambda_3 = 0$.

    For $B$, ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \\ 3 \end{array}\right]$ with associated eigenvalue $\lambda_1=6$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_3=\left[\begin{array}{r}-1 \\ 0 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda_2=\lambda_3=0$.

SOLUTION:

a) 
    In this case, we have $A{\mathbf v} = \lambda{\mathbf v}$ or $A\left(\frac1\lambda{\mathbf v}\right) = {\mathbf v}$, which says that the equation $A{\mathbf x} = {\mathbf v}$ is consistent.

b) 
    With this assumption, $A{\mathbf v} = 0{\mathbf v} = {\mathbf 0}$, which means that ${\mathbf v}$ is a solution to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$.

c) 
    The column space of $A$ is spanned by ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right]$ and we notice that $A{\mathbf v}_1 = 3{\mathbf v}_1$. Therefore, ${\mathbf v}_1$ is an eigenvector with associated eigenvalue $\lambda_1=3$.

    We also know that that the rank of this matrix is 1 so $\text{Nul}(A)$ is two-dimensional. A basis for the null space is ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_3=\left[\begin{array}{r}-1 \\ 0 \\ 1 \end{array}\right]$ so these vectors are eigenvectors with associated eigenvalue $\lambda_2=\lambda_3 = 0$. In the same way, ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \\ 3 \end{array}\right]$ is an eigenvector of $B$ with associated eigenvalue $\lambda_1=6$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_3=\left[\begin{array}{r}-1 \\ 0 \\ 1 \end{array}\right]$ are eigenvectors with associated eigenvalue $\lambda_2=\lambda_3=0$.

:::

:::exercise {exercise-4-1-009} number=4.1.9 answered=yes src=src/exercises/exercises4-1.xml:670
PROBLEM:
For each of the following matrix transformations, describe the eigenvalues and eigenvectors of the corresponding matrix $A$.

a) 
    A reflection in ${\mathbb R}^2$ in the line $y=x$.

b) 
    A $180^\circ$ rotation in ${\mathbb R}^2$.

c) 
    A $180^\circ$ rotation in ${\mathbb R}^3$ about the $y$-axis.

d) 
    A $90^\circ$ rotation in ${\mathbb R}^3$ about the $x$-axis.

ANSWER:

a) 
    $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda = 1$ and $\left[\begin{array}{r}1 \\ -1 \end{array}\right]$ with associated eigenvalue $\lambda=-1$.

b) 
    Every two-dimensional vector is an eigenvector with associated eigenvalue $\lambda=-1$.

c) 
    $\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right]$ with associated eigenvalue $\lambda=1$. $\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$ and $\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda=-1$.

d) 
    $\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$ with associated eigenvalue $\lambda=1$.

SOLUTION:

a) 
    A vector lying along the line of reflection is unchanged so $A\left[\begin{array}{r}1 \\ 1 \end{array}\right] = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$, which shows that $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ is an eigenvector with associated eigenvalue $\lambda = 1$. At the same time, $A\left[\begin{array}{r}1 \\ -1 \end{array}\right] = -\left[\begin{array}{r}1 \\ -1 \end{array}\right]$ so $\left[\begin{array}{r}1 \\ -1 \end{array}\right]$ is an eigenvector with associated eigenvalue $\lambda=-1$.

b) 
    Every vector ${\mathbf v}$ satisfies $A{\mathbf v}=-{\mathbf v}$ so every two-dimensional vector is an eigenvector with associated eigenvalue $\lambda=-1$.

c) 
    Vectors along the $y$-axis are unchanged so $\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right]$ is an eigenvector with associated eigenvalue $\lambda=1$. Vectors in the $xz$-plane are multiplied by $-1$ so $\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$ and $\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right]$ are eigenvectors with associated eigenvalue $\lambda=-1$.

d) 
    The vector $\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$ is an eigenvector with associated eigenvalue $\lambda=1$. There are no other eigenvectors that are not scalar multiples of this one.

:::

:::exercise {exercise-4-1-010} number=4.1.10 answered=yes src=src/exercises/exercises4-1.xml:745
PROBLEM:
Suppose we have two species, $P$ and $Q$, where species $P$ preys on $Q$. Their populations, in millions, in year $k$ are denoted by $P_k$ and $Q_k$ and satisfy

$$ \begin{aligned} P_{k+1} & {}={} 0.8P_k + 0.2Q_k \\ Q_{k+1} & {}={} -0.3P_k + 1.5Q_k \\ \end{aligned} $$

. We will keep track of the populations in year $k$ using the vector ${\mathbf x}_k=\left[\begin{array}{r}P_k \\ Q_k \end{array}\right]$ so that

$$ {\mathbf x}_{k+1} = A{\mathbf x}_k = \left[\begin{array}{rr} 0.8 & 0.2 \\ -0.3 & 1.5 \\ \end{array}\right] {\mathbf x}_k $$

.

a) 
    Show that ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 3 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$ are eigenvectors of $A$ and find their associated eigenvalues.

b) 
    Suppose that the initial populations are described by the vector ${\mathbf x}_0 = \left[\begin{array}{r}38 \\ 44 \end{array}\right]$. Express ${\mathbf x}_0$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

c) 
    Find the populations after one year, two years, and three years by writing the vectors ${\mathbf x}_1$, ${\mathbf x}_2$, and ${\mathbf x}_3$ as linear combinations of ${\mathbf v}_1$ and ${\mathbf v}_2$.

d) 
    What is the general form for ${\mathbf x}_k$?

e) 
    After a very long time, what is the ratio of $P_k$ to $Q_k$?

ANSWER:

a) 
    ${\mathbf v}_1$ with associated eigenvalue $\lambda_1=1.4$ and ${\mathbf v}_2$ with associated eigenvalue $\lambda_2=0.9$.

b) 
    ${\mathbf x}_0=10{\mathbf v}_1+14{\mathbf v}_2$.

c) 
    We have

    $$ \begin{alignedat}{4} {\mathbf x}_1&{}={}& A{\mathbf x}_0 & {}={} 10(1.4){\mathbf v}_1 & {}+{} & 14(0.9){\mathbf v}_2 \\ {\mathbf x}_2&{}={}& A{\mathbf x}_1 & {}={} 10(1.4)^2{\mathbf v}_1 & {}+{} & 14(0.9)^2{\mathbf v}_2 \\ {\mathbf x}_3&{}={}& A{\mathbf x}_2 & {}={} 10(1.4)^3{\mathbf v}_1 & {}+{} & 14(0.9)^3{\mathbf v}_2\text{.} \\ \end{alignedat} $$

d) 
    In general, ${\mathbf x}_k = 10(1.4)^k{\mathbf v}_1 + 14(0.9)^k{\mathbf v}_2$.

e) 
    The ratio of $P_k$ to $Q_k$ is 1:3.

SOLUTION:

a) 
    We can compute $A{\mathbf v}_1 = 1.4{\mathbf v}_1$ and $A{\mathbf v}_2=0.9{\mathbf v}_2$. This means that ${\mathbf v}_1$ is an eigenvector with associated eigenvalue $\lambda_1=1.4$ and ${\mathbf v}_2$ is an eigenvector with associated eigenvalue $\lambda_2=0.9$.

b) 
    Setting up an augmented matrix and row reducing shows that ${\mathbf x}_0=10{\mathbf v}_1+14{\mathbf v}_2$.

c) 
    We have

    $$ \begin{alignedat}{4} {\mathbf x}_1&{}={}& A{\mathbf x}_0 & {}={} 10(1.4){\mathbf v}_1 & {}+{} & 14(0.9){\mathbf v}_2 \\ {\mathbf x}_2&{}={}& A{\mathbf x}_1 & {}={} 10(1.4)^2{\mathbf v}_1 & {}+{} & 14(0.9)^2{\mathbf v}_2 \\ {\mathbf x}_3&{}={}& A{\mathbf x}_2 & {}={} 10(1.4)^3{\mathbf v}_1 & {}+{} & 14(0.9)^3{\mathbf v}_2\text{.} \\ \end{alignedat} $$

d) 
    In general, ${\mathbf x}_k = 10(1.4)^k{\mathbf v}_1 + 14(0.9)^k{\mathbf v}_2$.

e) 
    After a long time, $k$ becomes large so that $0.9^k$ becomes very close to zero. This means that ${\mathbf x}_k\approx 10(1.4)^k{\mathbf v}_1$. So $P_k\approx10(1.4)^k$ and $Q_k\approx30(1.4)^k$. This means the ratio of $P_k$ to $Q_k$ is 1:3.

:::
