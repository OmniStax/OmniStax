# 4.4 Dynamical systems {sec-dynamical}

The last section demonstrated ways in which we may relate a matrix, and the effect that multiplication has on vectors, to a simpler form. For instance, if there is a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$, we saw that $A$ is similar to a diagonal matrix $D$. As a result, the effect of multiplying vectors by $A$, when expressed using the basis of eigenvectors, is the same as multiplying by $D$.
In this section, we will put these ideas to use as we explore discrete dynamical systems, first encountered in [Subsection 2.5.4](ref:2.5#subsec-dynamical-systems). Recall that we used a state vector ${\mathbf x}$ to characterize the state of some system at a particular time, such as the distribution of delivery trucks between two locations. A matrix $A$ described the transition of the state vector with $A{\mathbf x}$ characterizing the state of the system at a later time. Since we would like to understand how the state vector evolves over time, we are interested in studying the sequence of vectors $A^k{\mathbf x}$.
Our goal in this section is to describe the types of behaviors that dynamical systems exhibit and to develop a means of detecting these behaviors.

## 4.4.1 Introduction

:::exploration {act:preview-4-4-1} Preview Activity 4.4.1
Suppose that we have a diagonalizable matrix $A=PDP^{-1}$ where

$$ P = \left[\begin{array}{rr} 1 & -1 \\ 1 & 2 \\ \end{array}\right],\qquad D = \left[\begin{array}{rr} 2 & 0 \\ 0 & -3 \\ \end{array}\right] $$

.
PROBLEM:
a) Find the eigenvalues of $A$ and find a basis for the associated eigenspaces.
b) Form a basis of ${\mathbb R}^2$ consisting of eigenvectors of $A$ and write the vector ${\mathbf x} = \left[\begin{array}{r}1 \\ 4 \end{array}\right]$ as a linear combination of basis vectors.
c) Write $A{\mathbf x}$ as a linear combination of basis vectors.
d) For some power $k$, write $A^k{\mathbf x}$ as a linear combination of basis vectors.
e) Find the vector $A^5{\mathbf x}$.
SOLUTION:
a) Since $A$ has been diagonalized as $A=PDP^{-1}$, the eigenvalues of $A$ are the diagonal entries of $D$ and the eigenvectors are the columns of $P$. Therefore, we know the eigenvalues are $\lambda_1=2$ with associated eigenvector ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and $\lambda_2=-3$ with associated eigenvector ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 2 \end{array}\right]$.
b) The columns of $P$, ${\mathbf v}_1$ and ${\mathbf v}_2$, form a basis for ${\mathbb R}^2$. We find that ${\mathbf x}=\left[\begin{array}{r}1 \\ 4 \end{array}\right] = 2{\mathbf v}_1+{\mathbf v}_2$.
c) Then $A{\mathbf x}=2\lambda_1{\mathbf v}_1+\lambda_2{\mathbf v}_2= 4{\mathbf v}_1-3{\mathbf v}_2$.
d) We have $A^k{\mathbf x} = 2\cdot2^k{\mathbf v}_1 +(-3)^k{\mathbf v}_2$.
e) $A^5{\mathbf x} = 2\cdot2^5{\mathbf v}_1 + (-3)^5{\mathbf v}_2 = \left[\begin{array}{r}307 \\ -422 \end{array}\right]$.
:::

## 4.4.2 A first example

We will begin with a dynamical system that illustrates how the ideas we've been developing can help us understand the populations of two interacting species. There are several possible ways in which two species may interact. For example, wolves on Isle Royale in northern Michigan prey on moose so this interaction is often called a predator-prey relationship. Other interactions between species, such as bees and flowering plants, are mutually beneficial for both species.

:::activity {act:activity-4-4-2} Activity 4.4.2
Suppose we have two species $R$ and $S$ that interact with each another and that we record the change in their populations from year to year. When we begin our study, the populations, measured in thousands, are $R_0$ and $S_0$; after $k$ years, the populations are $R_k$ and $S_k$.
If we know the populations in one year, suppose that the populations in the following year are determined by the expressions

$$ \begin{aligned} R_{k+1} & {}={} 0.9 R_k + 0.8 S_k \\ S_{k+1} & {}={} 0.2 R_k + 0.9 S_k\text{.} \\ \end{aligned} $$

This is an example of a mutually beneficial relationship between two species. If species $S$ is not present, then $R_{k+1} = 0.9R_k$, which means that the population of species $R$ decreases every year. However, species $R$ benefits from the presence of species $S$, which helps $R$ to grow by 80% of the population of species $S$. In the same way, $S$ benefits from the presence of $R$.
We will record the populations in a vector ${\mathbf x}_k = \left[\begin{array}{r}R_k \\ S_k \end{array}\right]$ and note that ${\mathbf x}_{k+1} = A{\mathbf x}_k$ where $A = \left[\begin{array}{rr} 0.9 & 0.8 \\ 0.2 & 0.9 \\ \end{array}\right]$.

a) 
    Verify that

    $$ {\mathbf v}_1=\left[\begin{array}{r}2 \\ 1 \end{array}\right],\qquad {\mathbf v}_2=\left[\begin{array}{r}-2 \\ 1 \end{array}\right] $$

    are eigenvectors of $A$ and find their respective eigenvalues.

b) 
    Suppose that initially ${\mathbf x}_0 = \left[\begin{array}{r}2 \\ 3 \end{array}\right]$. Write ${\mathbf x}_0$ as a linear combination of the eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$.

c) 
    Write the vectors ${\mathbf x}_1$, ${\mathbf x}_2$, and ${\mathbf x}_3$ as linear combinations of the eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$.

d) 
    What happens to ${\mathbf x}_k$ after a very long time?

e) 
    When $k$ becomes very large, what happens to the ratio of the populations $R_k/S_k$?

f) 
    After a very long time, by approximately what factor does the population of $R$ grow every year? By approximately what factor does the population of $S$ grow every year?

g) 
    If we begin instead with ${\mathbf x}_0 = \left[\begin{array}{r}4 \\ 4 \end{array}\right]$, what eventually happens to the ratio $R_k/S_k$ as $k$ becomes very large?

SOLUTION:

a) 
    We find that $A{\mathbf v}_1=\left[\begin{array}{r}2.6 \\ 1.3 \end{array}\right] = 1.3{\mathbf v}_1$ and $A{\mathbf v}_2=\left[\begin{array}{r}-1 \\ 0.5 \end{array}\right]=0.5{\mathbf v}_2$. This shows that ${\mathbf v}_1$ and ${\mathbf v}_2$ are eigenvectors with associated eigenvalues $\lambda_1=1.3$ and $\lambda_2=0.5$.

b) 
    Solving for the weights of the linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$ that produces ${\mathbf x}_0$, we find that ${\mathbf x}_0=2{\mathbf v}_1+{\mathbf v}_2$.

c) 
    Each time we multiply by $A$, the eigenvectors are multiplied by their associated eigenvalues. This gives

    $$ \begin{aligned} {\mathbf x}_1 = A{\mathbf x}_0 & = 2(1.3){\mathbf v}_1 + 0.5{\mathbf v}_2 \\ {\mathbf x}_2 = A{\mathbf x}_1 & = 2(1.3)^2{\mathbf v}_1 + 0.5^2{\mathbf v}_2 \\ {\mathbf x}_3 = A{\mathbf x}_2 & = 2(1.3)^3{\mathbf v}_1 + 0.5^3{\mathbf v}_2\text{.} \\ \end{aligned} $$

d) 
    After a long time $0.5^k\approx 0$ so we have ${\mathbf x}_k \approx 2(1.3)^k{\mathbf v}_1$.

e) 
    More generally, we have ${\mathbf x}_k=2(1.3)^k{\mathbf v}_1 + 0.5^k{\mathbf v}_2$. As $k$ grows large, $0.5^k$ becomes insignificantly small so that ${\mathbf x}_k\approx 2(1.3)^k{\mathbf v}_1$. This means that $R_k\approx 4(1.3)^k$ and $S_k\approx2(1.3)^k$ so that the ratio $R_k/S_k \approx 2$.

f) 
    We see that ${\mathbf x}_{k+1}\approx 1.3{\mathbf x}_k$ so that the populations both grow by a factor of approximately 1.3, which is a 30% growth rate.

g) 
    Now we have ${\mathbf x}_0 = 3{\mathbf v}_1 + {\mathbf v}_2$. In the same way, when $k$ is very large, we have ${\mathbf x}_k\approx 3(1.3)^k{\mathbf v}_1$ so that $R_k\approx6(1.3)^k$ and $S_k\approx3(1.3)^k$. This gives the same ratio: $R_k/S_k\approx 2$.

:::

This activity demonstrates the type of systems we will be considering. In particular, we will have vectors ${\mathbf x}_k$ that describe the state of the system at time $k$ and a matrix $A$ that describes how the state evolves from one time to the next: ${\mathbf x}_{k+1} = A{\mathbf x}_k$. The eigenvalues and eigenvectors of $A$ provide the key that helps us understand how the vectors ${\mathbf x}_k$ evolve and that enables us to make long-range predictions.

Let's look at the specific example in the previous activity more carefully. We see that

$$ {\mathbf x}_{k+1} = A{\mathbf x}_k = \left[\begin{array}{rr} 0.9 & 0.8 \\ 0.2 & 0.9 \\ \end{array}\right] {\mathbf x}_k $$

