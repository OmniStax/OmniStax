# 2.1 Vectors and linear combinations {sec-vectors-lin-combs}

It is a remarkable fact that algebra, which is about symbolic equations and their solutions, and geometry are intimately connected. For instance, the solution set of a linear equation in two unknowns, such as $2x + y = 1$, can be represented graphically by a straight line. The aim of this section is to further this connection by introducing vectors, which will help us to apply geometric intuition to our thinking about linear systems.

## 2.1.1 Vectors

{index-entry:vector} A *vector* is most simply thought of as a matrix with a single column. For instance, ${\mathbf v} = \left[ \begin{array}{r} 2 \\ 1 \\ \end{array} \right]$ and ${\mathbf w} = \left[ \begin{array}{r} -3 \\ 1 \\ 0 \\ 2 \\ \end{array} \right]$ are both vectors. The entries in a vector are called its components. Since the vector ${\mathbf v}$ has two components, we say that it is a two-dimensional vector; in the same way, the vector ${\mathbf w}$ is a four-dimensional vector.

We denote the set of all $m$-dimensional vectors by ${\mathbb R}^m$. Consequently, if ${\mathbf u}$ is a 3-dimensional vector, we say that ${\mathbf u}$ is in ${\mathbb R}^3$.

While it can be difficult to visualize a four-dimensional vector, we can draw a simple picture describing the two-dimensional vector ${\mathbf v}$, as shown in [Figure 2.1.1](ref:fig-vector).

> FIGURE {fig:fig-vector} number=2.1.1 src=../../media/ch02/vector-u.svg
> alt: An arrow representing a vector in the plane.
> width: 50%
> caption: A graphical representation of the vector ${\mathbf v} = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$.

We can think of ${\mathbf v}$ as describing a walk in the plane where we move two units horizontally and one unit vertically. Though we allow ourselves to begin walking from any point in the plane, we will most frequently begin at the origin in which case we arrive at the the point $(2,1)$, as shown in the figure.

There are two simple algebraic operations we often perform on vectors.

- **Scalar Multiplication**: {index-entry:scalar multiplication}

    We multiply a vector ${\mathbf v}$ by a real number $c$ by multiplying each of the components of ${\mathbf v}$ by $c$. For instance,

    $$ -3\left[\begin{array}{r} 2 \\ -4 \\ 1 \\ \end{array}\right] = \left[\begin{array}{r} -6 \\ 12 \\ -3 \\ \end{array}\right]. $$

    We will frequently refer to real numbers, such as -3 in this example, as *scalars* to distinguish them from vectors.

- **Vector Addition**: {index-entry:vector addition}

    We add two vectors of the same dimension by adding their components. For instance,

    $$ \left[\begin{array}{r} 2 \\ -4 \\ 3 \\ \end{array}\right] + \left[\begin{array}{r} -5 \\ 6 \\ -3 \\ \end{array}\right] = \left[\begin{array}{r} -3 \\ 2 \\ 0 \\ \end{array}\right]. $$

:::exploration {act:preview-2-1-1} Preview Activity 2.1.1 (Scalar Multiplication and Vector Addition)
Suppose that

$$ {\mathbf v} = \left[\begin{array}{r} 3 \\ 1 \end{array} \right], {\mathbf w} = \left[\begin{array}{r} -1 \\ 2 \end{array} \right]. $$

PROBLEM:
a) Find expressions for the vectors

    $$ \begin{array}{cccc} {\mathbf v}, & 2{\mathbf v}, & -{\mathbf v}, & -2{\mathbf v}, \\ {\mathbf w}, & 2{\mathbf w}, & -{\mathbf w}, & -2{\mathbf w}\text{.} \\ \end{array} $$

    and sketch them using [Figure 2.1.2](ref:fig-activity-2-1-1).
    > FIGURE {fig:fig-activity-2-1-1} number=2.1.2 src=../../media/ch02/empty-6.svg
    > alt: A coordinate grid and axes for sketching vectors.
    > width: 50%
    > caption: Sketch the vectors on this grid.
b) What geometric effect does scalar multiplication have on a vector? Also, describe the effect that multiplying by a negative scalar has.
c) Sketch the vectors ${\mathbf v}, {\mathbf w}, {\mathbf v} + {\mathbf w}$ using [Figure 2.1.3](ref:fig-activity-2-1-2).
    > FIGURE {fig:fig-activity-2-1-2} number=2.1.3 src=../../media/ch02/empty-6.svg
    > alt: A coordinate grid and axes for sketching vectors.
    > width: 50%
    > caption: Sketch the vectors on this grid.
d) Consider vectors that have the form ${\mathbf v} + c{\mathbf w}$ where $c$ is any scalar. Sketch a few of these vectors when, say, $c = -2, -1, 0, 1,$ and $2$. Give a geometric description of this set of vectors.
    > FIGURE {fig:fig-activity-2-1-3} number=2.1.4 src=../../media/ch02/empty-6.svg
    > alt: A coordinate grid and axes for sketching vectors.
    > width: 50%
    > caption: Sketch the vectors on this grid.
e) If $c$ and $d$ are two scalars, then the vector

    $$ c {\mathbf v} + d {\mathbf w} $$

    is called a *linear combination* of the vectors ${\mathbf v}$ and ${\mathbf w}$. Find the vector that is the linear combination when $c = -2$ and $d = 1$.
f) Can the vector $\left[\begin{array}{r} -31 \\ 37 \end{array}\right]$ be represented as a linear combination of ${\mathbf v}$ and ${\mathbf w}$? Asked differently, can we find scalars $c$ and $d$ such that $c{\mathbf v}+d{\mathbf w} = \left[\begin{array}{r}-31 \\ 37 \end{array}\right]$.
SOLUTION:
a) Solutions to this preview activity are given in the text below.
:::

The preview activity demonstrates how we may interpret scalar multiplication and vector addition geometrically.

First, we see that scalar multiplication has the effect of stretching or compressing a vector. Multiplying by a negative scalar changes the direction of the vector. In either case, [Figure 2.1.5](ref:fig-scalar-mult) shows that a scalar multiple of a vector ${\mathbf v}$ lies on the same line defined by ${\mathbf v}$.

