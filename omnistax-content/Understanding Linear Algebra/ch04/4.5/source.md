# 4.5 Markov chains and Google's PageRank algorithm {sec-stochastic}

In the last section, we used our understanding of eigenvalues and eigenvectors to describe the long-term behavior of some discrete dynamical systems. The state of the system, which could record, say, the populations of a few interacting species, at one time is described by a vector ${\mathbf x}_k$. The state vector then evolves according to a linear rule ${\mathbf x}_{k+1} = A{\mathbf x}_k$.
This section continues this exploration by looking at *Markov chains*, which form a specific type of discrete dynamical system. For instance, we could be interested in a rental car company that rents cars from several locations. From one day to the next, the number of cars at different locations can change, but the total number of cars stays the same. Once again, an understanding of eigenvalues and eigenvectors will help us make predictions about the long-term behavior of the system.

## 4.5.1 Introduction

:::exploration {act:preview-4-5-1} Preview Activity 4.5.1
Suppose that our rental car company rents from two locations $P$ and $Q$. We find that 80% of the cars rented from location $P$ are returned to $P$ while the other 20% are returned to $Q$. For cars rented from location $Q$, 60% are returned to $Q$ and 40% to $P$.
We will use $P_k$ and $Q_k$ to denote the number of cars at the two locations on day $k$. The following day, the number of cars at $P$ equals 80% of $P_k$ and 40% of $Q_k$. This shows that

$$ \begin{aligned} P_{k+1} & {}={} 0.8 P_k + 0.4Q_k \\ Q_{k+1} & {}={} 0.2 P_k + 0.6Q_k\text{.} \\ \end{aligned} $$

PROBLEM:
a) If we use the vector ${\mathbf x}_k = \left[\begin{array}{r}P_k \\ Q_k \end{array}\right]$ to represent the distribution of cars on day $k$, find a matrix $A$ such that ${\mathbf x}_{k+1} = A{\mathbf x}_k$.
b) Find the eigenvalues and associated eigenvectors of $A$.
c) Suppose that there are initially 1500 cars, all of which are at location $P$. Write the vector ${\mathbf x}_0$ as a linear combination of eigenvectors of $A$.
d) Write the vectors ${\mathbf x}_k$ as a linear combination of eigenvectors of $A$.
e) What happens to the distribution of cars after a long time?
SOLUTION:
a) Expressing the set of equations in matrix form, we see that $A = \left[\begin{array}{rr}0.8 \amp 0.4 \\ 0.2 \amp 0.6 \\ \end{array}\right]$.
b) We have eigenvalues $\lambda_1 = 1$ and $\lambda_2 = 0.4$ with associated eigenvectors ${\mathbf v}_1 = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.
c) We find that ${\mathbf x}_0=\left[\begin{array}{r}1500 \\ 0 \end{array}\right] = 500{\mathbf v}_1-500{\mathbf v}_2$.
d) Multiplying by the matrix $A$ has the effect of multiplying the eigenvectors by their associated eigenvalues. Therefore, ${\mathbf x}_k=500{\mathbf v}_1-500(0.4)^k{\mathbf v}_2$.
e) As $k$ becomes large, $0.4^k$ becomes very close to zero. Therefore ${\mathbf x}_k\approx500{\mathbf v}_1 = \left[\begin{array}{r}1000 \\ 500 \end{array}\right]$. This tells us that $1000$ cars are at location $P$ and $500$ are at $Q$.
:::

## 4.5.2 A first example

In the preview activity, the distribution of rental cars was described by the discrete dynamical system

$$ {\mathbf x}_{k+1} = A{\mathbf x}_k=\left[\begin{array}{rr} 0.8 & 0.4 \\ 0.2 & 0.6 \\ \end{array}\right] {\mathbf x}_k $$

. This matrix has some special properties. First, each entry represents the probability that a car rented at one location is returned to another. For instance, there is an 80% chance that a car rented at $P$ is returned to $P$, which explains the entry of 0.8 in the upper left corner. Therefore, the entries of the matrix are between 0 and 1.

Second, a car rented at one location must be returned to one of the locations. For example, since 80% of the cars rented at $P$ are returned to $P$, it follows that the other 20% of cars rented at $P$ are returned to $Q$. This implies that the entries in each column must add to 1. This will occur frequently in our discussion so we introduce the following definitions.

:::definition {def:definition-4-5-1} Definition 4.5.1
{index-entry:probability vector} {index-entry:stochastic matrix} A vector whose entries are nonnegative and add to 1 is called a *probability vector*. A square matrix whose columns are probability vectors is called a *stochastic* matrix.
:::

:::activity {act:activity-4-5-2} Activity 4.5.2
Suppose you live in a country with three political parties $P$, $Q$, and $R$. We use $P_k$, $Q_k$, and $R_k$ to denote the percentage of voters voting for that party in election $k$.
Voters will change parties from one election to the next as shown in the figure. We see that 60% of voters stay with the same party. However, 40% of those who vote for party $P$ will vote for party $Q$ in the next election.

> IMAGE {img:stoch-parties} src=../../media/ch04/stoch-parties.svg
> alt: A description of how voters change parties from one election to the next.

a) 
    Write expressions for $P_{k+1}$, $Q_{k+1}$, and $R_{k+1}$ in terms of $P_k$, $Q_k$, and $R_k$.

b) 
    If we write ${\mathbf x}_k = \left[\begin{array}{r}P_k \\ Q_k \\ R_k \end{array}\right]$, find the matrix $A$ such that ${\mathbf x}_{k+1} = A{\mathbf x}_k$.

c) 
    Explain why $A$ is a stochastic matrix.

d) 
    Suppose that initially 40% of citizens vote for party $P$, 30% vote for party $Q$, and 30% vote for party $R$. Form the vector ${\mathbf x}_0$ and explain why ${\mathbf x}_0$ is a probability vector.

e) 
    Find ${\mathbf x}_1$, the percentages who vote for the three parties in the next election. Verify that ${\mathbf x}_1$ is also a probability vector and explain why ${\mathbf x}_k$ will be a probability vector for every $k$.

    :::sage
    ```sage

    ```
    :::

f) 
    Find the eigenvalues of the matrix $A$ and explain why the eigenspace $E_1$ is a one-dimensional subspace of ${\mathbb R}^3$. Then verify that ${\mathbf v}=\left[\begin{array}{r}1 \\ 2 \\ 2 \end{array}\right]$ is a basis vector for $E_1$.

g) 
    As every vector in $E_1$ is a scalar multiple of ${\mathbf v}$, find a probability vector in $E_1$ and explain why it is the only probability vector in $E_1$.

h) 
    Describe what happens to ${\mathbf x}_k$ after a very long time.

SOLUTION:
The solutions to this activity are given in the following text.
:::

The previous activity illustrates some important points that we wish to emphasize.

First, to determine $P_{k+1}$, we note that in election $k+1$, party $P$ retains 60% of its voters from the previous election and adds 20% of those who voted for party $R$. In this way, we see that

$$ \begin{alignedat}{6} P_{k+1} & {}={} 0.6P_k & & & + 0.2 R_k \\ Q_{k+1} & {}={} 0.4P_k & {}+{} & 0.6Q_k & {}+{} 0.2R_k \\ R_{k+1} & {}={} & {}{} & 0.4Q_k & {}+{} 0.6R_k\\ \end{alignedat} $$

We therefore define the matrix

$$ A = \left[\begin{array}{rrr} 0.6 & 0 & 0.2 \\ 0.4 & 0.6 & 0.2 \\ 0 & 0.4 & 0.6 \\ \end{array}\right] $$

and note that ${\mathbf x}_{k+1} = A{\mathbf x}_k$.

If we consider the first column of $A$, we see that the entries represent the percentages of party $P$'s voters in the last election who vote for each of the three parties in the next election. Since everyone who voted for party $P$ previously votes for one of the three parties in the next election, the sum of these percentages must be 1. This is true for each of the columns of $A$, which explains why $A$ is a stochastic matrix.

We begin with the vector ${\mathbf x}_0 = \left[\begin{array}{r}0.4 \\ 0.3 \\ 0.3 \end{array}\right]$, the entries of which represent the percentage of voters voting for each of the three parties. Since every voter votes for one of the three parties, the sum of these entries must be 1, which means that ${\mathbf x}_0$ is a probability vector. We then find that

$$ \begin{array}{cccc} {\mathbf x}_1=\left[\begin{array}{r}0.300 \\ 0.400 \\ 0.300 \end{array}\right],& {\mathbf x}_2=\left[\begin{array}{r}0.240 \\ 0.420 \\ 0.340 \end{array}\right],& {\mathbf x}_3=\left[\begin{array}{r}0.212 \\ 0.416 \\ 0.372 \end{array}\right],& \ldots,\\ \\ {\mathbf x}_5=\left[\begin{array}{r}0.199 \\ 0.404 \\ 0.397 \end{array}\right],& \ldots,& {\mathbf x}_{10}=\left[\begin{array}{r}0.200 \\ 0.400 \\ 0.400 \end{array}\right],& \ldots \\ \end{array} $$

. Notice that the vectors ${\mathbf x}_k$ are also probability vectors and that the sequence ${\mathbf x}_k$ seems to be converging to $\left[\begin{array}{r}0.2 \\ 0.4 \\ 0.4 \end{array}\right]$. It is this behavior that we would like to understand more fully by investigating the eigenvalues and eigenvectors of $A$.