and that the matrix $A$ has eigenvectors ${\mathbf v}_1 = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-2 \\ 1 \end{array}\right]$ with associated eigenvalues $\lambda_1=1.3$ and $\lambda_2=0.5$.

With initial populations ${\mathbf x}_0=\left[\begin{array}{r}2 \\ 3 \end{array}\right]$, we have

$$ \begin{aligned} {\mathbf x}_0 & {}={} 2{\mathbf v}_1 + 1{\mathbf v}_2 \\ {\mathbf x}_1 & {}={} 1.3\cdot2{\mathbf v}_1 + 0.5\cdot1{\mathbf v}_2 \\ {\mathbf x}_2 & {}={} 1.3^2\cdot2{\mathbf v}_1 + 0.5^2\cdot1{\mathbf v}_2 \\ {\mathbf x}_k & {}={} 1.3^k\cdot2{\mathbf v}_1 + 0.5^k\cdot1{\mathbf v}_2. \\ \end{aligned} $$

Let's shift our perspective slightly. The eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$ form a basis ${\cal B}$ of ${\mathbb R}^2$, which says that $A$ is diagonalizable; that is, $A = PDP^{-1}$ where

$$ P = \left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right] = \left[\begin{array}{rr} 2 & -2 \\ 1 & 1 \\ \end{array}\right], \qquad D = \left[\begin{array}{rr} 1.3 & 0 \\ 0 & 0.5 \\ \end{array}\right]. $$

The coordinate system defined by the basis ${\cal B}$ can be used to express the state vectors. For instance, we can write the initial state vector ${\mathbf x}_0=\left[\begin{array}{r}2 \\ 3 \end{array}\right]= 2{\mathbf v}_1+{\mathbf v}_2$, which means that $\left\{{\mathbf x}_0\right\}_{{\cal B}} = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$. Moreover, ${\mathbf x}_1=A{\mathbf x}_0 = (1.3)\cdot2{\mathbf v}_1 + (0.5)\cdot1{\mathbf v}_2$ so that

$$ \left\{{\mathbf x}_1\right\}_{{\cal B}} = \left[\begin{array}{r}1.3\cdot 2 \\ 0.5\cdot 1 \end{array}\right] = D\left[\begin{array}{r}2 \\ 1 \end{array}\right] = D\left\{{\mathbf x}_0\right\}_{{\cal B}}. $$

In the same way,

$$ \begin{aligned} \left\{{\mathbf x}_1\right\}_{{\cal B}} & {}={} D\left\{{\mathbf x}_0\right\}_{{\cal B}} = \left[\begin{array}{c}1.3\cdot 2 \\ 0.5\cdot 1 \end{array}\right] \\ \left\{{\mathbf x}_2\right\}_{{\cal B}} & {}={} D\left\{{\mathbf x}_1\right\}_{{\cal B}} = \left[\begin{array}{c}1.3^2\cdot 2 \\ 0.5^2\cdot1 \end{array}\right] \\ \left\{{\mathbf x}_3\right\}_{{\cal B}} & {}={} D\left\{{\mathbf x}_2\right\}_{{\cal B}} = \left[\begin{array}{c}1.3^3\cdot2 \\ 0.5^3\cdot1 \end{array}\right] \\ \left\{{\mathbf x}_k\right\}_{{\cal B}} & {}={} \left[\begin{array}{c}1.3^k\cdot2 \\ 0.5^k\cdot1 \end{array}\right]\text{.} \\ \end{aligned} $$

More generally, we have

$$ \left\{A{\mathbf x}\right\}_{{\cal B}} = D\left\{{\mathbf x}\right\}_{{\cal B}}, $$

which is a restatement of the fact that $A$ is similar to $D$.

Thinking about this geometrically, we begin with the vector $\left\{{\mathbf x}_0\right\}_{{\cal B}}=\left[\begin{array}{c}2 \\ 1 \end{array}\right]$. Subsequent vectors $\left\{{\mathbf x}_k\right\}_{{\cal B}}$ are obtained by scaling horizontally by a factor of $1.3$ and scaling vertically by a factor $0.5$. Notice how the points move along a curve away from the origin becoming ever closer to the horizontal axis. After a very long time, $\left\{{\mathbf x}_k\right\}_{{\cal B}} \approx \left[\begin{array}{c}1.3^k\cdot2 \\ 0 \end{array}\right]$.

> IMAGE {img:eigen-dynamical-intro} src=../../media/ch04/eigen-dynamical-intro.svg
> alt: A plot showing how the state vector evolves in the eigenvector coordinate system.

To recover the behavior of the sequence ${\mathbf x}_0, {\mathbf x}_1, {\mathbf x}_2, \ldots$, we change coordinate systems using the basis defined by ${\mathbf v}_1$ and ${\mathbf v}_2$. Here, the points move along a curve away from the origin becoming ever closer to the line defined by ${\mathbf v}_1$.

> IMAGE {img:eigen-dynamical-intro-1} src=../../media/ch04/eigen-dynamical-intro-1.svg
> alt: A plot showing how the state vector evolves in the standard coordinate system.

Eventually, the vectors become practically indistinguishable from a scalar multiple of ${\mathbf v}_1 = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$ since ${\mathbf x}_k\approx 1.3^k\cdot2{\mathbf v}_1$. This means that

$$ {\mathbf x}_k = \left[\begin{array}{r}R_k \\ S_k \end{array}\right] \approx 1.3^k\cdot 2{\mathbf v}_1 = \left[\begin{array}{r}1.3^k\cdot4 \\ 1.3^k\cdot2 \end{array}\right]. $$

This shows that

$$ R_k/S_k \approx (1.3^k\cdot 4) / (1.3^k\cdot 2) = 2 $$

so that we expect the population of species $R$ to eventually be about twice that of species $S$.

In addition, ${\mathbf x}_{k+1} \approx 1.3{\mathbf x}_k$ so that $R_{k+1}\approx 1.3 R_k$ and $S_{k+1}\approx 1.3 S_k$, which tells us that both populations are multiplied by 1.3 every year meaning the annual growth rate for both populations is about 30%.

In the same way, we can consider other possible initial populations ${\mathbf x}_0$ as shown in [Figure 4.4.1](ref:fig-eigen-dynam-saddle). Regardless of ${\mathbf x}_0$, the population vectors, in the coordinates defined by ${\cal B}$, are scaled horizontally by a factor of $1.3$ and vertically by a factor of $0.5$. The sequence of points $\left\{{\mathbf x}_k\right\}_{{\cal B}}$, called *trajectories*, move along the curves, as shown on the left. In the standard coordinate system, we see that the trajectories converge to the eigenspace $E_{1.3}$.

> FIGURE {fig:fig-eigen-dynam-saddle} number=4.4.1 src=../../media/ch04/eigen-dynam-saddle-a.svg
> alt: Several trajectories in the coordinate system defined by the eigenvectors.
> caption: The trajectories of the dynamical system formed by the matrix $A$ in the coordinate system defined by ${\cal B}$, on the left, and in the standard coordinate system, on the right.
> subfigure src=../../media/ch04/eigen-dynam-saddle-a.svg alt: Several trajectories in the coordinate system defined by the eigenvectors.
> subfigure src=../../media/ch04/eigen-dynam-saddle-b.svg alt: Several trajectories in the standard coordinate system

We conclude that, regardless of the initial populations, the ratio of the populations $R_k/S_k$ will approach 2 to 1 and that the growth rate for both populations approaches 30%. This example demonstrates the power of using eigenvalues and eigenvectors to rewrite the problem in terms of a new coordinate system. By doing so, we are able to predict the long-term behavior of the populations independently of the initial populations.

Diagrams like those shown in [Figure 4.4.1](ref:fig-eigen-dynam-saddle) are called *phase portraits.* On the left of [Figure 4.4.1](ref:fig-eigen-dynam-saddle) is the phase portrait of the diagonal matrix $D=\left[\begin{array}{rr}1.3 \amp 0 \\ 0 \amp 0.5 \\ \end{array}\right]$ while the right of that figure shows the phase portrait of $A = \left[\begin{array}{rr}0.9 \amp 0.8 \\ 0.2 \amp 0.9 \\ \end{array}\right]$. The phase portrait of $D$ is relatively easy to understand because it is determined only by the two eigenvalues. Once we have the phase portrait of $D$, however, the phase portrait of $A$ has a similar appearance with the eigenvectors ${\mathbf v}_j$ replacing the standard basis vectors ${\mathbf e}_j$.

## 4.4.3 Classifying dynamical systems

In the previous example, we were able to make predictions about the behavior of trajectories ${\mathbf x}_k=A^k{\mathbf x}_0$ by considering the eigenvalues and eigenvectors of the matrix $A$. The next activity looks at a collection of matrices that demonstrate the types of behavior a $2\times2$ dynamical system can exhibit.

:::activity {act:activity-4-4-3} Activity 4.4.3
We will now look at several more examples of dynamical systems. If $P = \left[\begin{array}{rr} 1 & -1 \\ 1 & 1 \\ \end{array}\right]$, we note that the columns of $P$ form a basis ${\cal B}$ of ${\mathbb R}^2$. Given below are several matrices $A$ written in the form $A=PEP^{-1}$ for some matrix $E$. For each matrix, state the eigenvalues of $A$ and sketch a phase portrait for the matrix $E$ on the left and a phase portrait for $A$ on the right. Describe the behavior of $A^k{\mathbf x}_0$ as $k$ becomes very large for a typical initial vector ${\mathbf x}_0$.