> FIGURE {fig:fig-scalar-mult} number=2.1.5 src=../../media/ch02/scalar-mult.svg
> alt: A vector and several scalar multiples all of which lie on the same line
> width: 50%
> caption: Scalar multiples of the vector ${\mathbf v}=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$.

To represent the sum ${\mathbf v} + {\mathbf w}$, we imagine walking from the origin with the appropriate horizontal and vertical changes given by ${\mathbf v}$. From there, we continue our walk using the horizontal and vertical changes prescribed by ${\mathbf w}$, after which we arrive at the sum ${\mathbf v} + {\mathbf w}$. This is illustrated on the left of [Figure 2.1.6](ref:fig-vector-sum) where the tail of ${\mathbf w}$ is placed on the tip of ${\mathbf v}$.

> FIGURE {fig:fig-vector-sum} number=2.1.6 src=../../media/ch02/vector-addition-a.svg
> alt: Two vectors and their vector sum
> caption: Vector addition as a simple walk in the plane is illustrated on the left. The vector sum is represented as the diagonal of a parallelogram on the right.
> subfigure src=../../media/ch02/vector-addition-a.svg alt: Two vectors and their vector sum
> subfigure src=../../media/ch02/vector-addition-b.svg alt: A parallelogram formed by two vectors with their sum drawn as a diagonal.

Alternatively, we may construct the parallelogram with ${\mathbf v}$ and ${\mathbf w}$ as two sides. The sum is then the diagonal of the parallelogram, as illustrated on the right of [Figure 2.1.6](ref:fig-vector-sum).

We have now seen that the set of vectors having the form $c{\mathbf v}$ is a line. To form the set of vectors $c{\mathbf v}+{\mathbf w}$, we can begin with the vector ${\mathbf w}$ and add multiples of ${\mathbf v}$. Geometrically, this means that we begin from the tip of ${\mathbf w}$ and move in a direction parallel to ${\mathbf v}$. The effect is to translate the line $c{\mathbf v}$ by the vector ${\mathbf w}$, as shown in [Figure 2.1.7](ref:fig-parametric-line).

> FIGURE {fig:fig-parametric-line} number=2.1.7 src=../../media/ch02/line-param.svg
> alt: Representations of vectors obtained by multiplying one vector by scalars and adding to another vector.
> width: 50%
> caption: The set of vectors $c{\mathbf v} + {\mathbf w}$ form a line.

At times, it will be useful for us to think of vectors and points interchangeably. That is, we may wish to think of the vector $\left[\begin{array}{r} 2 \\ 1 \end{array}\right]$ as describing the point $(2,1)$ and vice-versa. When we say that the vectors having the form $c{\mathbf v} + {\mathbf w}$ form a line, we really mean that the tips of the vectors all lie on the line passing through ${\mathbf w}$ and parallel to ${\mathbf v}$.

:::observation {obs:observation-2-1-8} Observation 2.1.8
Even though these vector operations are new, it is straightforward to check that some familiar properties hold.

- **Commutativity**: 
    ${\mathbf v} + {\mathbf w} = {\mathbf w} + {\mathbf v}$.

- **Distributivity**: 
    $a({\mathbf v} + {\mathbf w}) = a{\mathbf v} + a{\mathbf w}$.

:::

Sage can perform scalar multiplication and vector addition. We define a vector using the `vector` command; then `*` and `+` denote scalar multiplication and vector addition.

:::sage
```sage
	  v = vector([3,1])
	  w = vector([-1,2])
	  print (2*v)
	  print (v + w)

```
:::

## 2.1.2 Linear combinations

Linear combinations, which we encountered in the preview activity, provide the link between vectors and linear systems. In particular, they will help us apply geometric intuition to problems involving linear systems.

:::definition {def:definition-2-1-9} Definition 2.1.9
{index-entry:linear combination} {index-entry:weights} The *linear combination* of the vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ with scalars $c_1,c_2,\ldots,c_n$ is the vector

$$ c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + \ldots + c_n{\mathbf v}_n $$

. The scalars $c_1,c_2,\ldots,c_n$ are called the *weights* of the linear combination.
:::

:::activity {act:activity-2-1-2} Activity 2.1.2
In this activity, we will look at linear combinations of a pair of vectors, ${\mathbf v} = \left[\begin{array}{r} 2 \\ 1 \end{array}\right]$ and ${\mathbf w} = \left[\begin{array}{r} 1 \\ 2 \end{array}\right]$.
> FIGURE {fig:js-linear-combs} number=2.1.10 src=../../media/ch02/linearcomb-preview.png
> alt: 
> caption: Linear combinations of vectors ${\mathbf v}$ and ${\mathbf w}$.

a) 
    The weight $d$ is initially set to 0. Explain what happens as you vary $c$ while keeping $d=0$. How is this related to scalar multiplication?

b) 
    What is the linear combination of ${\mathbf v}$ and ${\mathbf w}$ when $c = 1$ and $d=-2$? You may find this result using the diagram, but you should also verify it by computing the linear combination.

c) 
    Describe the vectors that arise when the weight $d$ is set to 1 and $c$ is varied. How is this related to our investigations in the preview activity?

d) 
    Can the vector $\left[\begin{array}{r} 0 \\ 0 \end{array} \right]$ be expressed as a linear combination of ${\mathbf v}$ and ${\mathbf w}$? If so, what are the weights $c$ and $d$?

e) 
    Can the vector $\left[\begin{array}{r} 3 \\ 0 \end{array} \right]$ be expressed as a linear combination of ${\mathbf v}$ and ${\mathbf w}$? If so, what are the weights $c$ and $d$?

f) 
    Verify the result from the previous part by algebraically finding the weights $c$ and $d$ that form the linear combination $\left[\begin{array}{r} 3 \\ 0 \end{array} \right]$.

g) 
    Can the vector $\left[\begin{array}{r} 1.3 \\ -1.7 \end{array} \right]$ be expressed as a linear combination of ${\mathbf v}$ and ${\mathbf w}$? What about the vector $\left[\begin{array}{r} 15.2 \\ 7.1 \end{array} \right]$?

h) 
    Are there any two-dimensional vectors that cannot be expressed as linear combinations of ${\mathbf v}$ and ${\mathbf w}$?

ANSWER:

a) 
    The linear combinations lie on the line defined by ${\mathbf v}$.

b) 
    $\left[\begin{array}{r}0 \\ -3 \end{array}\right]$.