We find that the eigenvalues of $A$ are

$$ \lambda_1 = 1, \qquad \lambda_2 = 0.4 + 0.2i, \qquad\lambda_3 = 0.4-0.2i $$

. Notice that if ${\mathbf v}$ is an eigenvector of $A$ with associated eigenvalue $\lambda_1=1$, then $A{\mathbf v} = 1{\mathbf v} = {\mathbf v}$. That is, ${\mathbf v}$ is unchanged when we multiply it by $A$.

Otherwise, we have $A=PEP^{-1}$ where

$$ E = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 0.4 & -0.2 \\ 0 & 0.2 & 0.4 \\ \end{array}\right] $$

Notice that $|\lambda_2| = |\lambda_3| < 1$ so the trajectories ${\mathbf x}_k$ spiral into the eigenspace $E_1$ as indicated in the figure.

> IMAGE {img:eigen-3d-stoch} src=../../media/ch04/eigen-3d-stoch.svg
> alt: Trajectories created by a three dimensional stochastic dynamical system.

This tells us that the sequence ${\mathbf x}_k$ converges to a vector in $E_1$. In the usual way, we see that ${\mathbf v}=\left[\begin{array}{r}1 \\ 2 \\ 2 \end{array}\right]$ is a basis vector for $E_1$ because $A{\mathbf v} = {\mathbf v}$ so we expect that ${\mathbf x}_k$ will converge to a scalar multiple of ${\mathbf v}$. Indeed, since the vectors ${\mathbf x}_k$ are probability vectors, we expect them to converge to a probability vector in $E_1$.

We can find the probability vector in $E_1$ by finding the appropriate scalar multiple of ${\mathbf v}$. Notice that $c{\mathbf v} = \left[\begin{array}{r}c \\ 2c \\ 2c \end{array}\right]$ is a probability vector when $c+2c+2c=5c = 1$, which implies that $c = 1/5$. Therefore, ${\mathbf q}=\left[\begin{array}{r}0.2 \\ 0.4 \\ 0.4 \end{array}\right]$ is the unique probability vector in $E_1$. Since the sequence ${\mathbf x}_k$ converges to a probability vector in $E_1$, we see that ${\mathbf x}_k$ converges to ${\mathbf q}$, which agrees with the computations we showed above.

The role of the eigenvalues is important in this example. Since $\lambda_1=1$, we can find a probability vector ${\mathbf q}$ that is unchanged by multiplication by $A$. Also, the other eigenvalues satisfy $|\lambda_j| < 1$, which means that all the trajectories get pulled in to the eigenspace $E_1$. Since ${\mathbf x}_k$ is a sequence of probability vectors, these vectors converge to the probability vector ${\mathbf q}$ as they are pulled into $E_1$.

## 4.5.3 Markov chains

If we have a stochastic matrix $A$ and a probability vector ${\mathbf x}_0$, we can form the sequence ${\mathbf x}_k$ where ${\mathbf x}_{k+1} = A {\mathbf x}_k$. We call this sequence of vectors a *Markov chain*. [Exercise 4.5.6](ref:exercise-stochastic-probability) explains why we can guarantee that the vectors ${\mathbf x}_k$ are probability vectors. {index-entry:Markov chain}

In the example that studied voting patterns, we constructed a Markov chain that described how the percentages of voters choosing different parties changed from one election to the next. We saw that the Markov chain converges to ${\mathbf q}=\left[\begin{array}{r}0.2 \\ 0.4 \\ 0.4 \end{array}\right]$, a probability vector in the eigenspace $E_1$. In other words, ${\mathbf q}$ is a probability vector that is unchanged under multiplication by $A$; that is, $A{\mathbf q} = {\mathbf q}$. This implies that, after a long time, 20% of voters choose party $P$, 40% choose $Q$, and 40% choose $R$.

:::definition {def:definition-4-5-2} Definition 4.5.2
{index-entry:steady-state vector} {index-entry:stationary vector} If $A$ is a stochastic matrix, we say that a probability vector ${\mathbf q}$ is a *steady-state* or *stationary* vector if $A{\mathbf q} = {\mathbf q}$.
:::

An important question that arises from our previous example is

:::question {q:question-4-5-3} Question 4.5.3
If $A$ is a stochastic matrix and ${\mathbf x}_k$ a Markov chain, does ${\mathbf x}_k$ converge to a steady-state vector?
:::

:::activity {act:activity-4-5-3} Activity 4.5.3
Consider the matrices

$$ A=\left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right],\qquad B=\left[\begin{array}{rr} 0.4 & 0.3 \\ 0.6 & 0.7 \\ \end{array}\right] $$

.

a) 
    Verify that both $A$ and $B$ are stochastic matrices.

b) 
    Find the eigenvalues of $A$ and then find a steady-state vector for $A$.

c) 
    We will form the Markov chain beginning with the vector ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and defining ${\mathbf x}_{k+1} = A{\mathbf x}_k$. The Sage cell below constructs the first $N$ terms of the Markov chain with the command `markov_chain(A, x0, N)`. Define the matrix `A` and vector `x0` and evaluate the cell to find the first 10 terms of the Markov chain.

    :::sage
    ```sage
    def markov_chain(A, x0, N):
        for i in range(N):
            x0 = A*x0
            print (x0)
    ## define the matrix A and x0
    A =
    x0 =
    markov_chain(A, x0, 10)

    ```
    :::

    What do you notice about the Markov chain? Does it converge to the steady-state vector for $A$?

d) 
    Now find the eigenvalues of $B$ along with a steady-state vector for $B$.

e) 
    As before, find the first 10 terms in the Markov chain beginning with ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and ${\mathbf x}_{k+1} = B{\mathbf x}_k$. What do you notice about the Markov chain? Does it converge to the steady-state vector for $B$?

f) 
    What condition on the eigenvalues of a stochastic matrix will guarantee that a Markov chain will converge to a steady-state vector?

SOLUTION:

a) 
    If we add the entries in each column of $A$ and each column of $B$, we obtain $1$. Also, all the entries in both matrices are nonnegative.

b) 
    The matrix $A$ has the eigenvalues $\lambda_1 = 1$ and $\lambda_2=-1$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$. The steady-state vector is ${\mathbf q}=\left[\begin{array}{r}\frac12 \\ \frac12 \end{array}\right]$ as this is the unique probability vector in $E_1$.

c) 
    The terms in the Markov chain are

    $$ {\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right], {\mathbf x}_1 = \left[\begin{array}{r}0 \\ 1 \end{array}\right], {\mathbf x}_2 = \left[\begin{array}{r}1 \\ 0 \end{array}\right], {\mathbf x}_3 = \left[\begin{array}{r}0 \\ 1 \end{array}\right],\ldots $$

    so the chain does not converge to any vector, much less the steady-state vector.

d) 
    The matrix $B$ has eigenvalues $\lambda_1=1$ and $\lambda_2=0.1$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$. The unique steady-state vector is ${\mathbf q}=\left[\begin{array}{r}\frac13 \\ \frac23 \end{array}\right]$ since this is the only probability vector in $E_1$.

e) 
    Here we find

    $$ \begin{array}{rrrr} {\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right], & {\mathbf x}_1 = \left[\begin{array}{r}0.4 \\ 0.6 \end{array}\right], & {\mathbf x}_2 = \left[\begin{array}{r}0.34 \\ 0.66 \end{array}\right], \\ {\mathbf x}_3 = \left[\begin{array}{r}0.334 \\ 0.666 \end{array}\right], & {\mathbf x}_4 = \left[\begin{array}{r}0.3334 \\ 0.6666 \end{array}\right], & {\mathbf x}_5 = \left[\begin{array}{r}0.33334 \\ 0.66666 \end{array}\right],&\ldots \end{array} $$

    which appears to be converging to the steady-state vector ${\mathbf q}=\left[\begin{array}{r}\frac13 \\ \frac23 \end{array}\right]$.

f) 
    If there is one eigenvalue $\lambda_1=1$ having multiplicity one with the other eigenvalues satisfying $|\lambda_j|< 1$, we can guarantee that any Markov chain will converge to a unique steady-state vector.

:::

As this activity implies, the eigenvalues of a stochastic matrix tell us whether a Markov chain will converge to a steady-state vector. Here are a few important facts about the eigenvalues of a stochastic matrix.

- 
    As is demonstrated in [Exercise 4.5.8](ref:exercise-stochastic-eigenvalue), $\lambda=1$ is an eigenvalue of any stochastic matrix. We usually order the eigenvalues so it is the first eigenvalue meaning that $\lambda_1=1$.

- 
    All other eigenvalues satisfy the property that $|\lambda_j| \leq 1$.

- 
    Any stochastic matrix has at least one steady-state vector ${\mathbf q}$.

As illustrated in the activity, a Markov chain could fail to converge to a steady-state vector if $|\lambda_2| = 1$. This happens for the matrix $A = \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right]$, whose eigenvalues are $\lambda_1=1$ and $\lambda_2 = -1$.