a) 
    $A=PEP^{-1}$ where $E = \left[\begin{array}{rr} 1.3 & 0 \\ 0 & 1.5 \\ \end{array}\right]$.

    > IMAGE {img:eigen-phase-activity-a} src=../../media/ch04/eigen-phase-activity-a.svg
    > alt: A coordinate grid and axes in the standard coordinate system

    > IMAGE {img:eigen-phase-activity-b} src=../../media/ch04/eigen-phase-activity-b.svg
    > alt: A coordinate grid and axes in the eigenvector coordinate system.

b) 
    $A=PEP^{-1}$ where $E = \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$.

    > IMAGE {img:eigen-phase-activity-a} src=../../media/ch04/eigen-phase-activity-a.svg
    > alt: A coordinate grid and axes in the standard coordinate system

    > IMAGE {img:eigen-phase-activity-b} src=../../media/ch04/eigen-phase-activity-b.svg
    > alt: A coordinate grid and axes in the eigenvector coordinate system.

c) 
    $A=PEP^{-1}$ where $E = \left[\begin{array}{rr} 0.7 & 0 \\ 0 & 1.5 \\ \end{array}\right]$.

    > IMAGE {img:eigen-phase-activity-a} src=../../media/ch04/eigen-phase-activity-a.svg
    > alt: A coordinate grid and axes in the standard coordinate system

    > IMAGE {img:eigen-phase-activity-b} src=../../media/ch04/eigen-phase-activity-b.svg
    > alt: A coordinate grid and axes in the eigenvector coordinate system.

d) 
    $A=PEP^{-1}$ where $E = \left[\begin{array}{rr} 0.3 & 0 \\ 0 & 0.7 \\ \end{array}\right]$.

    > IMAGE {img:eigen-phase-activity-a} src=../../media/ch04/eigen-phase-activity-a.svg
    > alt: A coordinate grid and axes in the standard coordinate system

    > IMAGE {img:eigen-phase-activity-b} src=../../media/ch04/eigen-phase-activity-b.svg
    > alt: A coordinate grid and axes in the eigenvector coordinate system.

e) 
    $A=PEP^{-1}$ where $E = \left[\begin{array}{rr} 1 & -0.9 \\ 0.9 & 1 \\ \end{array}\right]$.

    > IMAGE {img:eigen-phase-activity-a} src=../../media/ch04/eigen-phase-activity-a.svg
    > alt: A coordinate grid and axes in the standard coordinate system

    > IMAGE {img:eigen-phase-activity-b} src=../../media/ch04/eigen-phase-activity-b.svg
    > alt: A coordinate grid and axes in the eigenvector coordinate system.

f) 
    $A=PEP^{-1}$ where $E = \left[\begin{array}{rr} 0.6 & -0.2 \\ 0.2 & 0.6 \\ \end{array}\right]$.

    > IMAGE {img:eigen-phase-activity-a} src=../../media/ch04/eigen-phase-activity-a.svg
    > alt: A coordinate grid and axes in the standard coordinate system

    > IMAGE {img:eigen-phase-activity-b} src=../../media/ch04/eigen-phase-activity-b.svg
    > alt: A coordinate grid and axes in the eigenvector coordinate system.

SOLUTION:

a) 
    > IMAGE {img:ex-phase-repellor-a} src=../../media/ch04/ex-phase-repellor-a.svg

    > IMAGE {img:ex-phase-repellor-b} src=../../media/ch04/ex-phase-repellor-b.svg

b) 
    > IMAGE {img:ex-phase-center-a} src=../../media/ch04/ex-phase-center-a.svg

    > IMAGE {img:ex-phase-center-b} src=../../media/ch04/ex-phase-center-b.svg

c) 
    > IMAGE {img:ex-phase-saddle-a} src=../../media/ch04/ex-phase-saddle-a.svg

    > IMAGE {img:ex-phase-saddle-b} src=../../media/ch04/ex-phase-saddle-b.svg

d) 
    > IMAGE {img:ex-phase-attractor-a} src=../../media/ch04/ex-phase-attractor-a.svg

    > IMAGE {img:ex-phase-attractor-b} src=../../media/ch04/ex-phase-attractor-b.svg

e) 
    > IMAGE {img:ex-phase-spiralr-a} src=../../media/ch04/ex-phase-spiralr-a.svg

    > IMAGE {img:ex-phase-spiralr-b} src=../../media/ch04/ex-phase-spiralr-b.svg

f) 
    > IMAGE {img:ex-phase-spirala-a} src=../../media/ch04/ex-phase-spirala-a.svg

    > IMAGE {img:ex-phase-spirala-b} src=../../media/ch04/ex-phase-spirala-b.svg

:::

This activity demonstrates six possible types of dynamical systems, which are determined by the eigenvalues of $A$.

- 
    Suppose that $A$ has two real eigenvalues $\lambda_1$ and $\lambda_2$ and that both $|\lambda_1|, |\lambda_2| > 1$. In this case, any nonzero vector ${\mathbf x}_0$ forms a trajectory that moves away from the origin so we say that the origin is a *repellor*. This is illustrated in [Figure 4.4.2](ref:fig-eigen-phase-repellor).

    > FIGURE {fig:fig-eigen-phase-repellor} number=4.4.2 src=../../media/ch04/eigen-phase-repellor-a.svg
    > alt: Trajectories for a repelling dynamical system in the coordinate system defined by the eigenvectors
    > caption: The origin is a repellor when $|\lambda_1|, |\lambda_2| > 1$.
    > subfigure src=../../media/ch04/eigen-phase-repellor-a.svg alt: Trajectories for a repelling dynamical system in the coordinate system defined by the eigenvectors
    > subfigure src=../../media/ch04/eigen-phase-repellor-b.svg alt: Trajectories for a repelling dynamical system in the standard coordinate system.

- 
    Suppose that $A$ has two real eigenvalues $\lambda_1$ and $\lambda_2$ and that $|\lambda_1| > 1 > |\lambda_2|$. In this case, most nonzero vectors ${\mathbf x}_0$ form trajectories that converge to the eigenspace $E_{\lambda_1}$. In this case, we say that the origin is a *saddle* as illustrated in [Figure 4.4.3](ref:fig-eigen-phase-saddle).

    > FIGURE {fig:fig-eigen-phase-saddle} number=4.4.3 src=../../media/ch04/eigen-phase-saddle-a.svg
    > alt: Trajectories for a saddle in the coordinate system defined by the eigenvectors.
    > caption: The origin is a saddle when $|\lambda_1|> 1 > |\lambda_2|$.
    > subfigure src=../../media/ch04/eigen-phase-saddle-a.svg alt: Trajectories for a saddle in the coordinate system defined by the eigenvectors.
    > subfigure src=../../media/ch04/eigen-phase-saddle-b.svg alt: Trajectories for a saddle in the standard coordinate system

- 
    Suppose that $A$ has two real eigenvalues $\lambda_1$ and $\lambda_2$ and that both $|\lambda_1|, |\lambda_2| < 1$. In this case, any nonzero vector ${\mathbf x}_0$ forms a trajectory that moves into the origin so we say that the origin is an *attractor*. This is illustrated in [Figure 4.4.4](ref:fig-eigen-phase-attractor).

    > FIGURE {fig:fig-eigen-phase-attractor} number=4.4.4 src=../../media/ch04/eigen-phase-attractor-a.svg
    > alt: Trajectories for an attracting dynamical system in the coordinate system defined by the eigenvectors
    > caption: The origin is an attractor when $|\lambda_1|, |\lambda_2| < 1$.
    > subfigure src=../../media/ch04/eigen-phase-attractor-a.svg alt: Trajectories for an attracting dynamical system in the coordinate system defined by the eigenvectors
    > subfigure src=../../media/ch04/eigen-phase-attractor-b.svg alt: Trajectories for an attracting dynamical system in the standard coordinate system

- 
    Suppose that $A$ has a complex eigenvalue $\lambda = a+bi$ where $|\lambda| > 1$. In this case, a nonzero vector ${\mathbf x}_0$ forms a trajectory that spirals away from the origin. We say that the origin is a *spiral repellor*, as illustrated in [Figure 4.4.5](ref:fig-eigen-phase-spiralr).

    > FIGURE {fig:fig-eigen-phase-spiralr} number=4.4.5 src=../../media/ch04/eigen-phase-spiralr-a.svg
    > alt: Trajectories for a spiraling repellor in the coordinate system defined by the eigenvectors
    > caption: The origin is a spiral repellor when $A$ has an eigenvalue $\lambda=a+bi$ with $a^2+b^2> 1$.
    > subfigure src=../../media/ch04/eigen-phase-spiralr-a.svg alt: Trajectories for a spiraling repellor in the coordinate system defined by the eigenvectors
    > subfigure src=../../media/ch04/eigen-phase-spiralr-b.svg alt: Trajectories for a spiraling repellor in the standard coordinate system.

- 
    Suppose that $A$ has a complex eigenvalue $\lambda = a+bi$ where $|\lambda| = 1$. In this case, a nonzero vector ${\mathbf x}_0$ forms a trajectory that moves on a closed curve around the origin. We say that the origin is a *center*, as illustrated in [Figure 4.4.6](ref:fig-eigen-phase-center).

    > FIGURE {fig:fig-eigen-phase-center} number=4.4.6 src=../../media/ch04/eigen-phase-center-a.svg
    > alt: Trajectories for a center in the coordinate system defined by the eigenvectors
    > caption: The origin is a center when $A$ has an eigenvalue $\lambda=a+bi$ with $a^2+b^2 = 1$.
    > subfigure src=../../media/ch04/eigen-phase-center-a.svg alt: Trajectories for a center in the coordinate system defined by the eigenvectors
    > subfigure src=../../media/ch04/eigen-phase-center-b.svg alt: Trajectories for a center in the standard coordinate system