c) 
    They lie on the line through ${\mathbf w}$ parallel to ${\mathbf v}$.

d) 
    Yes, with weights $c=d=0$.

e) 
    Yes, with weights $c=2$ and $d=-1$.

f) 
    This can be done by writing the appropriate linear system for the weights.

g) 
    No, any two-dimensional vector can be expressed as a linear combination of ${\mathbf v}$ and ${\mathbf w}$.

SOLUTION:

a) 
    When we vary $c$ with $d=0$, the linear combination moves along the line defined by ${\mathbf v}$.

b) 
    When $c=1$ and $d=-2$, we find

    $$ 1{\mathbf v} -2 {\mathbf w} = \left[\begin{array}{r}0 \\ -3 \end{array}\right]\text{.} $$

c) 
    When $d=1$ and $c$ is allowed to vary, the linear combinations lie on the line through ${\mathbf w}$ parallel to ${\mathbf v}$.

d) 
    If the weights $c=0$ and $d=0$, then the linear combination is the vector $\left[\begin{array}{r}0 \\ 0 \end{array}\right]$.

e) 
    If the weights $c=2$ and $d=-1$, then the linear combination is the vector $\left[\begin{array}{r}3 \\ 0 \end{array}\right]$.

f) 
    We find the linear system for the weights:

    $$ \begin{alignedat}{3} 2c & {}+{} & 1d & {}={} & 3 \\ 1c & {}+{} & 2d & {}={} & 0 \\ \end{alignedat} $$

    If we construct the corresponding augmented matrix and determine its reduced row echelon matrix, we find the weights $c=2$ and $d=-1$.

g) 
    In the same way, we construct a linear system for the weights whose augmented matrix is

    $$ \left[\begin{array}{rr|r} 2 & 1 & 1.3 \\ 1 & 2 & -1.7 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 1.43 \\ 0 & 1 & -1.57 \\ \end{array}\right] \text{,} $$

    which shows that there are weights that produce the desired linear combination. The same will happen for any vector ${\mathbf b}$ that we ask to write as a linear combination of ${\mathbf v}$ and ${\mathbf w}$.

h) 
    Every two-dimensional vector can be written as a linear combination of ${\mathbf v}$ and ${\mathbf w}$ because the coefficient matrix of the linear system remains the same. Since that coefficient matrix has a pivot position in every row, the augmented matrix can never have a pivot position in the rightmost column.

:::

This activity illustrates how linear combinations are constructed geometrically: the linear combination $c{\mathbf v} + d{\mathbf w}$ is found by walking along ${\mathbf v}$ a total of $c$ times followed by walking along ${\mathbf w}$ a total of $d$ times. When one of the weights is held constant while the other varies, the vector moves along a line.

:::example {ex:example-2-1-11} Example 2.1.11
The previous activity also shows that questions about linear combinations lead naturally to linear systems. Suppose we have vectors ${\mathbf v} = \left[\begin{array}{r}3 \\ -1 \end{array}\right]$ and ${\mathbf w}=\left[\begin{array}{r}4 \\ 3 \end{array}\right]$. Let's determine whether we can describe the vector ${\mathbf b}=\left[\begin{array}{r}-11 \\ -18 \end{array}\right]$ as a linear combination of ${\mathbf v}$ and ${\mathbf w}$. In other words, we would like to know whether there are weights $c$ and $d$ such that

$$ c{\mathbf v} + d{\mathbf w}= {\mathbf b}. $$

This leads to the equations

$$ \begin{aligned} c\left[\begin{array}{r}3 \\ -1 \end{array}\right] + d\left[\begin{array}{r}4 \\ 3 \end{array}\right] & = \left[\begin{array}{r}-11 \\ -18 \end{array}\right] \\ \\ \left[\begin{array}{r}3c \\ -c \end{array}\right] + \left[\begin{array}{r}4d \\ 3d \end{array}\right] & = \left[\begin{array}{r}-11 \\ -18 \end{array}\right] \\ \\ \left[\begin{array}{r}3c+4d \\ -c+3d \end{array}\right] & = \left[\begin{array}{r}-11 \\ -18 \end{array}\right] \\ \\ \end{aligned} $$

Equating the components of the vectors on each side of the equation, we arrive at the linear system

$$ \begin{alignedat}{3} 3c & {}+{} & 4d & {}={} & -11 \\ -c & {}+{} & 3d & {}={} & -18 \ \end{alignedat} $$

This means that ${\mathbf b}$ is a linear combination of ${\mathbf v}$ and ${\mathbf w}$ if this linear system is consistent.
To solve this linear system, we construct its corresponding augmented matrix and find its reduced row echelon form,

$$ \left[ \begin{array}{rr|r} 3 & 4 & -11 \\ -1 & 3 & -18 \end{array} \right] \sim \left[ \begin{array}{rr|r} 1 & 0 & 3 \\ 0 & 1 & -5 \end{array} \right], $$

giving us the weights $c=3$ and $d=-5$; that is,

$$ 3{\mathbf v} -5 {\mathbf w} = {\mathbf b} $$

. In fact, we know more because the reduced row echelon matrix tells us that these are the only possible weights. Therefore, ${\mathbf b}$ may be expressed as a linear combination of ${\mathbf v}$ and ${\mathbf w}$ in exactly one way.
:::

This example demonstrates the connection between linear combinations and linear systems. Asking whether a vector ${\mathbf b}$ is a linear combination of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is equivalent to asking whether an associated linear system is consistent.

In fact, we may easily describe the associated linear system in terms of the vectors ${\mathbf v}$, ${\mathbf w}$, and ${\mathbf b}$. Notice that the augmented matrix we found in our example was $\left[ \begin{array}{rr|r} 3 & 4 & -11 \\ -1 & 3 & -18 \end{array} \right].$ The first two columns of this matrix are ${\mathbf v}$ and ${\mathbf w}$ and the rightmost column is ${\mathbf b}$. As shorthand, we will write this augmented matrix replacing the columns with their vector representation:

$$ \left[ \begin{array}{rr|r} {\mathbf v} & {\mathbf w} & {\mathbf b} \end{array} \right] $$

. This fact is generally true so we record it in the following proposition.

:::proposition {prop:prop-system-comb} Proposition 2.1.12
The vector ${\mathbf b}$ is a linear combination of the vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ if and only if the linear system corresponding to the augmented matrix