However, if all but the first eigenvalue satisfy $|\lambda_j|< 1$, then there is a unique steady-state vector ${\mathbf q}$ and any Markov chain will converge to ${\mathbf q}$. This was the case for the matrix $B = \left[\begin{array}{rr} 0.4 & 0.3 \\ 0.6 & 0.7 \\ \end{array}\right]$, whose eigenvalues are $\lambda_1=1$ and $\lambda_2 = 0.1$. In this case, any Markov chain will converge to the unique steady-state vector ${\mathbf q} = \left[\begin{array}{r}\frac13 \\ \frac23 \end{array}\right]$.

In this way, we see that the eigenvalues of a stochastic matrix tell us whether a Markov chain will converge to a steady-state vector. However, it is somewhat inconvenient to compute the eigenvalues to answer this question. Is there some way to conclude that every Markov chain will converge to a steady-state vector without actually computing the eigenvalues? It turns out that there is a simple condition on the matrix $A$ that guarantees this.

:::definition {def:definition-4-5-4} Definition 4.5.4
{index-entry:positive matrix} We say that a matrix $A$ is *positive* if either $A$ or some power $A^k$ has all positive entries.
:::

:::example {ex:example-4-5-5} Example 4.5.5
The matrix $A = \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right]$ is not positive. We can see this because some of the entries of $A$ are zero and therefore not positive. In addition, we see that $A^2 = I$, $A^3 = A$ and so forth. Therefore, every power of $A$ also has some zero entries, which means that $A$ is not positive.
The matrix $B = \left[\begin{array}{rr} 0.4 & 0.3 \\ 0.6 & 0.7 \\ \end{array}\right]$ is positive because every entry of $B$ is positive.
Also, the matrix $C = \left[\begin{array}{rr} 0 & 0.5 \\ 1 & 0.5 \\ \end{array}\right]$ clearly has a zero entry. However, $C^2 = \left[\begin{array}{rr} 0.5 & 0.25 \\ 0.5 & 0.75 \\ \end{array}\right]$, which has all positive entries. Therefore, we see that $C$ is a positive matrix.
:::

Positive matrices are important because of the following theorem.

:::theorem {thm:theorem-perron} Theorem 4.5.6 (Perron-Frobenius)
If $A$ is a positive stochastic matrix, then the eigenvalues satisfy $\lambda_1=1$ and $|\lambda_j| < 1$ for $j> 1$. This means that $A$ has a unique positive, steady-state vector ${\mathbf q}$ and that every Markov chain defined by $A$ will converge to ${\mathbf q}$.
:::

:::activity {act:activity-4-5-4} Activity 4.5.4
We will explore the meaning of the Perron-Frobenius theorem in this activity.

a) 
    Consider the matrix $C = \left[\begin{array}{rr} 0 & 0.5 \\ 1 & 0.5 \\ \end{array}\right]$. This is a positive matrix, as we saw in the previous example. Find the eigenvectors of $C$ and verify there is a unique steady-state vector.

b) 
    Using the Sage cell below, construct the Markov chain with initial vector ${\mathbf x}_0= \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and describe what happens to ${\mathbf x}_k$ as $k$ becomes large.

    :::sage
    ```sage
    def markov_chain(A, x0, N):
        for i in range(N):
            x0 = A*x0
            print (x0)
    ## define the matrix C and x0
    C =
    x0 =
    markov_chain(C, x0, 10)

    ```
    :::

c) 
    Construct another Markov chain with initial vector ${\mathbf x}_0=\left[\begin{array}{r}0.2 \\ 0.8 \end{array}\right]$ and describe what happens to ${\mathbf x}_k$ as $k$ becomes large.

d) 
    Consider the matrix $D = \left[\begin{array}{rrr} 0 & 0.5 & 0 \\ 1 & 0.5 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$ and compute several powers of $D$ below.

    :::sage
    ```sage

    ```
    :::

    Determine whether $D$ is a positive matrix.

e) 
    Find the eigenvalues of $D$ and then find the steady-state vectors. Is there a unique steady-state vector?

f) 
    What happens to the Markov chain defined by $D$ with initial vector ${\mathbf x}_0 =\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$? What happens to the Markov chain with initial vector ${\mathbf x}_0=\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right]$.

g) 
    Explain how the matrices $C$ and $D$, which we have considered in this activity, relate to the Perron-Frobenius theorem.

SOLUTION:

a) 
    We find that $C$ has eigenvalues $\lambda_1=1$ and $\lambda_2 = -\frac12$ with eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$ and ${\mathbf v}_2 = \left[\begin{array}{r}-1 \\ 1 \end{array}\right]$. Therefore, the unique steady-state vector is ${\mathbf q}=\left[\begin{array}{r}\frac13 \\ \frac23 \end{array}\right]$ for this is the only probability vector in the eigenspace $E_1$.

b) 
    We see that the Markov chain converges to the steady-state vector ${\mathbf q}=\left[\begin{array}{r}\frac13 \\ \frac23 \end{array}\right]$ as the Perron-Frobenius theorem tells us to expect.

c) 
    Another Markov chain converges to the unique steady-state vector ${\mathbf q}=\left[\begin{array}{r}\frac13 \\ \frac23 \end{array}\right]$ as the Perron-Frobenius theorem tells us to expect.

d) 
    The matrix $D$ is not positive because the first two entries in the bottom row of any power $D^k$ are zero.

e) 
    The eigenvalues are $\lambda_1=1$, which has multiplicity two, and $\lambda_2=-1$. The eigenspace $E_1$ is two-dimensional and spanned by the probability vectors ${\mathbf q}_1=\left[\begin{array}{r}\frac13 \\ \frac23 \\ 0 \end{array}\right]$ and ${\mathbf q}_2=\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right]$. Both of these vectors are steady-state vectors so there is not a unique steady-state vector.

f) 
    If ${\mathbf x}_0=\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$, then the Markov chain converges to ${\mathbf q}_1=\left[\begin{array}{r}\frac13 \\ \frac23 \\ 0 \end{array}\right]$. If ${\mathbf x}_0=\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right]$, then the Markov chain converges to ${\mathbf q}_1=\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right]$.

g) 
    Because $C$ is a positive matrix, the Perron-Frobenius theorem tells us that there is a unique steady-state vector to which any Markov chain will converge. Because $D$ is not a positive matrix, the Perron-Frobenius theorem does not tell us anything, and, indeed, we see that there is not a unique steady-state vector and different Markov chains can converge to different vectors.

:::

## 4.5.4 Google's PageRank algorithm {subsec-google}

Markov chains and the Perron-Frobenius theorem are the central ingredients in Google's PageRank algorithm, developed by Google to assess the quality of web pages.

Suppose we enter “linear algebra” into Google's search engine. Google responds by telling us there are 138 million web pages containing those terms. On the first page, however, there are links to ten web pages that Google judges to have the highest quality and to be the ones we are most likely to be interested in. How does Google assess the quality of web pages?

At the time this is being written, Google is tracking 35 trillion web pages. Clearly, this is too many for humans to evaluate. Plus, human evaluators may inject their own biases into their evaluations, perhaps even unintentionally. Google's idea is to use the structure of the Internet to assess the quality of web pages without any human intervention. For instance, if a web page has quality content, other web pages will link to it. This means that the number of links to a page reflect the quality of that page. In addition, we would expect a page to have even higher quality content if those links are coming from pages that are themselves assessed to have high quality. Simply said, if many quality pages link to a page, that page must itself be of high quality. This is the essence of the PageRank algorithm, which we introduce in the next activity.

:::activity {act:activity-4-5-5} Activity 4.5.5
We will consider a simple model of the Internet that has three pages and links between them as shown here. For instance, page 1 links to both pages 2 and 3, but page 2 only links to page 1.

> FIGURE {fig:fig-google-intro} number=4.5.7 src=../../media/ch04/google-intro.svg
> alt: A model of an Internet with three web pages.
> caption: Our first Internet.

We will measure the quality of the $j^{th}$ page with a number $x_j$, which is called the PageRank of page $j$. The PageRank is determined by the following rule: each page divides its PageRank into equal pieces, one for each outgoing link, and gives one piece to each of the pages it links to. A page's PageRank is the sum of all the PageRank it receives from pages linking to it.
For instance, page 3 has two outgoing links. It therefore divides its PageRank $x_3$ in half and gives half to page 1. Page 2 has only one outgoing link so it gives all of its PageRank $x_2$ to page 1. We therefore have

$$ x_1 = x_2 + \frac12 x_3 $$

.

a) 
    Find similar expressions for $x_2$ and $x_3$.

b) 
    We now form the PageRank vector ${\mathbf x} = \left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]$. Find a matrix $G$ such that the expressions for $x_1$, $x_2$, and $x_3$ can be written in the form $G{\mathbf x} = {\mathbf x}$. The matrix $G$ is called the “Google matrix”.

c) 
    Explain why $G$ is a stochastic matrix.

d) 
    Since ${\mathbf x}$ is defined by the equation $G{\mathbf x} = {\mathbf x}$, any vector in the eigenspace $E_1$ satisfies this equation. So that we might work with a specific vector, we will define the PageRank vector to be the steady-state vector of the stochastic matrix $G$. Find this steady-state vector.

    :::sage
    ```sage

    ```
    :::

e) 
    The PageRank vector ${\mathbf x}$ is composed of the PageRanks for each of the three pages. Which page of the three is assessed to have the highest quality? By referring to the structure of this small model of the Internet, explain why this is a good choice.