- 
    Suppose that $A$ has a complex eigenvalue $\lambda = a+bi$ where $|\lambda| < 1$. In this case, a nonzero vector ${\mathbf x}_0$ forms a trajectory that spirals into the origin. We say that the origin is a *spiral attractor*, as illustrated in [Figure 4.4.7](ref:fig-eigen-phase-spirala).

    > FIGURE {fig:fig-eigen-phase-spirala} number=4.4.7 src=../../media/ch04/eigen-phase-spirala-a.svg
    > alt: Trajectories for a spiraling attractor in the coordinate system defined by the eigenvectors
    > caption: The origin is a spiral attractor when $A$ has an eigenvalue $\lambda=a+bi$ with $a^2+b^2< 1$.
    > subfigure src=../../media/ch04/eigen-phase-spirala-a.svg alt: Trajectories for a spiraling attractor in the coordinate system defined by the eigenvectors
    > subfigure src=../../media/ch04/eigen-phase-spirala-b.svg alt: Trajectories for a spiraling attractor in the standard coordinate system

This list includes many types of expected behavior, but there are other possibilities if, for instance, one of the eigenvalues is 0. The next section explores the situation when one of the eigenvalues is 1.

:::activity {act:activity-4-4-4} Activity 4.4.4
In this activity, we will consider several ways in which two species might interact with one another. Throughout, we will consider two species $R$ and $S$ whose populations in year $k$ form a vector ${\mathbf x}_k=\left[\begin{array}{r}R_k \\ S_k \end{array}\right]$ and which evolve according to the rule

$$ {\mathbf x}_{k+1}=A{\mathbf x}_k $$

.

a) 
    Suppose that $A = \left[\begin{array}{rr} 0.7 & 0 \\ 0 & 1.6 \\ \end{array}\right]$.

    Explain why the species do not interact with one another. Which of the six types of dynamical systems do we have? What happens to both species after a long time?

b) 
    Suppose now that $A = \left[\begin{array}{rr} 0.7 & 0.3 \\ 0 & 1.6 \\ \end{array}\right]$.

    Explain why $S$ is a beneficial species for $R$. Which of the six types of dynamical systems do we have? What happens to both species after a long time?

c) 
    If $A = \left[\begin{array}{rr} 0.7 & 0.5 \\ -0.4 & 1.6 \\ \end{array}\right]$, explain why this describes a predator-prey system. Which of the species is the predator and which is the prey? Which of the six types of dynamical systems do we have? What happens to both species after a long time?

d) 
    Suppose that $A = \left[\begin{array}{rr} 0.5 & 0.2 \\ -0.4 & 1.1 \\ \end{array}\right]$. Compare this predator-prey system to the one in the previous part. Which of the six types of dynamical systems do we have? What happens to both species after a long time?

SOLUTION:

a) 
    With this matrix $A$, we have

    $$ \begin{aligned} R_{k+1} & = 0.7R_k \\ S_{k+1} & = 1.6S_k\text{.} \\ \end{aligned} $$

    This shows that the population of one species does not depend on the other. This dynamical system is a saddle because we have the eigenvalues $\lambda_1=0.7$ and $\lambda_2=1.6$. Eventually, species $R$ will become extinct while species $S$ grows by a factor of 1.6.

b) 
    Now we have

    $$ \begin{alignedat}{3} R_{k+1} & {}={} & 0.7R_k &{}+{} & 0.3S_k\\ S_{k+1} & {}={} & & & 1.6S_k\text{.} \\ \end{alignedat} $$

    The population of species $S$ is not influenced by species $R$. However, we see that the population of species $R$ grows in the presence of species $S$. In other words, species $S$ helps species $R$ to grow so we say that $S$ is beneficial for $R$.

    Because the eigenvalues are $\lambda_1=0.7$ and $\lambda_2=1.6$, this dynamical system is again a saddle. The associated eigenvectors are ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 3 \end{array}\right]$. After a long time, the population vector ${\mathbf x}_k\approx c_1(1.6)^k{\mathbf v}_2$ so both populations grow by a factor of 1.6 and with a ratio $R_k/S_k=1/3.$

c) 
    Here we have

    $$ \begin{alignedat}{3} R_{k+1} & {}={} & 0.7R_k &{}+{} & 0.5S_k\\ S_{k+1} & {}={} & -0.4R_k & {}+{}& 1.6S_k\text{.} \\ \end{alignedat} $$

    Species $S$ helps species $R$ to grow, while species $R$ inhibits the growth of species $S$. One explanation for this is that species $R$ preys on species $S$ as a food source.

    We have eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda_1=1.2$ and ${\mathbf v}_2=\left[\begin{array}{r}5 \\ 4 \end{array}\right]$ with $\lambda_2=1.1$. This dynamical system is a repellor so both species will grow arbitrarily large.

d) 
    This example is similar to the previous one, but the coefficients are slightly different. We see that the growth rate of both species is smaller. For instance, in the previous problem, we had $R_{k+1}=0.7R_k+\ldots$ while we now have $R_{k+1}=0.5R_k+\ldots$. This says that the reproduction rate of species $R$ has decreased from $0.7$ to $0.5$. In the same way, that of species $S$ has decreased from $1.6$ to $1.1$. Also, $R_{k+1}=\ldots + 0.2S_k$ so the presence of species $S$ is less beneficial to species $R$.

    We now have the eigenvalues $\lambda_1=0.9$ and $\lambda_2=0.7$, which means that this dynamical system is an attractor and that both species will become extinct.

:::

## 4.4.4 A $3\times3$ system

Up to this point, we have focused on $2\times2$ systems. In fact, the general case is quite similar. As an example, consider a $3\times3$ system ${\mathbf x}_{k+1}=A{\mathbf x}_k$ where the matrix $A$ has eigenvalues $\lambda_1 = 0.6$, $\lambda_2 = 0.8$, and $\lambda_3=1.1$. Since the eigenvalues are real and distinct, there is a basis ${\cal B}$ consisting of eigenvectors of $A$ so we can look at the trajectories $\left\{{\mathbf x}_k\right\}_{{\cal B}}$ in the coordinate system defined by ${\cal B}$. The phase portraits in [Figure 4.4.8](ref:fig-eigen-3d-saddle) show how some representative trajectories will evolve. We see that all the trajectories will converge into the eigenspace $E_{1.1}$.

> FIGURE {fig:fig-eigen-3d-saddle} number=4.4.8 src=../../media/ch04/eigen-3d-saddle-d.svg
> alt: Trajectories of a three dimensional saddle
> caption: In a $3\times3$ system with $\lambda_1 = 0.6$, $\lambda_2=0.8$, and $\lambda_3 = 1.1$, the trajectories $\left\{{\mathbf x}_k\right\}_{{\cal B}}$ move along the curves shown above.
> subfigure src=../../media/ch04/eigen-3d-saddle-d.svg alt: Trajectories of a three dimensional saddle
> subfigure src=../../media/ch04/eigen-3d-saddle-e.svg alt: Trajectories of a three dimensional saddle

In the same way, suppose we have a $3\times3$ system with complex eigenvalues $\lambda=0.8 \pm 0.5i$ and $\lambda_3=1.1$. Since the complex eigenvalues satisfy $|\lambda| < 1$, there is a two-dimensional subspace in which the trajectories spiral in toward the origin. The phase portraits in [Figure 4.4.9](ref:fig-eigen-3d-spiral) show some of the trajectories. Once again, we see that all the trajectories converge into the eigenspace $E_{1.1}$.

> FIGURE {fig:fig-eigen-3d-spiral} number=4.4.9 src=../../media/ch04/eigen-3d-saddle-a.svg
> alt: Trajectories of another three dimensional saddle
> caption: In a $3\times3$ system with complex eigenvalues $\lambda = a\pm bi$ with $|\lambda| < 1$ and $\lambda_3=1.1$, the trajectories $\left\{{\mathbf x}_k\right\}_{{\cal B}}$ move along the curves shown above.
> subfigure src=../../media/ch04/eigen-3d-saddle-a.svg alt: Trajectories of another three dimensional saddle
> subfigure src=../../media/ch04/eigen-3d-saddle-c.svg alt: Trajectories of another three dimensional saddle

:::activity {act:activity-4-4-5} Activity 4.4.5
The following type of analysis has been used to study the population of a bison herd. We will divide the population of female bison into three groups: juveniles who are less than one year old; yearlings between one and two years old; and adults who are older than two years.
Each year,

- 
    80% of the juveniles survive to become yearlings.

- 
    90% of the yearlings survive to become adults.

- 
    80% of the adults survive.

- 
    40% of the adults give birth to a juvenile.

> IMAGE {img:eigen-3d-species} src=../../media/ch04/eigen-3d-species.svg
> alt: A representation of how bison transition between juveniles, yearlings, and adults.

By $J_k$, $Y_k$, and $A_k$, we denote the number of juveniles, yearlings, and adults in year $k$. We have

$$ J_{k+1} = 0.4 A_k $$

.

a) 
    Find similar expressions for $Y_{k+1}$ and $A_{k+1}$ in terms of $J_k$, $Y_k$, and $A_k$.