$$ \left[ \begin{array}{rrrr|r} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n & {\mathbf b} \end{array} \right] $$

is consistent. A solution to this linear system gives weights $c_1,c_2,\ldots,c_n$ such that

$$ c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + \ldots + c_n{\mathbf v}_n = {\mathbf b} $$

.
:::

The next activity puts this proposition to use.

:::activity {act:activity-2-1-3} Activity 2.1.3 (Linear combinations and linear systems)

a) 
    Given the vectors

    $$ {\mathbf v}_1 = \left[\begin{array}{r} 4 \\ 0 \\ 2 \\ 1 \end{array} \right], {\mathbf v}_2 = \left[\begin{array}{r} 1 \\ -3 \\ 3 \\ 1 \end{array} \right], {\mathbf v}_3 = \left[\begin{array}{r} -2 \\ 1 \\ 1 \\ 0 \end{array} \right], {\mathbf b} = \left[\begin{array}{r} 0 \\ 1 \\ 2 \\ -2 \end{array} \right] $$

    , can ${\mathbf b}$ be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$? Rephrase this question by writing a linear system for the weights $c_1$, $c_2$, and $c_3$ and use the Sage cell below to answer this question.

    :::sage
    ```sage

    ```
    :::

b) 
    Consider the following linear system.

    $$ \begin{alignedat}{4} 3x_1 & {}+{} & 2x_2 & {}-{} x_3 & {}={} & 4 \\ x_1 & & & {}+{} 2x_3 & {}={} & 0 \\ -x_1 & {}-{} & x_2 & {}+{} 3x_3 & {}={} & 1 \\ \end{alignedat} $$

    Identify vectors ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_3$, and ${\mathbf b}$ such that the question "Is this linear system consistent?" is equivalent to the question "Can ${\mathbf b}$ be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$?"

c) 
    Consider the vectors

    $$ {\mathbf v}_1 = \left[\begin{array}{r} 0 \\ -2 \\ 1 \\ \end{array} \right], {\mathbf v}_2 = \left[\begin{array}{r} 1 \\ 1 \\ -1 \\ \end{array} \right], {\mathbf v}_3 = \left[\begin{array}{r} 2 \\ 0 \\ -1 \\ \end{array} \right], {\mathbf b} = \left[\begin{array}{r} -1 \\ 3 \\ -1 \\ \end{array} \right] $$

    . Can ${\mathbf b}$ be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$? If so, can ${\mathbf b}$ be written as a linear combination of these vectors in more than one way?

    :::sage
    ```sage

    ```
    :::

d) 
    Considering the vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ from the previous part, can we write every three-dimensional vector ${\mathbf b}$ as a linear combination of these vectors? Explain how the pivot positions of the matrix $\left[\begin{array}{rrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array} \right]$ help answer this question.

e) 
    Now consider the vectors

    $$ {\mathbf v}_1 = \left[\begin{array}{r} 0 \\ -2 \\ 1 \\ \end{array} \right], {\mathbf v}_2 = \left[\begin{array}{r} 1 \\ 1 \\ -1 \\ \end{array} \right], {\mathbf v}_3 = \left[\begin{array}{r} 1 \\ -1 \\ -2 \\ \end{array} \right], {\mathbf b} = \left[\begin{array}{r} 0 \\ 8 \\ -4 \\ \end{array} \right] $$

    . Can ${\mathbf b}$ be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$? If so, can ${\mathbf b}$ be written as a linear combination of these vectors in more than one way?

    :::sage
    ```sage

    ```
    :::

f) 
    Considering the vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ from the previous part, can we write every three-dimensional vector ${\mathbf b}$ as a linear combination of these vectors? Explain how the pivot positions of the matrix $\left[\begin{array}{rrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array} \right]$ help answer this question.

ANSWER:

a) 
    The vector ${\mathbf b}$ cannot be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.

b) 
    We find vectors

    $$ {\mathbf v}_1=\left[\begin{array}{r}3 \\ 1 \\ -1 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}2 \\ 0 \\ -1 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}-1 \\ 2 \\ 3 \end{array}\right], {\mathbf b}=\left[\begin{array}{r}4 \\ 0 \\ 1 \end{array}\right]\text{.} $$

c) 
    Yes, ${\mathbf b}$ can be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ in infinitely many ways.

d) 
    No.

e) 
    Yes, ${\mathbf b}$ can be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ in exactly one way.

f) 
    Any vector ${\mathbf b}$ can be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ in exactly one way.

SOLUTION:

a) 
    We find the linear system

    $$ \begin{alignedat}{4} 4c_1 & {}+{} & c_2 & {}-{} & 2c_3 & {}={} & 0 \\ & & -3c_2 & {}+{} & c_3 & {}={} & 1 \\ 2c_1 & {}+{} & 3c_2 & {}+{} & c_3 & {}={} & 2 \\ c_1 & {}+{} & c_2 & & & {}={} & -2 \\ \end{alignedat} $$

    with corresponding augmented matrix

    $$ \left[\begin{array}{rrr|r} 4 & 1 & -2 & 0 \\ 0 & -3 & 1 & 1 \\ 2 & 3 & 1 & 2 \\ 1 & 1 & 0 & -2 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{array}\right]\text{.} $$

    This shows that the linear system is inconsistent so there are no such weights $c_1$, $c_2$, and $c_3$. This means that ${\mathbf b}$ is not a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.

b) 
    We find vectors

    $$ {\mathbf v}_1=\left[\begin{array}{r}3 \\ 1 \\ -1 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}2 \\ 0 \\ -1 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}-1 \\ 2 \\ 3 \end{array}\right], {\mathbf b}=\left[\begin{array}{r}4 \\ 0 \\ 1 \end{array}\right]\text{.} $$

c) 
    This is the same as asking if the linear system corresponding to the following augmented matrix is consistent:

    $$ \left[\begin{array}{rrr|r} 0 & 1 & 2 & -1 \\ -2 & 1 & 0 & 3 \\ 1 & -1 & -1 & -1 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 1 & -2 \\ 0 & 1 & 2 & -1 \\ 0 & 0 & 0 & 0 \end{array}\right]\text{.} $$

    From the reduced row echelon form, we see that the system is consistent, which means that ${\mathbf b}$ can be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$. Moreover, there are infinitely many ways in which we can do so.