f) 
    If we begin with the initial vector ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$ and form the Markov chain ${\mathbf x}_{k+1} = G{\mathbf x}_k$, what does the Perron-Frobenius theorem tell us about the long-term behavior of the Markov chain?

g) 
    Verify that this Markov chain converges to the steady-state PageRank vector.

    :::sage
    ```sage
    def markov_chain(A, x0, N):
        for i in range(N):
            x0 = A*x0
            print (x0.numerical_approx(digits=3))
    ## define the matrix G and x0
    G =
    x0 =
    markov_chain(G, x0, 20)

    ```
    :::

SOLUTION:

a) 
    Notice that page $2$ receives half of the PageRank from pages $1$ and $3$. This means that $x_2=\frac12x_2+\frac12x_3$.

    Also, page $3$ receives half of the PageRank from page $1$ and none from page $2$ so we have $x_3=\frac12 x_1$.

    This means that

    $$ \begin{alignedat}{4} x_1 & {}={} & & & x_2 & {}+{} & \frac12x_3 \\ x_2 & {}={} & \frac12x_1& & & {}+{} & \frac12x_3 \\ x_3 & {}={} & \frac12x_1& & & &\text{.} \\ \end{alignedat} $$

b) 
    From the equations, we see that $G=\left[\begin{array}{rrr} 0 & 1 & \frac12 \\ \frac12 & 0 & \frac12 \\ \frac12 & 0 & 0 \\ \end{array}\right]$.

c) 
    All of the entries of $G$ are nonnegative and the columns each add to $1$. This tells us that $G$ is stochastic.

d) 
    We see that $\lambda_1=1$ is an eigenvalue and that the eigenspace $E_1$ is spanned by $\left[\begin{array}{r}4 \\ 3 \\ 2 \end{array}\right]$. The unique steady-state vector is then ${\mathbf q}=\left[\begin{array}{r}\frac49 \\ \frac39 \\ \frac29 \end{array}\right]$.

e) 
    Page $1$ is assessed to have the highest quality because its PageRank $x_1=\frac49$ is the largest. This makes sense as a reflection of the structure of this Internet. Since Page $2$ only links to Page $1$ and not Page $3$, it is not as useful as Page $1$. Furthermore, Page $3$ only has one incoming link so it is not viewed by Page $2$ as being useful.

f) 
    Since all the entries of $G^4$ are positive, we can conclude that $G$ is a positive matrix. The Perron-Frobenius theorem tells us there is a unique steady-state vector, which we have already seen, and that any Markov chain will converge to it.

g) 
    We verify that the Markov chain converges to the unique steady-state vector ${\mathbf q}=\left[\begin{array}{r}\frac49 \\ \frac39 \\ \frac29 \end{array}\right]$.

:::

This activity shows us two ways to find the PageRank vector. In the first, we determine a steady-state vector directly by finding a description of the eigenspace $E_1$ and then finding the appropriate scalar multiple of a basis vector that gives us the steady-state vector. To find a description of the eigenspace $E_1$, however, we need to find the null space $\text{Nul}(G-I)$. Remember that the real Internet has 35 trillion pages so finding $\text{Nul}(G-I)$ requires us to row reduce a matrix with 35 trillion rows and columns. As we saw in [Subsection 1.3.3](ref:1.3#subsec-compute-effort), that is not computationally feasible.

As suggested by the activity, the second way to find the PageRank vector is to use a Markov chain that converges to the PageRank vector. Since multiplying a vector by a matrix is significantly less work than row reducing the matrix, this approach is computationally feasible, and it is, in fact, how Google computes the PageRank vector.

:::activity {act:activity-4-5-6} Activity 4.5.6
Consider the Internet with eight web pages, shown in [Figure 4.5.8](ref:fig-google-irreducible).
> FIGURE {fig:fig-google-irreducible} number=4.5.8 src=../../media/ch04/google-irreducible.svg
> alt: A model of an Internet with eight web pages
> width: 90%
> caption: A simple model of the Internet with eight web pages.

a) 
    Construct the Google matrix $G$ for this Internet. Then use a Markov chain to find the steady-state PageRank vector ${\mathbf x}$.

    :::sage
    ```sage
    def markov_chain(A, x0, N):
        for i in range(N):
            x0 = A*x0
            print (x0.numerical_approx(digits=3))
    ## define the matrix G and x0
    G =
    x0 =
    markov_chain(G, x0, 20)

    ```
    :::

b) 
    What does this vector tell us about the relative quality of the pages in this Internet? Which page has the highest quality and which the lowest?

c) 
    Now consider the Internet with five pages, shown in [Figure 4.5.9](ref:fig-google-cyclic).

    > FIGURE {fig:fig-google-cyclic} number=4.5.9 src=../../media/ch04/google-cyclic.svg
    > alt: Model of an Internet with five web pages.
    > width: 50%
    > caption: A model of the Internet with five web pages.

    What happens when you begin the Markov chain with the vector ${\mathbf x}_0=\left[\begin{array}{r}1 \\ 0 \\ 0 \\ 0 \\ 0 \\ \end{array}\right]$? Explain why this behavior is consistent with the Perron-Frobenius theorem.

d) 
    What do you think the PageRank vector for this Internet should be? Is any one page of a higher quality than another?

e) 
    Now consider the Internet with eight web pages, shown in [Figure 4.5.10](ref:fig-google-reducible).

    > FIGURE {fig:fig-google-reducible} number=4.5.10 src=../../media/ch04/google-reducible.svg
    > alt: Another model Internet with eight pages.
    > width: 90%
    > caption: Another model of the Internet with eight web pages.

    Notice that this version of the Internet is identical to the first one that we saw in this activity, except that a single link from page 7 to page 1 has been removed. We can therefore find its Google matrix $G$ by slightly modifying the earlier matrix.

    What is the long-term behavior of a Markov chain defined by $G$ and why is this behavior not desirable? How is this behavior consistent with the Perron-Frobenius theorem?

SOLUTION:

a) 
    After creating a Markov chain to find the steady-state vector, we find

    $$ \begin{array}{rrrr} x_1 = 0.057, & x_2=0.085, & x_3=0.028, & x_4=0.085, \\ x_5 = 0.071, & x_6=0.212, & x_7=0.170, & x_8=0.292\text{.} \end{array} $$

b) 
    This shows us that page $8$ is judged to be the most important and page $3$ the least important. The pages $6$, $7$, and $8$, are the most important. This makes sense because there are a lot of links between these pages without many links going out from these pages to the others.

c) 
    We have the matrix

    $$ G = \left[\begin{array}{rrrrr} 0 & 0 & 0 & 0 & 1 \\ 1 & 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 & 0 \\ \end{array}\right]\text{,} $$

    which leads to the Markov chain

    $$ {\mathbf x}_0=\left[\begin{array}{c} 1\\ 0\\ 0 \\ 0 \\0\end{array}\right], {\mathbf x}_1=\left[\begin{array}{c} 0\\ 1\\ 0 \\ 0 \\0\end{array}\right], {\mathbf x}_2=\left[\begin{array}{c} 0\\ 0\\ 1 \\ 0 \\0\end{array}\right], {\mathbf x}_3=\left[\begin{array}{c} 0\\ 0\\ 0 \\ 1 \\0\end{array}\right], {\mathbf x}_4=\left[\begin{array}{c} 0\\ 0\\ 0 \\ 0 \\1\end{array}\right], \ldots $$

    This Markov chain does not converge to a steady-state vector.

d) 
    As all of the pages seem equally important, we should expect the PageRank vector to be

    $$ {\mathbf x}=\left[\begin{array}{c} \frac 15 \\ \frac 15 \\ \frac 15 \\ \frac 15 \\ \frac 15 \end{array}\right]\text{.} $$

e) 
    After generating some terms of a Markov chain, we see that

    $$ \begin{array}{rrrr} x_1 = 0.000, & x_2=0.000, & x_3=0.000, & x_4=0.000, \\ x_5 = 0.120, & x_6=0.240, & x_7=0.240, & x_8=0.400\text{.} \end{array} $$

    These are not the components of a steady-state vector because some of the entries are zero. The Google matrix $G$ cannot be a positive matrix in this example. This is not desirable because we lose any information about the importance of the first four pages. All the PageRank drains out of the left side into the pages on the right side.

:::

The Perron-Frobenius theorem [Theorem 4.5.6](ref:theorem-perron) tells us that a Markov chain ${\mathbf x}_{k+1}=G{\mathbf x}_k$ converges to a unique steady-state vector when the matrix $G$ is positive. This means that $G$ or some power of $G$ should have only positive entries. Clearly, this is not the case for the matrix formed from the Internet in [Figure 4.5.9](ref:fig-google-cyclic).

We can understand the problem with the Internet shown in [Figure 4.5.10](ref:fig-google-reducible) by adding a box around some of the pages as shown in [Figure 4.5.11](ref:fig-google-reducible-box). Here we see that the pages outside of the box give up all of their PageRank to the pages inside the box. This is not desirable because the PageRanks of the pages outside of the box are found to be zero. Once again, the Google matrix $G$ is not a positive matrix.