b) 
    As is usual, we write the matrix ${\mathbf x}_k=\left[\begin{array}{r}J_k \\ Y_k \\ A_k \end{array}\right]$. Write the matrix $A$ such that ${\mathbf x}_{k+1} = A{\mathbf x}_k$ and find its eigenvalues.

c) 
    We can write $A = PEP^{-1}$ where the matrices $E$ and $P$ are approximately:

    $$ \begin{aligned} E & {}={} \left[\begin{array}{rrr} 1.058 & 0 & 0 \\ 0 & -0.128 & -0.506 \\ 0 & 0.506 & -0.128 \\ \end{array}\right], \\ \\ P & {}={} \left[\begin{array}{rrr} 1 & 1 & 0 \\ 0.756 & -0.378 & 1.486 \\ 2.644 & -0.322 & -1.264 \\ \end{array}\right]\text{.} \end{aligned} $$

    Make a prediction about the long-term behavior of ${\mathbf x}_k$. For instance, at what rate does it grow? For every 100 adults, how many juveniles, and yearlings are there?

d) 
    Suppose that the birth rate decreases so that only 30% of adults give birth to a juvenile. How does this affect the long-term growth rate of the herd?

    :::sage
    ```sage

    ```
    :::

e) 
    Suppose that the birth rate decreases further so that only 20% of adults give birth to a juvenile. How does this affect the long-term growth rate of the herd?

    :::sage
    ```sage

    ```
    :::

f) 
    Find the smallest birth rate that supports a stable population.

SOLUTION:

a) 
    We have the relationships

    $$ \begin{alignedat}{4} J_{k+1} & {}={} & & & & & 0.4 A_k \\ Y_{k+1} & {}={} & 0.8 J_k \\ A_{k+1} & {}={} & & & 0.9Y_k & {}+{} & 0.8A_k\text{.} \\ \end{alignedat} $$

b) 
    The matrix $A=\left[\begin{array}{rrr} 0 & 0 & 0.4 \\ 0.8 & 0 & 0 \\ 0 & 0.9 & 0.8 \\ \end{array}\right]$.

c) 
    There is a real eigenvalue $\lambda_1=1.058$, which is larger than $1$. The other eigenvalues are complex $\lambda_{2,3} = -0.128\pm 0.506i$ and satisfy $|\lambda_{2,3}| < 1$. Therefore, the complex eigenvalues will pull vectors in toward the line defined by the eigenvector ${\mathbf v}_1$. After a long time, the population is ${\mathbf x}_k\approx c_1(1.058)^k{\mathbf v}_1$. All the populations grow annually by a factor of $1.058$ or 5.8%, and there are approximately 38 juveniles and 29 yearlings for every 100 adults.

d) 
    We now have eigenvalues $\lambda_1=1.011$ and $\lambda_{2,3} = -0.106\pm 0.450i$. This shows that the growth rate is lowered to $1.011$ or $1.1$% annually.

e) 
    The first eigenvalue is $\lambda_1=0.957$ so the growth rate is about $96$%. In other words, the population decreases every year.

f) 
    To be stable, we need the first eigenvalue $\lambda_1=1$. If we experiment with different birth rates, we see that a birth rate of about 0.278 gives this eigenvalue.

:::

## 4.4.5 Summary

We have been exploring discrete dynamical systems in which an initial state vector ${\mathbf x}_0$ evolves over time according to the rule ${\mathbf x}_{k+1}=A{\mathbf x}_k$. The eigenvalues and eigenvectors of $A$ help us understand the behavior of the state vectors. In the $2\times2$ case, we saw that

- 
    $|\lambda_1|, |\lambda_2| < 1$ produces an attractor so that trajectories are pulled in toward the origin.

- 
    $|\lambda_1| > 1$ and $|\lambda_2| < 1$ produces a saddle in which most trajectories are pushed away from the origin and in the direction of $E_{\lambda_1}$.

- 
    $|\lambda_1|, |\lambda_2| > 1$ produces a repellor in which trajectories are pushed away from the origin.

The same kind of reasoning allows us to analyze $n\times n$ systems as well.

## 4.4.6 Exercises

:::exercise {exercise-4-4-001} number=4.4.1 answered=yes src=src/exercises/exercises4-4.xml:5
PROBLEM:
For each of the $2\times2$ matrices below, find the eigenvalues and, when appropriate, the eigenvectors to classify the dynamical system ${\mathbf x}_{k+1}=A{\mathbf x}_k$. Use this information to sketch the phase portraits.

a) 
    $A = \left[\begin{array}{rr} 3& 1 \\ 1 & 3 \\ \end{array}\right]$.

b) 
    $A = \left[\begin{array}{rr} 3& -2 \\ 4 & -1 \\ \end{array}\right]$.

c) 
    $A = \left[\begin{array}{rr} 1.9 & 1.4 \\ -0.7 & -0.2 \\ \end{array}\right]$.

d) 
    $A = \left[\begin{array}{rr} 1.1 & -0.2 \\ 0.4 & 0.5 \\ \end{array}\right]$.

ANSWER:

a) 
    Repellor

b) 
    Spiral repellor

c) 
    Saddle

d) 
    Attractor

SOLUTION:

a) 
    There are two real eigenvalues $\lambda_1=4$ and $\lambda_2=2$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$. This dynamical system is a repellor so trajectories are pushed away from the origin.

    > IMAGE {img:ex-dynam-sol-a-a} src=../../media/ch04/ex-dynam-sol-a-a.svg

    > IMAGE {img:ex-dynam-sol-a-b} src=../../media/ch04/ex-dynam-sol-a-b.svg

b) 
    This is a spiral repellor because there are complex eigenvalues $1\pm 2i$ whose length is greater than one. Trajectories will spiral away from the origin.

    > IMAGE {img:4-4-eigen-phase-spiralr-a} src=../../media/ch04/4-4-eigen-phase-spiralr-a.svg

    > IMAGE {img:4-4-eigen-phase-spiralr-b} src=../../media/ch04/4-4-eigen-phase-spiralr-b.svg

c) 
    This is a saddle because there are two real eigenvalues $\lambda_1=1.2$ and $\lambda_2=0.5$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}-2 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$. Most trajectories will move away from the origin along the line defined by the eigenvector ${\mathbf v}_1$.

    > IMAGE {img:ex-dynam-sol-c-a} src=../../media/ch04/ex-dynam-sol-c-a.svg

    > IMAGE {img:ex-dynam-sol-c-b} src=../../media/ch04/ex-dynam-sol-c-b.svg

d) 
    This is an attractor because there are two real eigenvalues $0.9$ and $0.7$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$. Trajectories will be pulled in toward the origin.

    > IMAGE {img:ex-dynam-sol-d-a} src=../../media/ch04/ex-dynam-sol-d-a.svg

    > IMAGE {img:ex-dynam-sol-d-b} src=../../media/ch04/ex-dynam-sol-d-b.svg

:::

:::exercise {exercise-4-4-002} number=4.4.2 answered=yes src=src/exercises/exercises4-4.xml:143
PROBLEM:
We will consider matrices that have the form $A=PDP^{-1}$ where

$$ D = \left[\begin{array}{rr}p \amp 0 \\ 0 \amp \frac12 \\ \end{array}\right], P = \left[\begin{array}{rr}2 \amp -2 \\ 1 \amp 1 \\ \end{array}\right] $$

where $p$ is a parameter that we will vary. Sketch phase portraits for $D$ and $A$ below when

a) 
    $p=\frac12$.

    > IMAGE {img:empty-6-empty} src=../../media/ch04/empty-6-empty.svg
    > alt: The standard coordinate grid

    > IMAGE {img:ex-phase-parameter-b} src=../../media/ch04/ex-phase-parameter-b.svg
    > alt: A skewed grid and axes defined by the eigenvectors

b) 
    $p=1$.

    > IMAGE {img:empty-6-empty} src=../../media/ch04/empty-6-empty.svg
    > alt: The standard coordinate grid

    > IMAGE {img:ex-phase-parameter-b} src=../../media/ch04/ex-phase-parameter-b.svg
    > alt: A skewed grid and axes defined by the eigenvectors

c) 
    $p=2$.

    > IMAGE {img:empty-6-empty} src=../../media/ch04/empty-6-empty.svg
    > alt: The standard coordinate grid

    > IMAGE {img:ex-phase-parameter-b} src=../../media/ch04/ex-phase-parameter-b.svg
    > alt: A skewed grid and axes defined by the eigenvectors

d) 
    For the different values of $p$, determine which types of dynamical system results. For what range of $p$ values do we have an attractor? For what range of $p$ values do we have a saddle? For what value does the transition between the two types occur?

ANSWER:
The phase portraits are as shown.

a) 
    When $p=\frac12$.

    > IMAGE {img:ex-phase-param-a-a} src=../../media/ch04/ex-phase-param-a-a.svg

    > IMAGE {img:ex-phase-param-a-b} src=../../media/ch04/ex-phase-param-a-b.svg

b) 
    When $p=1$.

    > IMAGE {img:ex-phase-param-b-a} src=../../media/ch04/ex-phase-param-b-a.svg

    > IMAGE {img:ex-phase-param-b-b} src=../../media/ch04/ex-phase-param-b-b.svg

c) 
    When $p=2$.

    > IMAGE {img:ex-phase-param-c-a} src=../../media/ch04/ex-phase-param-c-a.svg

    > IMAGE {img:ex-phase-param-c-b} src=../../media/ch04/ex-phase-param-c-b.svg