d) 
    No, it is not possible to write every three-dimensional ${\mathbf b}$ as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ because the matrix $\left[\begin{array}{rrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right]$ does not have a pivot position in every row. This means that, with some choice of vector ${\mathbf b}$, we will obtain an inconsistent system.

e) 
    We find the augmented matrix

    $$ \left[\begin{array}{rrr|r} 0 & 1 & 1 & 0 \\ -2 & 1 & -1 & 8 \\ 1 & -1 & -2 & -4 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 0 & -4 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \end{array}\right]\text{.} $$

    This shows that ${\mathbf b}$ can be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ in exactly one way.

f) 
    Every vector ${\mathbf b}$ can be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ in exactly one way because $\left[\begin{array}{rrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right]$ has a pivot position in every row and every column.

:::

:::example {ex:example-2-1-13} Example 2.1.13
Consider the vectors ${\mathbf v}=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ and ${\mathbf w}=\left[\begin{array}{r}2 \\ -2 \end{array}\right]$, as shown in [Figure 2.1.14](ref:fig-lin-comb-ex).
> FIGURE {fig:fig-lin-comb-ex} number=2.1.14 src=../../media/ch02/lin-comb-ex.svg
> alt: Two vectors that lie on the same line.
> width: 50%
> caption: Vectors ${\mathbf v}$ and ${\mathbf w}$.
These vectors appear to lie on the same line, a fact that becomes apparent once we notice that ${\mathbf w} = -2{\mathbf v}$. Intuitively, we think of the linear combination

$$ c{\mathbf v} + d{\mathbf w} $$

as the result of walking $c$ times in the ${\mathbf v}$ direction and $d$ times in the ${\mathbf w}$ direction. With these vectors, we are always walking along the same line so it would seem that any linear combination of these vectors should lie on the same line. In addition, a vector that is not on the line, say ${\mathbf b} = \left[\begin{array}{r}3 \\ 0 \end{array}\right]$, should be not be expressible as a linear combination of ${\mathbf v}$ and ${\mathbf w}$.
We can verify this by checking

$$ \left[ \begin{array}{rr|r} -1 & 2 & 3 \\ 1 & -2 & 0 \\ \end{array} \right] \sim \left[ \begin{array}{rr|r} 1 & -2 & 0 \\ 0 & 0 & 1 \\ \end{array} \right]. $$

This shows that the associated linear system is inconsistent, which means that the vector ${\mathbf b}=\left[\begin{array}{r}3 \\ 0 \end{array}\right]$ cannot be written as a linear combination of ${\mathbf v}$ and ${\mathbf w}$.
Notice that the reduced row echelon form of the coefficient matrix

$$ \begin{bmatrix} {\mathbf v} & {\mathbf w} \\ \end{bmatrix} = \begin{bmatrix} -1 & 2 \\ 1 & -2 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & -2 \\ 0 & 0 \\ \end{bmatrix} $$

tells us to expect this. Since there is not a pivot position in the second row of the coefficient matrix $\begin{bmatrix}{\mathbf v} & {\mathbf w} \end{bmatrix}$, it is possible for a pivot position to appear in the rightmost column of the augmented matrix

$$ \left[ \begin{array}{rr|r} {\mathbf v} & {\mathbf w} & {\mathbf b} \end{array} \right] $$

for some choice of ${\mathbf b}$.
:::

## 2.1.3 Summary

This section has introduced vectors, linear combinations, and their connection to linear systems.

- 
    There are two operations we can perform with vectors: scalar multiplication and vector addition. Both of these operations have geometric meaning.

- 
    Given a set of vectors and a set of scalars we call weights, we can create a linear combination using scalar multiplication and vector addition.

- 
    A solution to the linear system whose augmented matrix is

    $$ \left[\begin{array}{rrrr|r} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n & {\mathbf b} \end{array}\right] $$

    is a set of weights that expresses ${\mathbf b}$ as a linear combination of ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$.

## 2.1.4 Exercises

:::exercise {exercise-2-1-001} number=2.1.1 answered=yes src=src/exercises/exercises2-1.xml:4
PROBLEM:
Consider the vectors

$$ {\mathbf v} = \left[\begin{array}{r} 1 \\ -1 \end{array}\right], {\mathbf w} = \left[\begin{array}{r} 3 \\ 1 \end{array}\right] $$

a) 
    Sketch these vectors below.

    > FIGURE {fig:fig-2-1-15} number=2.1.15 src=../../media/ch02/empty-6.svg
    > alt: A coordinate grid and axes for sketching vectors.
    > width: 50%
    > caption: A coordinate grid and axes for sketching vectors.

b) 
    Compute the vectors $-3{\mathbf v}$, $2{\mathbf w}$, ${\mathbf v} + {\mathbf w}$, and ${\mathbf v} - {\mathbf w}$ and add them into the sketch above.

c) 
    Sketch below the set of vectors having the form $2{\mathbf v} + c{\mathbf w}$ where $c$ is any scalar.

    > FIGURE {fig:fig-2-1-16} number=2.1.16 src=../../media/ch02/empty-6.svg
    > alt: A coordinate grid and axes for sketching vectors.
    > width: 50%
    > caption: A coordinate grid and axes for sketching vectors.

d) 
    Sketch below the line $y=3x - 2$. Then identify two vectors ${\mathbf v}$ and ${\mathbf w}$ so that this line is described by ${\mathbf v} + c{\mathbf w}$. Are there other choices for the vectors ${\mathbf v}$ and ${\mathbf w}$?

    > FIGURE {fig:fig-2-1-17} number=2.1.17 src=../../media/ch02/empty-6.svg
    > alt: A coordinate grid and axes for sketching vectors.
    > width: 50%
    > caption: A coordinate grid and axes for sketching vectors.

ANSWER:

a) 
    > IMAGE {img:ex2-1-1-a} src=../../media/ch02/ex2-1-1-a.svg
    > width: 50%

b) 
    > IMAGE {img:ex2-1-1-b} src=../../media/ch02/ex2-1-1-b.svg
    > width: 50%

c) 
    This forms the line passing through $2{\mathbf v}$ parallel to ${\mathbf w}$.

d) 
    There are many possibilities. One is ${\mathbf v}=\left[\begin{array}{r}0 \\ -2 \end{array}\right]$ and ${\mathbf w}=\left[\begin{array}{r}1 \\ 3 \end{array}\right]$.