> FIGURE {fig:fig-google-reducible-box} number=4.5.11 src=../../media/ch04/google-reducible-box.svg
> alt: The previous Internet with eight pages and a box drawn around pages 5, 6, 7, and 8.
> width: 80%
> caption: The pages outside the box give up all of their PageRank to the pages inside the box.

Google solves this problem by slightly modifying the Google matrix $G$ to obtain a positive matrix $G'$. To understand this, think of the entries in the Google matrix as giving the probability that an Internet user follows a link from one page of another. To create a positive matrix, we will allow that user to randomly jump to any other page on the Internet with a small probability.

To make sense of this, suppose that there are $n$ pages on our internet. The matrix

$$ H_n = \left[\begin{array}{rrrr} \frac1n & \frac1n & \ldots & \frac1n \\ \frac1n & \frac1n & \ldots & \frac1n \\ \vdots & \vdots & \ddots & \vdots \\ \frac1n & \frac1n & \ldots & \frac1n \\ \end{array}\right] $$

is a positive stochastic matrix describing a process where we can move from any page to another with equal probability. To form the modified Google matrix $G'$, we choose a parameter $\alpha$ that is used to mix $G$ and $H_n$ together; that is, $G'$ is the positive stochastic matrix

$$ G' = \alpha G +(1-\alpha)H_n $$

. In practice, it is thought that Google uses a value of $\alpha=0.85$ (Google doesn't publish this number as it is a trade secret) so that we have

$$ G' = 0.85 G + 0.15H_n $$

. Intuitively, this means that an Internet user will randomly follow a link from one page to another 85% of the time and will randomly jump to any other page on the Internet 15% of the time. Since the matrix $G'$ is positive, the Perron-Frobenius theorem tells us that any Markov chain will converge to a unique steady-state vector that we call the PageRank vector.

:::activity {act:activity-4-5-7} Activity 4.5.7
The following Sage cell will generate the Markov chain for the modified Google matrix $G$ if you simply enter the original Google matrix $G$ in the appropriate line.
:::sage
```sage
def modified_markov_chain(A, x0, N):
    r = A.nrows()
    A = 0.85*A + 0.15*matrix(r,r,[1.0/r]*(r*r))
    for i in range(N):
        x0 = A*x0
        print (x0.numerical_approx(digits=3))
## Define original Google matrix G and initial vector x0.
## The function above finds the modified Google matrix
## and resulting Markov chain
G =
x0 =
modified_markov_chain(G, x0, 20)

```
:::

a) 
    Consider the original Internet with three pages shown in [Figure 4.5.7](ref:fig-google-intro) and find the PageRank vector ${\mathbf x}$ using the modified Google matrix in the Sage cell above. How does this modified PageRank vector compare to the vector we found using the original Google matrix $G$?

b) 
    Find the modified PageRank vector for the Internet shown in [Figure 4.5.9](ref:fig-google-cyclic). Explain why this vector seems to be the correct one.

c) 
    Find the modified PageRank vector for the Internet shown in [Figure 4.5.10](ref:fig-google-reducible). Explain why this modified PageRank vector fixes the problem that appeared with the original PageRank vector.

SOLUTION:

a) 
    The modified Google matrix has the steady-state vector $\left[\begin{array}{r}0.433 \\ 0.333 \\ 0.234 \end{array}\right]$, which compares to $\left[\begin{array}{r}0.444 \\ 0.333 \\ 0.222 \end{array}\right]$, the steady-state vector of the original Google matrix. These vectors are quite close so it appears that the modification does not change the PageRank significantly.

b) 
    We see that the Markov chain generated by the modified Google matrix converges to the steady-state vector $\left[\begin{array}{c} \frac15 \\ \frac15 \\ \frac15 \\ \frac15 \\ \frac15 \\ \end{array}\right]$, which seems correct as all five pages should have the same PageRank.

c) 
    We find that

    $$ \begin{array}{rrrr} x_1 = 0.019, & x_2=0.072, & x_3=0.027, & x_4=0.080, \\ x_5 = 0.106, & x_6=0.213, & x_7=0.179, & x_8=0.305\text{.} \end{array} $$

    Now the entries are all positive so we can make assessments about the relative quality of all the pages. Due to the presence of the matrix $H_n$ in the modified Google matrix, the PageRank is allowed to flow back from the four pages on the right to the four pages on the left.

:::

The ability to access almost anything we want to know through the Internet is something we take for granted in today's society. Without Google's PageRank algorithm, however, the Internet would be a chaotic place indeed; imagine trying to find a useful web page among the 30 trillion available pages without it. (There are, of course, other search algorithms, but Google's is the most widely used.) The fundamental role that Markov chains and the Perron-Frobenius theorem play in Google's algorithm demonstrates the vast power that mathematics has to shape our society.

## 4.5.5 Summary

This section explored stochastic matrices and Markov chains.

- 
    A probability vector is one whose entries are nonnegative and whose columns add to 1. A stochastic matrix is a square matrix whose columns are probability vectors.

- 
    A Markov chain is formed from a stochastic matrix $A$ and an initial probability vector ${\mathbf x}_0$ using the rule ${\mathbf x}_{k+1}=A{\mathbf x}_k$. We may think of the sequence ${\mathbf x}_k$ as describing the evolution of some conserved quantity, such as the number of rental cars or voters, among a number of possible states over time.

- 
    A steady-state vector ${\mathbf q}$ for a stochastic matrix $A$ is a probability vector that satisfies $A{\mathbf q} = {\mathbf q}$.

- 
    The Perron-Frobenius theorem tells us that, if $A$ is a positive stochastic matrix, then every Markov chain defined by $A$ converges to a unique, positive steady-state vector.

- 
    Google's PageRank algorithm uses Markov chains and the Perron-Frobenius theorem to assess the relative quality of web pages on the Internet.

## 4.5.6 Exercises

:::exercise {exercise-4-5-001} number=4.5.1 answered=yes src=src/exercises/exercises4-5.xml:5
PROBLEM:
Consider the following $2\times2$ stochastic matrices.
For each, make a copy of the diagram and label each edge to indicate the probability of that transition. Then find all the steady-state vectors and describe what happens to a Markov chain defined by that matrix.

> IMAGE {img:ex-stoch} src=../../media/ch04/ex-stoch.svg
> alt: A representation of a two by two stochastic dynamical system.

a) 
    $\left[\begin{array}{rr} 1 & 1 \\ 0 & 0 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rr} 0.8 & 1 \\ 0.2 & 0 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rr} 0.7 & 0.6 \\ 0.3 & 0.4 \\ \end{array}\right]$.

ANSWER:

a) 
    Any Markov chain will converge to ${\mathbf q}=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$.

b) 
    Any Markov chain will converge to ${\mathbf q}=\left[\begin{array}{r}\frac56 \\ \frac16 \end{array}\right]$.

c) 
    The steady-state vectors are those for which ${\mathbf q}=\left[\begin{array}{r}p \\ 1-p \end{array}\right]$ for some $p$ satisfying $0\leq p\leq 1$.

d) 
    Any Markov chain will converge to ${\mathbf q}=\left[\begin{array}{r}\frac23 \\ \frac13 \end{array}\right]$.

SOLUTION:

a) 
    The eigenvalues are $\lambda_1=1$ and $\lambda_2=0$ so there is a unique steady-state vector ${\mathbf q}=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ to which any Markov chain will converge.

b) 
    The eigenvalues are $\lambda_1=1$ and $\lambda_2=-0.2$ so there is a unique steady-state vector ${\mathbf q}=\left[\begin{array}{r}\frac56 \\ \frac16 \end{array}\right]$ to which any Markov chain will converge.

c) 
    Every two-dimensional vector is an eigenvector with eigenvalue $\lambda=1$ so that $A{\mathbf x}={\mathbf x}$ for every ${\mathbf x}$. This shows that any Markov chain will remain constant. The steady-state vectors are those for which ${\mathbf q}=\left[\begin{array}{r}p \\ 1-p \end{array}\right]$ for some $p$ satisfying $0\leq p\leq 1$.

d) 
    The eigenvalues are $\lambda_1=1$ and $\lambda_2=0.1$ so there is a unique steady-state vector ${\mathbf q}=\left[\begin{array}{r}\frac23 \\ \frac13 \end{array}\right]$ to which any Markov chain will converge.

:::

:::exercise {exercise-4-5-002} number=4.5.2 answered=yes src=src/exercises/exercises4-5.xml:117
PROBLEM:
Every year, people move between urban (U), suburban (S), and rural (R) populations with the probabilities given in [Figure 4.5.12](ref:fig-stoch-pops).
> FIGURE {fig:fig-stoch-pops} number=4.5.12 src=../../media/ch04/ex-stoch-pops.svg
> alt: A description of how people move between urban, suburban, and rural environments over time.
> width: 50%
> caption: The flow between urban, suburban, and rural populations.

a) 
    Construct the stochastic matrix $A$ describing the movement of people.

b) 
    Explain what the Perron-Frobenius theorem tells us about the existence of a steady-state vector ${\mathbf q}$ and the behavior of a Markov chain.

c) 
    Use the Sage cell below to find the some terms of a Markov chain.

    :::sage
    ```sage
    def markov_chain(A, x0, N):
        for i in range(N):
            x0 = A*x0
            print (x0.numerical_approx(digits=3))
    ## define the matrix G and x0
    A =
    x0 =
    markov_chain(A, x0, 20)

    ```
    :::