d) 
    If $p<1$, we have an attractor. If $p>1$, we have a saddle. The transition between the two types occurs at $p=1$.

SOLUTION:
The phase portraits are as shown.

a) 
    When $p=\frac12$.

    > IMAGE {img:ex-phase-param-a-a} src=../../media/ch04/ex-phase-param-a-a.svg

    > IMAGE {img:ex-phase-param-a-b} src=../../media/ch04/ex-phase-param-a-b.svg

b) 
    When $p=1$.

    > IMAGE {img:ex-phase-param-b-a} src=../../media/ch04/ex-phase-param-b-a.svg

    > IMAGE {img:ex-phase-param-b-b} src=../../media/ch04/ex-phase-param-b-b.svg

c) 
    When $p=2$.

    > IMAGE {img:ex-phase-param-c-a} src=../../media/ch04/ex-phase-param-c-a.svg

    > IMAGE {img:ex-phase-param-c-b} src=../../media/ch04/ex-phase-param-c-b.svg

d) 
    If $p<1$, we have an attractor. If $p>1$, we have a saddle. The transition between the two types occurs at $p=1$.

:::

:::exercise {exercise-4-4-003} number=4.4.3 answered=yes src=src/exercises/exercises4-4.xml:380
PROBLEM:
Suppose that the populations of two species interact according to the relationships

$$ \begin{aligned} R_{k+1} & {}={} \frac12 R_k + \frac12S_k \\ S_{k+1} & {}={} -pR_k + 2S_k \\ \end{aligned} $$

where $p$ is a parameter. As we saw in the text, this dynamical system represents a typical predator-prey relationship, and the parameter $p$ represents the rate at which species $R$ preys on $S$. We will denote the matrix $A=\left[\begin{array}{rr}\frac12 \amp \frac12 \\ -p \amp 2 \\ \end{array}\right]$.

a) 
    If $p = 0$, determine the eigenvectors and eigenvalues of the system and classify it as one of the six types. Sketch the phase portraits for the diagonal matrix $D$ to which $A$ is similar as well as the phase portrait for $A$.

    > IMAGE {img:empty-6-empty} src=../../media/ch04/empty-6-empty.svg
    > alt: The standard coordinate grid and axes.

    > IMAGE {img:empty-6-S-R} src=../../media/ch04/empty-6-S-R.svg
    > alt: The standard coordinate grid and axes labeled R and S

b) 
    If $p=1$, determine the eigenvectors and eigenvalues of the system. Sketch the phase portraits for the diagonal matrix $D$ to which $A$ is similar as well as the phase portrait for $A$.

    > IMAGE {img:empty-6-empty} src=../../media/ch04/empty-6-empty.svg
    > alt: The standard coordinate grid and axes.

    > IMAGE {img:empty-6-S-R} src=../../media/ch04/empty-6-S-R.svg
    > alt: The standard coordinate grid and axes labeled R and S

c) 
    For what values of $p$ is the origin a saddle? What can you say about the populations when this happens?

d) 
    Describe the evolution of the dynamical system as $p$ begins at $0$ and increases to $p=1$.

ANSWER:

a) 
    $\lambda_1=\frac12$ and $\lambda_2=2$

    > IMAGE {img:ex-predator-sol-a} src=../../media/ch04/ex-predator-sol-a.svg
    > width: 90%

b) 
    $\lambda_1=1$ and $\lambda_2=1.5$

    > IMAGE {img:ex-predator-sol-b} src=../../media/ch04/ex-predator-sol-b.svg
    > width: 90%

c) 
    $p< 1$

d) 
    As $p$ grows, there needs to be a sufficient $S$ population to ensure the survival of both species.

SOLUTION:

a) 
    If $p = 0$, the eigenvectors are ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ with associated eigenvalue $\lambda_1=\frac12$ and ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 3 \end{array}\right]$ with eigenvalue $\lambda_2=2$. The phase portraits are as

    > IMAGE {img:ex-predator-sol-a-a} src=../../media/ch04/ex-predator-sol-a-a.svg

    > IMAGE {img:ex-predator-sol-a-b} src=../../media/ch04/ex-predator-sol-a-b.svg

b) 
    With $p=1$, we have eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ with eigenvalue $\lambda_1=1$ and ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$ with eigenvalue $\lambda_2=1.5$. The phase portraits appear as

    > IMAGE {img:ex-predator-sol-b-a} src=../../media/ch04/ex-predator-sol-b-a.svg

    > IMAGE {img:ex-predator-sol-b-b} src=../../media/ch04/ex-predator-sol-b-b.svg

c) 
    We find the characteristic polynomial of $A$ to be

    $$ \det(A-\lambda I) = \lambda^2-\frac52\lambda+\frac12 p\text{,} $$

    which has roots

    $$ \lambda=\frac 54 \pm \frac12\sqrt{\frac94-2p}\text{.} $$

    So long as $\frac94 - 2p\geq 0$, one root will be real and larger than $1$. We have a saddle when

    $$ \begin{aligned} \frac 54 - \frac12\sqrt{\frac94-2p} & < 1 \\ \sqrt{\frac94-2p} & > \frac12 \\ p & < 1\text{.} \\ \end{aligned} $$

    This shows that we have a saddle whenever $p<1$.

d) 
    When $p=0$, we have a saddle. Notice that $R$ will go extinct if the initial population of $S$ is zero. As we increase $p$, we still have a saddle, but it is now possible for $R$ to go extinct even when the initial $S$ population is positive. Only when the initial ratio of $$ to $R$ is greater than a minimum value, which depends on $p$, will $R$ not go extinct. Eventually, when $p=1$, we see that $R$ will go extinct as long as $R_0> S_0$.

    As we increase the predation rate, the population of $S$ is lowered by $R$. However, $S$ is necessary to $R$'s survival. When the predation rate grows too large, there needs to be a sufficiently large initial $S$ population to support both species.

:::

:::exercise {exercise-4-4-004} number=4.4.4 answered=yes src=src/exercises/exercises4-4.xml:579
PROBLEM:
Consider the matrices

$$ A = \left[\begin{array}{cc} 3 & 2 \\ -5 & -3 \\ \end{array}\right], \qquad B = \left[\begin{array}{cc} 5 & 7 \\ -3 & -4 \\ \end{array}\right]\text{.} $$

a) 
    Find the eigenvalues of $A$. To which of the six types does the system ${\mathbf x}_{k+1}=A{\mathbf x}_{k}$ belong?

b) 
    Using the eigenvalues of $A$, we can write $A=PEP^{-1}$ for some matrices $E$ and $P$. What is the matrix $E$ and what geometric effect does multiplication by $E$ have on vectors in the plane?

c) 
    If we remember that $A^k = PE^kP^{-1}$, determine the smallest positive value of $k$ for which $A^k=I$.

d) 
    Find the eigenvalues of $B$.

e) 
    Find a matrix $E$ such that $B = PEP^{-1}$ for some matrix $P$. What geometric effect does multiplication by $E$ have on vectors in the plane?

f) 
    Determine the smallest positive value of $k$ for which $B^k=I$.

ANSWER:

a) 
    This dynamical system is a center.

b) 
    $E=\left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$.

c) 
    $A^4=I$.

d) 
    $\lambda=\frac12\pm \frac{\sqrt{3}}2 i$.

e) 
    $E=\left[\begin{array}{rr} \frac 12 & -\frac{\sqrt{3}}2 \\ \frac{\sqrt{3}}2 & \frac 12 \\ \end{array}\right]$

f) 
    $B^6=I$.

SOLUTION:

a) 
    The eigenvalues are $\lambda=\pm i$ so this dynamical system is a center.

b) 
    The matrix is $E=\left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$, which is a $90^\circ$ rotation.

c) 
    If we rotate by $90^\circ$ four times, we obtain the identity. Therefore, $A^4=I$.

d) 
    Here, we find the eigenvalues $\lambda=\frac12\pm \frac{\sqrt{3}}2 i$.

e) 
    The matrix is $E=\left[\begin{array}{rr} \frac 12 & -\frac{\sqrt{3}}2 \\ \frac{\sqrt{3}}2 & \frac 12\end{array}\right]$, which is a $60^\circ$ rotation.

f) 
    If we rotate by $60^\circ$ six times, we obtain the identity. Therefore, $B^6=I$.

:::

:::exercise {exercise-4-4-005} number=4.4.5 answered=yes src=src/exercises/exercises4-4.xml:677
PROBLEM:
Suppose we have the female population of a species is divided into juveniles, yearlings, and adults and that each year

- 
    90% of the juveniles live to be yearlings.

- 
    80% of the yearlings live to be adults.

- 
    60% of the adults survive to the next year.

- 
    50% of the adults give birth to a juvenile.

a) 
    Set up a system of the form ${\mathbf x}_{k+1}=A{\mathbf x}_k$ that describes this situation.

b) 
    Find the eigenvalues of the matrix $A$.

    :::sage
    ```sage

    ```
    :::

c) 
    What prediction can you make about these populations after a very long time?

d) 
    If the birth rate goes up to 80%, what prediction can you make about these populations after a very long time? For every 100 adults, how many juveniles, and yearlings are there?

ANSWER:

a) 
    If we write ${\mathbf x}_k=\left[\begin{array}{r}J_k \\ Y_k \\ A_k \end{array}\right]$, we have

    $$ {\mathbf x}_{k+1} = \left[\begin{array}{rrr} 0 & 0 & 0.5 \\ 0.9 & 0 & 0 \\ 0.6 & 0.8 & 0 \\ \end{array}\right] {\mathbf x}_k\text{.} $$