SOLUTION:

a) 
    > IMAGE {img:ex2-1-1-a} src=../../media/ch02/ex2-1-1-a.svg
    > width: 50%

b) 
    > IMAGE {img:ex2-1-1-b} src=../../media/ch02/ex2-1-1-b.svg
    > width: 50%

c) 
    This forms the line passing through $2{\mathbf v}$ parallel to ${\mathbf w}$.

d) 
    There are many possibilities. One is ${\mathbf v}=\left[\begin{array}{r}0 \\ -2 \end{array}\right]$ and ${\mathbf w}=\left[\begin{array}{r}1 \\ 3 \end{array}\right]$.

:::

:::exercise {exercise-2-1-002} number=2.1.2 answered=yes src=src/exercises/exercises2-1.xml:173
PROBLEM:
Shown below are two vectors ${\mathbf v}$ and ${\mathbf w}$.
> FIGURE {fig:fig-2-1-18} number=2.1.18 src=../../media/ch02/ex-linear-combs-2-1.svg
> alt: Two vectors and the skewed grid of parallel lines they define with a set of points on the grid lines.
> width: 50%
> caption: Two vectors ${\mathbf v}$ and ${\mathbf w}$.

a) 
    Express the labeled points as linear combinations of ${\mathbf v}$ and ${\mathbf w}$.

b) 
    Sketch the line described parametrically as $-2{\mathbf v} + c{\mathbf w}$.

ANSWER:

a) 
    We have

    $$ \begin{array}{lll} p = -{\mathbf v}, & q = 3{\mathbf w}, & r=2{\mathbf v}+3{\mathbf w}, \\ s = 2{\mathbf v}-3{\mathbf w}, & t=-3{\mathbf v}-2{\mathbf w}, & u=-2{\mathbf v}+0.5{\mathbf w}, \\ v = 3.5{\mathbf v}+1.5{\mathbf w}\text{.} \end{array} $$

b) 
    This is the line passing through $-2{\mathbf v}$ parallel to ${\mathbf w}$.

SOLUTION:

a) 
    We have

    $$ \begin{array}{lll} p = -{\mathbf v}, & q = 3{\mathbf w}, & r=2{\mathbf v}+3{\mathbf w}, \\ s = 2{\mathbf v}-3{\mathbf w}, & t=-3{\mathbf v}-2{\mathbf w}, & u=-2{\mathbf v}+0.5{\mathbf w}, \\ v = 3.5{\mathbf v}+1.5{\mathbf w}\text{.} \end{array} $$

b) 
    This is the line passing through $-2{\mathbf v}$ parallel to ${\mathbf w}$.

:::

:::exercise {exercise-2-1-003} number=2.1.3 answered=yes src=src/exercises/exercises2-1.xml:257
PROBLEM:
Consider the vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r} 2 \\ 1 \end{array} \right], {\mathbf v}_2 = \left[\begin{array}{r} -1 \\ 1 \end{array} \right], {\mathbf v}_3 = \left[\begin{array}{r} -2 \\ 0 \end{array} \right] $$

a) 
    Find the linear combination with weights $c_1 = 2$, $c_2=-3$, and $c_3=1$.

b) 
    Can you write the vector ${\mathbf 0} = \left[\begin{array}{r} 0 \\ 0 \end{array}\right]$ as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$? If so, describe all the ways in which you can do so.

    :::sage
    ```sage

    ```
    :::

c) 
    Can you write the vector ${\mathbf 0} = \left[\begin{array}{r} 0 \\ 0 \end{array}\right]$ as a linear combination using just the first two vectors ${\mathbf v}_1$ ${\mathbf v}_2$? If so, describe all the ways in which you can do so.

    :::sage
    ```sage

    ```
    :::

d) 
    Can you write ${\mathbf v}_3$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$? If so, in how many ways?

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    The linear combination

    $$ 2{\mathbf v}_1-3{\mathbf v}_2+{\mathbf v}_3 = \left[\begin{array}{r}5 \\ -1 \end{array}\right]\text{.} $$

b) 
    $c_1 = \frac23 c_3$ and $c_2 = -\frac23 c_3$.

c) 
    $c_1=c_2=0$.

d) 
    ${\mathbf v}_3=-\frac23{\mathbf v}_1 + \frac23{\mathbf v}_2$.

SOLUTION:

a) 
    The linear combination

    $$ 2{\mathbf v}_1-3{\mathbf v}_2+{\mathbf v}_3 = \left[\begin{array}{r}5 \\ -1 \end{array}\right]\text{.} $$

b) 
    The appropriate linear system corresponds to the augmented matrix

    $$ \left[\begin{array}{rrr|r} 2 & -1 & -2 & 0 \\ 1 & 1 & 0 & 0 \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & -\frac{2}{3} & 0 \\ 0 & 1 & \frac{2}{3} & 0 \\ \end{array}\right]\text{.} $$

    This shows we obtain ${\mathbf 0}$ when the weights are chosen so that

    $$ \begin{alignedat}{2} c_1 & {}={} \frac23 c_3 \\ c_2 & {}={} -\frac23 c_3\text{.} \\ \end{alignedat} $$

c) 
    In this case, we want $c_3=0$, which means that $c_1=c_2=0$.

d) 
    We see that ${\mathbf v}_3=-\frac23{\mathbf v}_1 + \frac23{\mathbf v}_2$.

:::

:::exercise {exercise-2-1-004} number=2.1.4 answered=yes src=src/exercises/exercises2-1.xml:369
PROBLEM:
Nutritional information about a breakfast cereal is printed on the box. For instance, one serving of Frosted Flakes has 111 calories, 140 milligrams of sodium, and 1.2 grams of protein. We may represent this as a vector

$$ \left[\begin{array}{r} 111 \\ 140 \\ 1.2 \\ \end{array}\right] $$

. One serving of Cocoa Puffs has 120 calories, 105 milligrams of sodium, and 1.0 grams of protein.
:::sage
```sage

```
:::

a) 
    Write the vector describing the nutritional content of Cocoa Puffs.

b) 
    Suppose you eat $c$ servings of Frosted Flakes and $d$ servings of Cocoa Puffs. Use the language of vectors and linear combinations to express the quantities of calories, sodium, and protein you have consumed.