d) 
    Describe the long-term distribution of people among urban, suburban, and rural populations.

ANSWER:

a) 
    $A= \left[\begin{array}{rrr} 0.85 & 0.06 & 0.05 \\ 0.07 & 0.86 & 0.07 \\ 0.08 & 0.08 & 0.88 \\ \end{array}\right]$.

b) 
    There is a unique steady-state vector ${\mathbf q}$ and any Markov chain will converge to ${\mathbf q}$.

c) 
    Any Markov chain we create will converge to ${\mathbf q}=\left[\begin{array}{r}0.267 \\ 0.333 \\ 0.400 \end{array}\right]$.

d) 
    Eventually, about $26.7$% of the population will be rural, $33.3$% will be suburban, and $40.0$% will be urban.

SOLUTION:

a) 
    The diagram tells us that

    $$ \begin{alignedat}{4} R_{k+1} & {}={} & 0.85R_k & {}+{} & 0.06S_k & {}+{} & 0.05U_k \\ S_{k+1} & {}={} & 0.07R_k & {}+{} & 0.86S_k & {}+{} & 0.07U_k \\ U_{k+1} & {}={} & 0.08R_k & {}+{} & 0.08S_k & {}+{} & 0.88U_k \\ \end{alignedat} $$

    giving the stochastic matrix $A= \left[\begin{array}{rrr} 0.85 & 0.06 & 0.05 \\ 0.07 & 0.86 & 0.07 \\ 0.08 & 0.08 & 0.88 \\ \end{array}\right]$.

b) 
    Since all the entries of $A$ are positive, we know that $A$ is a positive matrix. Therefore, the Perron-Frobenius theorem tells us that there is a unique steady-state vector ${\mathbf q}$ and that any Markov chain will converge to ${\mathbf q}$.

c) 
    Any Markov chain we create will converge to ${\mathbf q}=\left[\begin{array}{r}0.267 \\ 0.333 \\ 0.400 \end{array}\right]$.

d) 
    Eventually, about $26.7$% of the population will be rural, $33.3$% will be suburban, and $40.0$% will be urban.

:::

:::exercise {exercise-4-5-003} number=4.5.3 answered=yes src=src/exercises/exercises4-5.xml:249
PROBLEM:
Determine whether the following statements are true or false and provide a justification of your response.

a) 
    Every stochastic matrix has a steady-state vector.

b) 
    If $A$ is a stochastic matrix, then any Markov chain defined by $A$ converges to a steady-state vector.

c) 
    If $A$ is a stochastic matrix, then $\lambda=1$ is an eigenvalue and all the other eigenvalues satisfy $|\lambda| < 1$.

d) 
    A positive stochastic matrix has a unique steady-state vector.

e) 
    If $A$ is an invertible stochastic matrix, then so is $A^{-1}$.

ANSWER:

a) 
    True

b) 
    False

c) 
    False

d) 
    True

e) 
    False

SOLUTION:

a) 
    True. Every stochastic matrix has an eigenvalue $\lambda_1=1$, and we can find a steady-state vector inside the eigenspace $E_1$.

b) 
    False. We have seen examples, such as $A=\left[\begin{array}{rr}0 \amp 1 \\ 1 \amp 0 \\ \end{array}\right]$, for which this is not true. We need to know that $A$ is a positive matrix so that the Perron-Frobenius theorem applies if we want to reach this conclusion.

c) 
    False. Again, we can only guarantee this if the matrix is positive so that the Perron-Frobenius theorem applies.

d) 
    True. This follows from the Perron-Frobenius theorem.

e) 
    False. If $A$ is an invertible stochastic matrix, the eigenvalues of $A$ must satisfy $0< |\lambda_j| \leq 1$. The eigenvalues of $A^{-1}$ are $\frac1{\lambda_j}$, which satisfy $1\leq \left|\frac1{\lambda_j}\right|$ so $A^{-1}$ is most likely not stochastic.

:::

:::exercise {exercise-4-5-004} number=4.5.4 answered=yes src=src/exercises/exercises4-5.xml:314
PROBLEM:
Consider the stochastic matrix

$$ A = \left[\begin{array}{rrr} 1 & 0.2 & 0.2 \\ 0 & 0.6 & 0.2 \\ 0 & 0.2 & 0.6 \\ \end{array}\right] $$

.

a) 
    Find the eigenvalues of $A$.

    :::sage
    ```sage

    ```
    :::

b) 
    Do the conditions of the Perron-Frobenius theorem apply to this matrix?

c) 
    Find the steady-state vectors of $A$.

d) 
    What can we guarantee about the long-term behavior of a Markov chain defined by the matrix $A$?

ANSWER:

a) 
    The eigenvalues are $\lambda_1=1$, $\lambda_2=0.8$, and $\lambda_3=0.4$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$, ${\mathbf v}_2=\left[\begin{array}{r}-2 \\ 1 \\ 1 \end{array}\right]$, and ${\mathbf v}_3=\left[\begin{array}{r}0 \\ 1 \\ -1 \end{array}\right]$.

b) 
    No

c) 
    ${\mathbf q}=\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$

d) 
    Any Markov chain will converge to ${\mathbf q}$.

SOLUTION:

a) 
    The eigenvalues are $\lambda_1=1$, $\lambda_2=0.8$, and $\lambda_3=0.4$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$, ${\mathbf v}_2=\left[\begin{array}{r}-2 \\ 1 \\ 1 \end{array}\right]$, and ${\mathbf v}_3=\left[\begin{array}{r}0 \\ 1 \\ -1 \end{array}\right]$.

b) 
    The conditions of the Perron-Frobenius theorem do not apply because the matrix is not positive. The first column of any power of $A$ will be $\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$.

c) 
    Since $\lambda_1=1$ has multiplicity $1$, we know that $E_1$ is one-dimensional. There is, therefore, a unique steady-state vector ${\mathbf q}=\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$.

d) 
    Any Markov chain will converge to ${\mathbf q}$ because the eigenvalues $\lambda_2$ and $\lambda_2$ are less than $1$.

:::

:::exercise {exercise-4-5-005} number=4.5.5 answered=yes src=src/exercises/exercises4-5.xml:415
PROBLEM:
Explain your responses to the following.

a) 
    Why does Google use a Markov chain to compute the PageRank vector?

b) 
    Describe two problems that can happen when Google constructs a Markov chain using the Google matrix $G$.

c) 
    Describe how these problems are consistent with the Perron-Frobenius theorem.

d) 
    Describe why the Perron-Frobenius theorem suggests creating a Markov chain using the modified Google matrix $G' = \alpha G + (1-\alpha)H_n$.

ANSWER:

a) 
    It is not computationally feasible.

b) 
    A Markov chain does not converge or it may converge to a probability vector having some zero entries.

c) 
    In both of these situations, the Google matrix is not positive.

d) 
    $G'$ is guaranteed to be positive.

SOLUTION:

a) 
    The modified Google matrix $G'$ is huge, roughly 30 trillion $\times$ 30 trillion, so it is not computationally feasible to compute the steady-state vector by finding a basis for $\text{Nul}(G'-I)$.

b) 
    It may happen that a Markov chain does not converge. We saw this with the cyclic web where a Markov chain just moved PageRank from one page to the next around a loop. Also, it may happen that a Markov chain converges to a probability vector with some zero entries. This happens when PageRank drains out of one part of the web.

c) 
    In both of these situations, the Google matrix is not positive so the Perron-Frobenius theorem does not apply.

d) 
    When we create $G'$ in this way, we are guaranteed of having a positive stochastic matrix because all the entries of $G'$ are positive.

:::

In the next few exercises, we will consider the $1\times n$ matrix $S = \left[\begin{array}{rrrr} 1 & 1 & \ldots & 1 \end{array}\right]$.
:::exercise {exercise-4-5-006} number=4.5.6 answered=yes src=src/exercises/exercises4-5.xml:481 label=exercise-stochastic-probability
PROBLEM:
Suppose that $A$ is a stochastic matrix and that ${\mathbf x}$ is a probability vector. We would like to explain why the product $A{\mathbf x}$ is a probability vector.

a) 
    Explain why ${\mathbf x}=\left[\begin{array}{r}0.4 \\ 0.5 \\ 0.1 \end{array}\right]$ is a probability vector and then find the product $S{\mathbf x}$.

b) 
    More generally, if ${\mathbf x}$ is any probability vector, what is the product $S{\mathbf x}$?

c) 
    If $A$ is a stochastic matrix, explain why $SA=S$.

d) 
    Explain why $A{\mathbf x}$ is a probability vector by considering the product $SA{\mathbf x}$.

ANSWER:

a) 
    $S{\mathbf x}=[1]$.

b) 
    If ${\mathbf x}$ is a probability vector, $S{\mathbf x}=[1]$.

c) 
    The entries in $SA$ are the sums of the columns of $A$, which are all $1$.

d) 
    $S(A{\mathbf x})=(SA){\mathbf x} = S{\mathbf x} = [1]$

SOLUTION:

a) 
    Since the components of ${\mathbf x}$ are nonnegative and add to $1$, ${\mathbf x}$ is a probability vector. We see that $S{\mathbf x}=[1]$.

b) 
    Multiplying any vector ${\mathbf x}$ by $S$ just adds the components of ${\mathbf x}$. Therefore, if ${\mathbf x}$ is a probability vector, $S{\mathbf x}=[1]$.