b) 
    $\lambda_1 = 0.85$ and $\lambda_{2,3} = -0.43\pm 0.49i$.

c) 
    The populations will eventually become extinct.

d) 
    All the populations grow by $2$%, and there are about $78$ juveniles and $69$ yearlings for every $100$ adults.

SOLUTION:

a) 
    If we write ${\mathbf x}_k=\left[\begin{array}{r}J_k \\ Y_k \\ A_k \end{array}\right]$, we have

    $$ {\mathbf x}_{k+1} = \left[\begin{array}{rrr} 0 & 0 & 0.5 \\ 0.9 & 0 & 0 \\ 0.6 & 0.8 & 0 \\ \end{array}\right] {\mathbf x}_k\text{.} $$

b) 
    We find the eigenvalues $\lambda_1 = 0.85$ and $\lambda_{2,3} = -0.43\pm 0.49i$.

c) 
    All three eigenvalues have a length less than one. Therefore, the populations will eventually become extinct.

d) 
    With a birth rate of $80$%, the first eigenvalue goes up to $\lambda_1=1.02$, which means that, eventually, all the populations grow by $2$%. An eigenvector is approximately ${\mathbf v}_1 = \left[\begin{array}{r}78 \\ 69 \\ 100 \end{array}\right]$ so there are about $78$ juveniles and $69$ yearlings for every $100$ adults.

:::

:::exercise {exercise-4-4-006} number=4.4.6 answered=yes src=src/exercises/exercises4-4.xml:775
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response. In each case, we are considering a dynamical system of the form ${\mathbf x}_{k+1} = A{\mathbf x}_k$.

a) 
    If the $2\times2$ matrix $A$ has a complex eigenvalue, we cannot make a prediction about the behavior of the trajectories.

b) 
    If $A$ has eigenvalues whose absolute value is smaller than 1, then all the trajectories are pulled in toward the origin.

c) 
    If the origin is a repellor, then it is an attractor for the system ${\mathbf x}_{k+1} = A^{-1}{\mathbf x}_k$.

d) 
    If a $4\times4$ matrix has complex eigenvalues $\lambda_1$, $\lambda_2$, $\lambda_3$, and $\lambda_4$, all of which satisfy $|\lambda_j| > 1$, then all the trajectories are pushed away from the origin.

e) 
    If the origin is a saddle, then all the trajectories are pushed away from the origin.

ANSWER:

a) 
    False

b) 
    True

c) 
    True

d) 
    True

e) 
    False

SOLUTION:

a) 
    False. We know that the dynamical system is either a spiral repellor, center, or spiral attractor.

b) 
    True. In this case, we have either an attractor or spiral attractor.

c) 
    True. If $A$ is an attractor, then all the eigenvalues $|\lambda_j| > 1$. The eigenvalues for $A^{-1}$ are $\frac1{\lambda_j}$, which satisfy $\left|\frac1{\lambda_j}\right| < 1$.

d) 
    True. We can decompose ${\mathbb R}^4$ into two two-dimensional subspaces on which $A$ acts as a spiral repellor.

e) 
    False. There are trajectories along the line defined by the eigenvector associated to the smaller eigenvalue that are pulled in toward the origin.

:::

:::exercise {exercise-4-4-007} number=4.4.7 answered=yes src=src/exercises/exercises4-4.xml:840
PROBLEM:
The Fibonacci numbers form the sequence of numbers that begins $0, 1, 1, 2, 3, 5, 8, 13, \ldots$. If we let $F_n$ denote the $n^{th}$ Fibonacci number, then

$$ F_0 =0, F_1 =1, F_2 =1, F_3 =2, F_4 =3,\ldots $$

. In general, a Fibonacci number is the sum of the previous two Fibonacci numbers; that is, $F_{n+2} = F_{n}+F_{n+1}$ so that we have

$$ \begin{aligned} F_{n+2} & {}={} F_{n} + F_{n+1} \\ F_{n+1} & {}={} F_{n+1}\text{.} \\ \end{aligned} $$

a) 
    If we write ${\mathbf x}_n = \left[\begin{array}{r}F_{n+1} \\ F_n \end{array}\right]$, find the matrix $A$ such that ${\mathbf x}_{n+1} = A{\mathbf x}_n$.

b) 
    Show that $A$ has eigenvalues

    $$ \begin{aligned} \lambda_1 & {}={} \frac{1+\sqrt{5}}{2}\approx 1.61803\ldots \\ \lambda_2 & {}={} \frac{1-\sqrt{5}}{2}\approx -0.61803\ldots \\ \end{aligned} $$

    with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}\lambda_1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}\lambda_2 \\ 1 \end{array}\right]$.

c) 
    Classify this dynamical system as one of the six types that we have seen in this section. What happens to ${\mathbf x}_n$ as $n$ becomes very large?

d) 
    Write the initial vector ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ as a linear combination of eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$.

e) 
    Write the vector ${\mathbf x}_n$ as a linear combinations of ${\mathbf v}_1$ and ${\mathbf v}_2$.

f) 
    Explain why the $n^{th}$ Fibonacci number

    $$ F_{n} = \frac{1}{\sqrt{5}}\left[ \left(\frac{1+\sqrt{5}}{2}\right)^n - \left(\frac{1-\sqrt{5}}{2}\right)^n\right]\text{.} $$

g) 
    Use this relationship to compute $F_{20}$.

h) 
    Explain why $F_{n+1}/F_{n}\approx \lambda_1$ when $n$ is very large.

The number $\lambda_1=\frac{1+\sqrt{5}}{2} = \phi$ is called the *golden ratio* and is one of mathematics' special numbers.
ANSWER:

a) 
    $A = \left[\begin{array}{rr} 1 & 1 \\ 1 & 0 \\ \end{array}\right]$

b) 
    Find the roots of the characteristic polynomial.

c) 
    $A$ defines a saddle.

d) 
    ${\mathbf x}_0 = \frac1{\sqrt{5}}{\mathbf v}_1 -\frac1{\sqrt{5}}{\mathbf v}_2$.

e) 
    We have ${\mathbf x}_n = \frac1{\sqrt5}\left(\frac{1+\sqrt5}{2}\right)^n \left[\begin{array}{r}\lambda_1 \\ 1 \end{array}\right] - \frac1{\sqrt5}\left(\frac{1-\sqrt5}{2}\right)^n \left[\begin{array}{r}\lambda_2 \\ 1 \end{array}\right]$.

f) 
    From the second component, we see that

    $$ F_{n} = \frac{1}{\sqrt{5}}\left[ \left(\frac{1+\sqrt{5}}{2}\right)^n - \left(\frac{1-\sqrt{5}}{2}\right)^n\right]\text{.} $$

g) 
    $F_{20} = 6765$

h) 
    For large values of $n$, we have ${\mathbf x}_n\approx\frac1{\sqrt5}\lambda_1^n\left[\begin{array}{r}\lambda_1 \\ 1 \end{array}\right]$.

SOLUTION:

a) 
    We have

    $$ {\mathbf x}_{n+1}=\left[\begin{array}{r}F_{n+2} \\ F_{n+1} \end{array}\right] = \left[\begin{array}{r}F_{n+1}+F_n \\ F_{n+1} \end{array}\right] = \left[\begin{array}{rr} 1 & 1 \\ 1 & 0 \\ \end{array}\right] {\mathbf x}_n\text{.} $$

b) 
    The characteristic equation is

    $$ \det(A-\lambda I) = (1-\lambda)(-\lambda)-1 = \lambda^2-\lambda-1 = 0\text{.} $$

    Applying the quadratic formula, we see that the two eigenvalues are $\lambda_1=\frac{1+\sqrt5}{2}$ and $\lambda_2=\frac{1-\sqrt{5}}2$.

    We find the eigenvectors by row reducing the matrices $A-\lambda_jI$.

c) 
    Because $|\lambda_1| > 1$ and $|\lambda_2| < 1$, this is a saddle.

d) 
    We find ${\mathbf x}_0=\left[\begin{array}{r}1 \\ 0 \end{array}\right] = \frac1{\sqrt{5}}{\mathbf v}_1 -\frac1{\sqrt{5}}{\mathbf v}_2$.

e) 
    We have

    $$ \begin{aligned} {\mathbf x}_n & =\frac1{\sqrt5}\lambda_1^n{\mathbf v}_1 - \frac1{\sqrt5}\lambda_2^n{\mathbf v}_2 \\ \left[\begin{array}{r}F_{n+1} \\ F_n \end{array}\right] & = \frac1{\sqrt5}\left(\frac{1+\sqrt5}{2}\right)^n \left[\begin{array}{r}\lambda_1 \\ 1 \end{array}\right] - \frac1{\sqrt5}\left(\frac{1-\sqrt5}{2}\right)^n \left[\begin{array}{r}\lambda_2 \\ 1 \end{array}\right]\text{.} \\ \end{aligned} $$

f) 
    From the second component, we see that

    $$ F_{n} = \frac{1}{\sqrt{5}}\left[ \left(\frac{1+\sqrt{5}}{2}\right)^n - \left(\frac{1-\sqrt{5}}{2}\right)^n\right]\text{.} $$

g) 
    Using this relationship, we compute that $F_{20} = 6765$.