c) 
    How many servings of each cereal have you eaten if you have consumed 342 calories, 385 milligrams of sodium, and 3.4 grams of protein.

d) 
    Suppose your sister consumed 250 calories, 200 milligrams of sodium, and 4 grams of protein. What can you conclude about her breakfast?

ANSWER:

a) 
    $\left[\begin{array}{r}120 \\ 105 \\ 1.0 \end{array}\right]$.

b) 
    The totals consumed are expressed by the vector

    $$ c\left[\begin{array}{r}111 \\ 140 \\ 1.2 \end{array}\right] + d\left[\begin{array}{r}120 \\ 105 \\ 1.0 \end{array}\right]\text{.} $$

c) 
    You had two servings of Frosted Flakes and one serving of Cocoa Puffs.

d) 
    Your sister must have eaten something else.

SOLUTION:

a) 
    $\left[\begin{array}{r}120 \\ 105 \\ 1.0 \end{array}\right]$.

b) 
    The totals consumed are expressed by the vector

    $$ c\left[\begin{array}{r}111 \\ 140 \\ 1.2 \end{array}\right] + d\left[\begin{array}{r}120 \\ 105 \\ 1.0 \end{array}\right]\text{.} $$

c) 
    We ask to write the vector $\left[\begin{array}{r}342 \\ 385 \\ 3.4 \end{array}\right]$ as a linear combination of the two cereal vectors. This leads to the augmented matrix

    $$ \left[\begin{array}{rr|r} 111 & 120 & 342 \\ 140 & 105 & 385 \\ 1.2 & 1.0 & 3.4 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 2 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

    This means that you had two servings of Frosted Flakes and one serving of Cocoa Puffs.

d) 
    Now the augmented matrix is

    $$ \left[\begin{array}{rr|r} 111 & 120 & 250 \\ 140 & 105 & 200 \\ 1.2 & 1.0 & 4.0 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]\text{,} $$

    which represents an inconsistent system. This means that your sister must have eaten something else.

:::

:::exercise {exercise-2-1-005} number=2.1.5 answered=yes src=src/exercises/exercises2-1.xml:487
PROBLEM:
Consider the vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r} 2 \\ -1 \\ -2 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r} 0 \\ 3 \\ 1 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r} 4 \\ 4 \\ -2 \end{array}\right] $$

.
:::sage
```sage

```
:::

a) 
    Can you express the vector ${\mathbf b}=\left[\begin{array}{r} 10 \\ 1 \\ -8 \end{array}\right]$ as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$? If so, describe all the ways in which you can do so.

b) 
    Can you express the vector ${\mathbf b}=\left[\begin{array}{r} 3 \\ 7 \\ 1 \end{array}\right]$ as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$? If so, describe all the ways in which you can do so.

c) 
    Show that ${\mathbf v}_3$ can be written as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

d) 
    Explain why any linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$,

    $$ a{\mathbf v}_1 + b{\mathbf v}_2 + c{\mathbf v}_3, $$

    can be rewritten as a linear combination of just ${\mathbf v}_1$ and ${\mathbf v}_2$.

ANSWER:

a) 
    The vector ${\mathbf b}$ may be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ provided that the weights are related by $c_1=5-2c_3$ and $c_2=2-2c_3$.

b) 
    The vector ${\mathbf b}$ cannot be written as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.

c) 
    ${\mathbf v}_3=2{\mathbf v}_1+2{\mathbf v}_2$.

d) 
    $a{\mathbf v}_1+b{\mathbf v}_2+c{\mathbf v}_3= (a+2c){\mathbf v}_1+(b+2c){\mathbf v}_2$.

SOLUTION:

a) 
    We have the system corresponding to the augmented matrix

    $$ \left[\begin{array}{rrr|r} 2 & 0 & 4 & 10 \\ -1 & 3 & 4 & 1 \\ -2 & 1 & -2 & -8 \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 2 & 5 \\ 0 & 1 & 2 & 2 \\ 0 & 0 & 0 & 0 \\ \end{array}\right] $$

    from which we conclude that ${\mathbf b}$ may be expressed as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ provided that the weights are related by $c_1=5-2c_3$ and $c_2=2-2c_3$.

b) 
    Here we have

    $$ \left[\begin{array}{rrr|r} 2 & 0 & 4 & 3 \\ -1 & 3 & 4 & 7 \\ -2 & 1 & -2 & 1 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 2 & 0 \\ 0 & 1 & 2 & 0 \\ 0 & 0 & 0 & 1 \end{array}\right]\text{,} $$

    which represents an inconsistent system and shows that ${\mathbf b}$ cannot be written as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.

c) 
    The augmented matrix is

    $$ \left[\begin{array}{rr|r} 2 & 0 & 4 \\ -1 & 3 & 4 \\ -2 & 1 & -2 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 2 \\ 0 & 1 & 2 \\ 0 & 0 & 0 \\ \end{array}\right]\text{,} $$

    which shows that ${\mathbf v}_3=2{\mathbf v}_1+2{\mathbf v}_2$.

d) 
    $a{\mathbf v}_1+b{\mathbf v}_2+c{\mathbf v}_3=a{\mathbf v}_1+b{\mathbf v}_2 + c(2{\mathbf v}_1+2{\mathbf v}_2) = (a+2c){\mathbf v}_1+(b+2c){\mathbf v}_2$.

:::

:::exercise {exercise-2-1-006} number=2.1.6 answered=yes src=src/exercises/exercises2-1.xml:629
PROBLEM:
Consider the vectors

$$ {\mathbf v}_1=\left[\begin{array}{r} 3 \\ -1 \\ 1 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r} 1 \\ 1 \\ 2 \end{array}\right]. $$

For what value(s) of $k$, if any, can the vector $\left[\begin{array}{r} k \\ -2 \\ 5 \end{array}\right]$ be written as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$?
ANSWER:
$k=10$.
SOLUTION:
We form the augmented matrix and find a triangular matrix that is row equivalent:

$$ \left[\begin{array}{rr|r} 3 & 1 & k \\ -1 & 1 & -2 \\ 1 & 2 & 5 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} -1 & 1 & -2 \\ 0 & 1 & 1 \\ 0 & 0 & k-10 \\ \end{array}\right]\text{.} $$

This represents a consistent system when $k=10$.
:::