c) 
    Because the columns of $A$ add to $1$, we see that $S$ multiplying any column of $A$ gives $1$. Consequently, the entries in $SA$ are the sums of the columns of $A$, which are all $1$. This gives $SA=S$.

d) 
    Because all the entries in both $A$ and ${\mathbf x}$ are nonnegative, it follows that the components of $A{\mathbf x}$ are nonnegative. Then we have $S(A{\mathbf x})=(SA){\mathbf x} = S{\mathbf x} = [1]$, which shows that the components of ${\mathbf x}$ add to $1$. Therefore, ${\mathbf x}$ is a probability vector.

:::
:::exercise {exercise-4-5-007} number=4.5.7 answered=yes src=src/exercises/exercises4-5.xml:547
PROBLEM:
Using the results of the previous exercise, we would like to explain why $A^2$ is a stochastic matrix if $A$ is stochastic.

a) 
    Suppose that $A$ and $B$ are stochastic matrices. Explain why the product $AB$ is a stochastic matrix by considering the product $SAB$.

b) 
    Explain why $A^2$ is a stochastic matrix.

c) 
    How do the steady-state vectors of $A^2$ compare to the steady-state vectors of $A$?

ANSWER:

a) 
    $S(AB) = (SA)B = SB = S$

b) 
    This follows from the previous part.

c) 
    A steady-state vector for $A$ is a steady-state vector for $A^2$ but a steady-state vector for $A^2$ is not necessarily a steady-state vector for $A$.

SOLUTION:

a) 
    If both $A$ and $B$ are stochastic, all the entries of both $A$ and $B$ are nonnegative. Therefore, the entries of $AB$ are also nonnegative. In addition, we have $S(AB) = (SA)B = SB = S$, which shows that $AB$ is stochastic.

b) 
    This follows from the previous part, which shows that the product of two stochastic matrices is stochastic.

c) 
    If ${\mathbf q}$ is a steady-state vector for $A$, it will be a steady-state vector for $A^2$ as well because $A^2{\mathbf q} = A{\mathbf q}={\mathbf q}$.

    However, it is possible that there are steady-state vectors of $A^2$ that are not steady-state vectors of $A$. If the eigenvalues of $A$ are $\lambda_j$, remember that the eigenvalues of $A^2$ are $\lambda_j^2$. Therefore, $A^2$ can have more steady-state vectors if $\lambda_j=-1$ is an eigenvalue of $A$, which leads to $\lambda_j^2=1$. For instance, $A=\left[\begin{array}{rr}0 \amp 1 \\ 1 \amp 0 \\ \end{array}\right]$ has a unique steady-state vector $\left[\begin{array}{r}\frac12 \\ \frac12 \end{array}\right]$ whereas every probability vector $\left[\begin{array}{r}p \\ 1-p \end{array}\right]$ is a steady-state vector for $A^2=\left[\begin{array}{rr}1 \amp 0 \\ 0 \amp 1 \\ \end{array}\right]$.

:::
:::exercise {exercise-4-5-008} number=4.5.8 answered=yes src=src/exercises/exercises4-5.xml:611 label=exercise-stochastic-eigenvalue
PROBLEM:
This exercise explains why $\lambda=1$ is an eigenvalue of a stochastic matrix $A$. To conclude that $\lambda=1$ is an eigenvalue, we need to know that $A-I$ is not invertible.

a) 
    What is the product $S(A-I)$?

b) 
    What is the product $S{\mathbf e}_1$?

c) 
    Consider the equation $(A-I){\mathbf x} = {\mathbf e}_1$. Explain why this equation cannot be consistent by multiplying by $S$ to obtain $S(A-I){\mathbf x} = S{\mathbf e}_1$.

d) 
    What can you say about the span of the columns of $A-I$?

e) 
    Explain why we can conclude that $A-I$ is not invertible and that $\lambda=1$ is an eigenvalue of $A$.

ANSWER:

a) 
    $S(A-I) = \left[\begin{array}{rrrr}0&0&\cdots& 0 \end{array}\right]$

b) 
    $S{\mathbf e}_1 = \begin{bmatrix}1\end{bmatrix}$.

c) 
    $S(A-I){\mathbf x} = [0]$ while $S{\mathbf e}_1=[1]$.

d) 
    The span of the columns of $A-I$ is not ${\mathbb R}^n$.

e) 
    The span of the columns of $A-I$ is not ${\mathbb R}^n$, we know that $A-I$ is not invertible.

SOLUTION:

a) 
    Notice that both $A$ and $I$ are stochastic. Therefore, $S(A-I)=SA-SI = S-S = \left[\begin{array}{rrrr}0&0&\cdots& 0 \end{array}\right]$.

b) 
    $S{\mathbf e}_1 = \begin{bmatrix} 0 \end{bmatrix}$.

c) 
    We have

    $$ \begin{aligned} (A-I){\mathbf x} & = {\mathbf e}_1 \\ S(A-I){\mathbf x} & = S{\mathbf e}_1 \\ \begin{bmatrix} 0 \end{bmatrix} & = \begin{bmatrix} 1 \end{bmatrix}. \end{aligned} $$

    This says that the original equation $(A-I){\mathbf x} = {\mathbf e}_1$ is not consistent.

d) 
    The span of the columns of $A-I$ is not ${\mathbb R}^n$.

e) 
    Because the span of the columns of $A-I$ is not ${\mathbb R}^n$, $A-I$ has a row without a pivot position, which says that $A-I$ is not invertible. Therefore, $\det(A-I) = 0$, which says that $\lambda = 1$ is an eigenvalue of $A$.

:::

:::exercise {exercise-4-5-009} number=4.5.9 answered=yes src=src/exercises/exercises4-5.xml:693
PROBLEM:
We saw a couple of model Internets in which a Markov chain defined by the Google matrix $G$ did not converge to an appropriate PageRank vector. For this reason, Google defines the matrix

$$ H_n = \left[\begin{array}{rrrr} \frac1n & \frac1n & \ldots & \frac1n \\ \frac1n & \frac1n & \ldots & \frac1n \\ \vdots & \vdots & \ddots & \vdots \\ \frac1n & \frac1n & \ldots & \frac1n \\ \end{array}\right] $$

, where $n$ is the number of web pages, and constructs a Markov chain from the modified Google matrix

$$ G' = \alpha G + (1-\alpha)H_n $$

. Since $G'$ is positive, the Markov chain is guaranteed to converge to a unique steady-state vector.
We said that Google chooses $\alpha = 0.85$ so we might wonder why this is a good choice. We will explore the role of $\alpha$ in this exercise. Let's consider the model Internet described in [Figure 4.5.9](ref:fig-google-cyclic) and construct the Google matrix $G$. In the Sage cell below, you can enter the matrix $G$ and choose a value for $\alpha$.
:::sage
```sage
def modified_markov_chain(A, x0, N):
    r = A.nrows()
    A = alpha*A + (1-alpha)*matrix(r,r,[1.0/r]*(r*r))
    for i in range(N):
        x0 = A*x0
        print (x0.numerical_approx(digits=3))
## Define the matrix original Google matrix G and choose alpha.
## The function above finds the modified Google matrix
## and resulting Markov chain
alpha = 0
G =
x0 = vector([1,0,0,0,0])
modified_markov_chain(G, x0, 20)

```
:::

a) 
    Let's begin with $\alpha=0$. With this choice, what is the matrix $G'=\alpha G + (1-\alpha)H_n$? Construct a Markov chain using the Sage cell above. How many steps are required for the Markov chain to converge to the accuracy with which the vectors ${\mathbf x}_k$ are displayed?

b) 
    Now choose $\alpha=0.25$. How many steps are required for the Markov chain to converge to the accuracy at which the vectors ${\mathbf x}_k$ are displayed?

c) 
    Repeat this experiment with $\alpha = 0.5$ and $\alpha=0.75$.

d) 
    What happens if $\alpha = 1$?

This experiment gives some insight into the choice of $\alpha$. The smaller $\alpha$ is, the faster the Markov chain converges. This is important; since the matrix $G'$ that Google works with is so large, we would like to minimize the number of terms in the Markov chain that we need to compute. On the other hand, as we lower $\alpha$, the matrix $G' = \alpha G + (1-\alpha)H_n$ begins to resemble $H_n$ more and $G$ less. The value $\alpha=0.85$ is chosen so that the matrix $G'$ sufficiently resembles $G$ while having the Markov chain converge in a reasonable amount of steps.
ANSWER:

a) 
    If $\alpha = 0$, then $G'=H_n$ and we see that any Markov chain converges to the steady-state vector ${\mathbf q}$ in one term. That is, ${\mathbf x}_1={\mathbf q}$.

b) 
    After six terms, we have ${\mathbf x}_6={\mathbf q}$ to three digits.

c) 
    With $\alpha = 0.5$, it is not until ${\mathbf x}_{11}={\mathbf q}$ to three digits. With $\alpha=0.75$, it is not until ${\mathbf x}_{26}$.

d) 
    With $\alpha=1$, we have $G'=G$ so the Markov chain will never converge.