h) 
    For large values of $n$, we have ${\mathbf x}_n\approx\frac1{\sqrt5}\lambda_1^n\left[\begin{array}{r}\lambda_1 \\ 1 \end{array}\right]$, which says that $F_{n+1} \approx \frac1{\sqrt5}\lambda_1^{n+1}$ and $F_{n} \approx \frac1{\sqrt5}\lambda_1^{n}$. This gives the ratio $F_{n+1}/F_n\approx \lambda_1$.

:::

:::exercise {exercise-4-4-008} number=4.4.8 answered=yes src=src/exercises/exercises4-4.xml:1032
PROBLEM:
This exercise is a continuation of the previous one.
The Lucas numbers $L_n$ are defined by the same relationship as the Fibonacci numbers: $L_{n+2}=L_{n+1}+L_n$. However, we begin with $L_0=2$ and $L_1=1$, which leads to the sequence $2,1,3,4,7,11,\ldots$.

a) 
    As before, form the vector ${\mathbf x}_n=\left[\begin{array}{r}L_{n+1} \\ L_n \end{array}\right]$ so that ${\mathbf x}_{n+1}=A{\mathbf x}_n$. Express ${\mathbf x}_0$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$, eigenvectors of $A$.

b) 
    Explain why

    $$ L_n = \left(\frac{1+\sqrt{5}}{2}\right)^n + \left(\frac{1-\sqrt{5}}{2}\right)^n\text{.} $$

c) 
    Explain why $L_n$ is the closest integer to $\phi^n$ when $n$ is large, where $\phi = \lambda_1$ is the golden ratio.

d) 
    Use this observation to find $L_{20}$.

ANSWER:

a) 
    ${\mathbf x}_0 = {\mathbf v}_1+{\mathbf v}_2$.

b) 
    ${\mathbf x}_n = A^n{\mathbf x}_0 = \lambda_1^n{\mathbf v}_1 + \lambda_2^n{\mathbf v}_2$

c) 
    Because $|\lambda_2| < 1$, larger powers $\lambda_2^n$ are very close to zero.

d) 
    $L_{20} = 15127$.

SOLUTION:

a) 
    Constructing the augmented matrix and row reducing shows that ${\mathbf x}_0 = {\mathbf v}_1+{\mathbf v}_2$.

b) 
    Then we have ${\mathbf x}_n = A^n{\mathbf x}_0 = \lambda_1^n{\mathbf v}_1 + \lambda_2^n{\mathbf v}_2$. Since $L_n$ is the second component of ${\mathbf x}_n$, we have $L_n = \lambda_1^n + \lambda_2^n$.

c) 
    Because $|\lambda_2| < 1$, larger powers $\lambda_2^n$ are very close to zero. Therefore, $L_n\approx \lambda_1^n = \left(\frac{1+\sqrt5}{2}\right)^n$.

d) 
    We compute that $\lambda_1^{20}= 15126.9999$ so that $L_{20} = 15127$.

:::

:::exercise {exercise-4-4-009} number=4.4.9 answered=yes src=src/exercises/exercises4-4.xml:1101
PROBLEM:
Gil Strang defines the *Gibonacci numbers* $G_n$ as follows. We begin with $G_0 = 0$ and $G_1=1$. A subsequent Gibonacci number is the average of the two previous; that is, $G_{n+2} = \frac12(G_{n}+G_{n+1})$. We then have

$$ \begin{aligned} G_{n+2} & {}={} \frac12 G_{n} + \frac 12 G_{n+1} \\ G_{n+1} & {}={} G_{n+1}\text{.} \\ \end{aligned} $$

a) 
    If ${\mathbf x}_n=\left[\begin{array}{r}G_{n+1} \\ G_n \end{array}\right]$, find the matrix $A$ such that ${\mathbf x}_{n+1} = A{\mathbf x}_n$.

b) 
    Find the eigenvalues and associated eigenvectors of $A$.

c) 
    Explain why this dynamical system does not neatly fit into one of the six types that we saw in this section.

d) 
    Write ${\mathbf x}_{0}$ as a linear combination of eigenvectors of $A$.

e) 
    Write ${\mathbf x}_n$ as a linear combination of eigenvectors of $A$.

f) 
    What happens to $G_n$ as $n$ becomes very large?

ANSWER:

a) 
    $A=\left[\begin{array}{rr}\frac12 \amp \frac12 \\ 1 \amp 0 \\ \end{array}\right]$

b) 
    The eigenvalues are $\lambda_1=1$ and $\lambda_2=-\frac12$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}1 \\ -2 \end{array}\right]$.

c) 
    We have one eigenvalue $|\lambda_1| = 1$, which means this system does not fall into any of our cases.

d) 
    ${\mathbf x}_0 = \frac23{\mathbf v}_1 + \frac13{\mathbf v}_2$

e) 
    ${\mathbf x}_n=\frac23{\mathbf v}_1+ \frac13\left(-\frac12\right)^n{\mathbf v}_n$

f) 
    $G_n$ stabilizes at $\frac23$.

SOLUTION:

a) 
    If $A=\left[\begin{array}{rr}\frac12 \amp \frac12 \\ 1 \amp 0 \\ \end{array}\right]$, then we have ${\mathbf x}_{n+1} = A{\mathbf x}_n$.

b) 
    The eigenvalues are $\lambda_1=1$ and $\lambda_2=-\frac12$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}1 \\ -2 \end{array}\right]$.

c) 
    We have one eigenvalue $|\lambda_1| = 1$, which means this system does not fall into any of our cases.

d) 
    After constructing an augmented matrix and row reducing, we find ${\mathbf x}_0 = \frac23{\mathbf v}_1 + \frac13{\mathbf v}_2$.

e) 
    We have ${\mathbf x}_n=\frac23{\mathbf v}_1+ \frac13\left(-\frac12\right)^n{\mathbf v}_n$.

f) 
    As $n$ becomes large, the coefficient $\left(-\frac12\right)^n$ becomes very small. Therefore, ${\mathbf x}_n\approx \frac23{\mathbf v}_1 = \left[\begin{array}{r}\frac23 \\ \frac23 \end{array}\right]$. This shows that $G_n$ stabilizes at $\frac23$.

:::

:::exercise {exercise-4-4-010} number=4.4.10 answered=yes src=src/exercises/exercises4-4.xml:1195
PROBLEM:
Consider a small rodent that lives for three years. Once again, we can separate a population of females into juveniles, yearlings, and adults. Suppose that, each year,

- 
    Half of the juveniles live to be yearlings.

- 
    One quarter of the yearlings live to be adults.

- 
    Adult females produce eight female offspring.

- 
    None of the adults survive to the next year.

a) 
    Writing the populations of juveniles, yearlings, and adults in year $k$ using the vector ${\mathbf x}_k=\left[\begin{array}{r}J_k \\ Y_k \\ A_k \end{array}\right]$, find the matrix $A$ such that ${\mathbf x}_{k+1} = A{\mathbf x}_k$.

b) 
    Show that $A^3=I$.

c) 
    What are the eigenvalues of $A^3$? What does this say about the eigenvalues of $A$?

d) 
    Verify your observation by finding the eigenvalues of $A$.

    :::sage
    ```sage

    ```
    :::

e) 
    What can you say about the trajectories of this dynamical system?

f) 
    What does this mean about the population of rodents?

g) 
    Find a population vector ${\mathbf x}_0$ that is unchanged from year to year.

ANSWER:

a) 
    $A= \left[\begin{array}{rrr} 0 & 0 & 8 \\ \frac 12 & 0 & 0 \\ 0 & \frac 14 & 0 \\ \end{array}\right]$.

b) 
    We can use Sage to compute that $A^3=I$.

c) 
    Any eigenvalue $\lambda$ of $A$ must satisfy $\lambda^3=1$.

d) 
    $\lambda_1=1$ and $\lambda_{2,3} = -\frac12\pm\frac{\sqrt3}{2}i$

e) 
    The trajectories lie on circles about the line defined by $\left[\begin{array}{r}8 \\ 4 \\ 1 \end{array}\right]$.

f) 
    After every three years, the populations return to their initial values.

g) 
    ${\mathbf x}_0={\mathbf v}_1 = \left[\begin{array}{r}8 \\ 4 \\ 1 \end{array}\right]$

SOLUTION:

a) 
    We have ${\mathbf x}_{k+1} = A{\mathbf x}_k$ where $A = \left[\begin{array}{rrr} 0 & 0 & 8 \\ \frac 12 & 0 & 0 \\ 0 & \frac 14 & 0 \\ \end{array}\right]$.

b) 
    We can use Sage to compute that $A^3=I$.

c) 
    The only eigenvalues of $I$ are $1$ so any eigenvalue $\lambda$ of $A$ must satisfy $\lambda^3=1$.

d) 
    Sage tells us that the eigenvalues are $\lambda_1=1$ and $\lambda_{2,3} = -\frac12\pm\frac{\sqrt3}{2}i$.

e) 
    The eigenvector ${\mathbf v}_1=\left[\begin{array}{r}8 \\ 4 \\ 1 \end{array}\right]$ satisfies $A{\mathbf v}_1 = {\mathbf v}_1$ so it is unchanged. The complex eigenvalues cause a $120^\circ$ rotation about the axis defined by ${\mathbf v}_1$. Therefore, the trajectories lie on circles about this line.

f) 
    After every three years, the populations return to their initial values.

g) 
    If ${\mathbf x}_0={\mathbf v}_1 = \left[\begin{array}{r}8 \\ 4 \\ 1 \end{array}\right]$, we know that $A{\mathbf x}_0 = {\mathbf x}_0$ so this population vector is unchanged.

:::