:::exercise {exercise-2-1-007} number=2.1.7 answered=yes src=src/exercises/exercises2-1.xml:670
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response.

a) 
    Given two vectors ${\mathbf v}$ and ${\mathbf w}$, the vector $2{\mathbf v}$ is a linear combination of ${\mathbf v}$ and ${\mathbf w}$.

b) 
    Suppose ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is a collection of $m$-dimensional vectors and that the matrix $\left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n \end{array}\right]$ has a pivot position in every row. If ${\mathbf b}$ is any $m$-dimensional vector, then ${\mathbf b}$ can be written as a linear combination of ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$.

c) 
    Suppose ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is a collection of $m$-dimensional vectors and that the matrix $\left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n \end{array}\right]$ has a pivot position in every row and every column. If ${\mathbf b}$ is any $m$-dimensional vector, then ${\mathbf b}$ can be written as a linear combination of ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ in exactly one way.

d) 
    It is possible to find two 3-dimensional vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ such that every 3-dimensional vector can be written as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

ANSWER:

a) 
    True

b) 
    True

c) 
    True

d) 
    False

SOLUTION:

a) 
    True, because we can choose the weights $c=2$ and $d=0$.

b) 
    True, because the augmented matrix $\left[\begin{array}{rrrr|r} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n & {\mathbf b} \end{array}\right]$ can never have a pivot position in the rightmost column.

c) 
    True, because the augmented matrix $\left[\begin{array}{rrrr|r} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n & {\mathbf b} \end{array}\right]$ can never have a pivot position in the rightmost column and the corresponding linear system cannot have a free variable.

d) 
    False, because it is possible to choose a vector ${\mathbf b}$ such that the augmented matrix $\left[\begin{array}{rr|r} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf b} \end{array}\right]$ has a pivot in the rightmost column.

:::

:::exercise {exercise-2-1-008} number=2.1.8 answered=yes src=src/exercises/exercises2-1.xml:765
PROBLEM:
A theme that will later unfold concerns the use of coordinate systems. We can identify the point $(x,y)$ with the tip of the vector $\left[\begin{array}{r}x\\y\end{array}\right]$, drawn emanating from the origin. We can then think of the usual Cartesian coordinate system in terms of linear combinations of the vectors

$$ {\mathbf e}_1 = \left[\begin{array}{r} 1 \\ 0 \end{array}\right], {\mathbf e}_2 = \left[\begin{array}{r} 0 \\ 1 \end{array}\right]. $$

For instance, the point $(2,-3)$ is identified with the vector

$$ \left[\begin{array}{r} 2 \\ -3 \end{array}\right] = 2{\mathbf e}_1 - 3{\mathbf e}_2, $$

as shown on the left in [Figure 2.1.19](ref:fig-ex-coords-1).
> FIGURE {fig:fig-ex-coords-1} number=2.1.19 src=../../media/ch02/ex-coord-std-2-1.svg
> alt: The standard coordinate grid with two vectors and a linear combination of those vectors.
> caption: The usual Cartesian coordinate system, defined by the vectors ${\mathbf e}_1$ and ${\mathbf e}_2$, is shown on the left along with the representation of the point $(2,-3)$. The right shows a nonstandard coordinate system defined by vectors ${\mathbf v}_1$ and ${\mathbf v}_2$.
> subfigure src=../../media/ch02/ex-coord-std-2-1.svg alt: The standard coordinate grid with two vectors and a linear combination of those vectors.
> subfigure src=../../media/ch02/ex-coord-nonstd-2-1.svg alt: Two vectors, the skewed grid of parallel lines they define, and a linear combination of the vectors.
If instead we have vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r} 2 \\ 1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r} 1 \\ 2 \end{array}\right] $$

, we may define a new coordinate system in which a point $\{c,d\}$ will correspond to the vector

$$ c{\mathbf v}_1 + d{\mathbf v}_2 $$

. For instance, the point $\{2,-3\}$ is shown on the right side of [Figure 2.1.19](ref:fig-ex-coords-1).

a) 
    Write the point $\{2,-3\}$ in standard coordinates; that is, find $x$ and $y$ such that

    $$ (x,y) = \{2,-3\} $$

    .

b) 
    Write the point $(2,-3)$ in the new coordinate system; that is, find $c$ and $d$ such that

    $$ \{c,d\} = (2,-3) $$

    .

c) 
    Convert a general point $\{c,d\}$, expressed in the new coordinate system, into standard Cartesian coordinates $(x,y)$.

d) 
    What is the general strategy for converting a point from standard Cartesian coordinates $(x,y)$ to the new coordinates $\{c,d\}$? Actually implementing this strategy in general may take a bit of work so just describe the strategy. We will study this in more detail later.

ANSWER:

a) 
    $(1,-4) = \{2,-3\}$.

b) 
    $\{7/3, -8/3\} = (2,-3)$.

c) 

    $$ \begin{alignedat}{2} x & {}={} & 2c+d \\ y & {}={} & c+2d\text{.} \\ \end{alignedat} $$

d) 
    Solve the linear system corresponding to the augmented matrix

    $$ \left[\begin{array}{rr|r} 2 & 1 & x \\ 1 & 2 & y \\ \end{array}\right]\text{.} $$

SOLUTION:

a) 
    We have

    $$ \left[\begin{array}{r}x \\ y \end{array}\right] = 2{\mathbf v}_1 -3{\mathbf v}_2 = \left[\begin{array}{r}1 \\ -4 \end{array}\right]\text{.} $$

b) 
    We have $\left[\begin{array}{r}2 \\ -3 \end{array}\right] = c{\mathbf v}_1 + d{\mathbf v}_2$. Solving this equation, we find $c=7/3$ and $d=-8/3$, which means that $(c,d) = \{7/3, -8/3\}$.

c) 
    As in the first part of this problem, we write

    $$ \begin{alignedat}{2} x & {}={} & 2c+d \\ y & {}={} & c+2d\text{.} \\ \end{alignedat} $$

d) 
    We want to solve $\left[\begin{array}{r}x \\ y \end{array}\right] = c{\mathbf v}_1 + d{\mathbf v}_2$ by constructing the augmented matrix and finding its reduced row echelon form.

    $$ \left[\begin{array}{rr|r} 2 & 1 & x \\ 1 & 2 & y \\ \end{array}\right]\text{.} $$

:::