SOLUTION:
Remember that the steady-state vector for $G'$ is ${\mathbf q}=\left[\begin{array}{c} \frac15 \\ \frac15 \\ \frac15 \\ \frac15 \\ \frac15 \\ \end{array}\right]$.

a) 
    If $\alpha = 0$, then $G'=H_n$ and we see that any Markov chain converges to ${\mathbf q}$ in one term. That is, ${\mathbf x}_1={\mathbf q}$.

b) 
    After six terms, we have ${\mathbf x}_6={\mathbf q}$ to three digits.

c) 
    With $\alpha = 0.5$, it is not until ${\mathbf x}_{11}={\mathbf q}$ to three digits. With $\alpha=0.75$, it is not until ${\mathbf x}_{26}$.

d) 
    With $\alpha=1$, we have $G'=G$ so the Markov chain will never converge.

:::

:::exercise {exercise-4-5-010} number=4.5.10 answered=yes src=src/exercises/exercises4-5.xml:818
PROBLEM:
This exercise will analyze the board game *Chutes and Ladders*, or at least a simplified version of it.
The board for this game consists of 100 squares arranged in a $10\times10$ grid and numbered 1 to 100. There are pairs of squares joined by a ladder and pairs joined by a chute. All players begin in square 1 and take turns rolling a die. On their turn, a player will move ahead the number of squares indicated on the die. If they arrive at a square at the bottom of a ladder, they move to the square at the top of the ladder. If they arrive at a square at the top of a chute, they move down to the square at the bottom of the chute. The winner is the first player to reach square 100.

> IMAGE {img:chutes} src=../../media/ch04/chutes.jpg
> alt: The game board from Chutes and Ladders.

a) 
    We begin by playing a simpler version of this game with only eight squares laid out in a row as shown in [Figure 4.5.13](ref:fig-chutes-plain) and containing neither chutes nor ladders. Rather than a six-sided die, we will toss a coin and move ahead one or two squares depending on the result of the coin toss. If we are on square 7, we move ahead to square 8 regardless of the coin flip, and if we are on square 8, we will stay there forever.

    > FIGURE {fig:fig-chutes-plain} number=4.5.13 src=../../media/ch04/chutes-plain.svg
    > alt: Eight squares in a row labelled from one to eight from left to right.
    > width: 50%
    > caption: A simple version of Chutes and Ladders with neither chutes nor ladders.

    Construct the $8\times8$ matrix $A$ that records the probability that a player moves from one square to another on one move. For instance, if a player is on square 2, there is a 50% chance they move to square 3 and a 50% chance they move to square 4 on the next move.

    Since we begin the game on square 1, the initial vector ${\mathbf x}_0 = {\mathbf e}_1$. Generate a few terms of the Markov chain ${\mathbf x}_{k+1} = A{\mathbf x}_k$.

    :::sage
    ```sage
    def markov_chain(A, x0, N):
        for i in range(N):
            x0 = A*x0
            print (x0.numerical_approx(digits=3))
    ## define the matrix A and x0
    A =
    x0 =
    markov_chain(A, x0, 10)

    ```
    :::

    What is the probability that we arrive at square 8 by the fourth move? By the sixth move? By the seventh move?

b) 
    We will now modify the game by adding one chute and one ladder as shown in [Figure 4.5.14](ref:fig-chutes-ladders).

    > FIGURE {fig:fig-chutes-ladders} number=4.5.14 src=../../media/ch04/chutes-ladders.svg
    > alt: A simple version of Chutes and Ladders.
    > width: 50%
    > caption: A version of Chutes and Ladders with one chute and one ladder.

    Even though there are eight squares, we only need to consider six of them. For instance, if we arrive at the first blank square, we move up to square 4. Similarly, if we arrive at the second blank square, we move down to square 1.

    Once again, construct the $6\times6$ stochastic matrix that records the probability that we move from one square to another on a given turn and generate some terms in the Markov chain that begins with ${\mathbf x}_0={\mathbf e}_1$.

    :::sage
    ```sage
    def markov_chain(A, x0, N):
        for i in range(N):
            x0 = A*x0
            print (x0.numerical_approx(digits=3))
    ## define the matrix A and x0
    A =
    x0 =
    markov_chain(A, x0, 10)

    ```
    :::

    1. 
        What is the smallest number of moves we can make and arrive at square 6? What is the probability that we arrive at square 6 using this number of moves?

    2. 
        What is the probability that we arrive at square 6 after five moves?

    3. 
        What is the probability that we are still on square 1 after five moves? After seven moves? After nine moves?

    4. 
        After how many moves do we have a 90% chance of having arrived at square 6?

    5. 
        Find the steady-state vector and discuss what this vector implies about the game.

One can analyze the full version of Chutes and Ladders having 100 squares in the same way. Without any chutes or ladders, one finds that the average number of moves required to reach square 100 is 29.0. Once we add the chutes and ladders back in, the average number of moves required to reach square 100 is 27.1. This shows that the average number of moves does not change significantly when we add the chutes and ladders. There is, however, much more variation in the possibilities because it is possible to reach square 100 much more quickly and much more slowly.
ANSWER:

a) 
    The chances are $31.2$% that we arrive at square $8$ after four moves and $98.4$% that we arrive after five moves. We are guaranteed to arrive after seven moves.

b) 
    We find that

    1. 
        We can first arrive at square $6$ after three moves. The chances of doing so are $12.5$%.

    2. 
        After five moves, there is a $31.2$% chance that we have arrived at square $6$.

    3. 
        The chances of being on square $1$ after five moves is $15.6$%. After seven moves, it is still $15.6$%. After nine moves, however, it is $11.9$%.

    4. 
        After 23 moves, there is a $90.2$% chance that we have arrived at square $6$.

    5. 
        ${\mathbf q}={\mathbf e}_6$

SOLUTION:

a) 
    We have the matrix

    $$ A = \left[\begin{array}{rrrrrrrr} 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ \frac{1}{2} & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ \frac{1}{2} & \frac{1}{2} & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & \frac{1}{2} & \frac{1}{2} & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & \frac{1}{2} & \frac{1}{2} & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & \frac{1}{2} & \frac{1}{2} & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & \frac{1}{2} & \frac{1}{2} & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & \frac{1}{2} & 1 & 1 \end{array}\right]\text{.} $$

    Starting a Markov chain with ${\mathbf x}_0 = {\mathbf e}_1$, we find that

    $$ {\mathbf x}_4=\left[\begin{array}{c} 0.000\\ 0.000\\ 0.000\\ 0.000\\ 0.0625\\ 0.250\\ 0.375\\ 0.312 \end{array}\right], {\mathbf x}_6=\left[\begin{array}{c} 0.000\\ 0.000\\ 0.000\\ 0.000\\ 0.000\\ 0.000\\ 0.0156\\ 0.984 \end{array}\right], {\mathbf x}_7=\left[\begin{array}{c} 0.000\\ 0.000\\ 0.000\\ 0.000\\ 0.000\\ 0.000\\ 0.000\\ 1.00 \end{array}\right]\text{.} $$

    This says that the chances are $31.2$% that we arrive at square $8$ after four moves and $98.4$% that we arrive after five moves. We are guaranteed to arrive after seven moves.

b) 
    Now we have the matrix $A = \left[\begin{array}{rrrrrr} 0 & 0 & 0 & \frac{1}{2} & \frac{1}{2} & 0 \\ \frac{1}{2} & 0 & 0 & 0 & 0 & 0 \\ 0 & \frac{1}{2} & 0 & 0 & 0 & 0 \\ \frac{1}{2} & \frac{1}{2} & \frac{1}{2} & 0 & 0 & 0 \\ 0 & 0 & \frac{1}{2} & \frac{1}{2} & 0 & 0 \\ 0 & 0 & 0 & 0 & \frac{1}{2} & 1 \end{array}\right]\text{,}$ which leads to the Markov chain with terms

    $$ \begin{array}{rrr} {\mathbf x}_3=\left[\begin{array}{c} 0.250\\ 0.125\\ 0.000\\ 0.250\\ 0.250\\ 0.125 \end{array}\right], & {\mathbf x}_5=\left[\begin{array}{c} 0.156\\ 0.125\\ 0.063\\ 0.219\\ 0.125\\ 0.312 \end{array}\right], & {\mathbf x}_7=\left[\begin{array}{c} 0.156\\ 0.086\\ 0.039\\ 0.156\\ 0.117\\ 0.445 \end{array}\right], \\ {\mathbf x}_9=\left[\begin{array}{c} 0.119\\ 0.069\\ 0.039\\ 0.129\\ 0.092\\ 0.553 \end{array}\right], & {\mathbf x}_{23}=\left[\begin{array}{c} 0.027\\ 0.015\\ 0.008\\ 0.028\\ 0.020\\ 0.902 \end{array}\right]\text{.} \end{array} $$

    1. 
        We can first arrive at square $6$ after three moves. The chances of doing so are $12.5$%.

    2. 
        After five moves, there is a $31.2$% chance that we have arrived at square $6$.

    3. 
        The chances of being on square $1$ after five moves is $15.6$%. After seven moves, it is still $15.6$%. After nine moves, however, it is $11.9$%.

    4. 
        After 23 moves, there is a $90.2$% chance that we have arrived at square $6$.

    5. 
        The steady-state vector is ${\mathbf q}={\mathbf e}_6$, which means that we will eventually arrive at square $6$.

:::
