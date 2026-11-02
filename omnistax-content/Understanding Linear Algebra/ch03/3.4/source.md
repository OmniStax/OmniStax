# 3.4 Determinants {sec-determinants}

As invertibility plays a central role in this chapter, we need a criterion that tells us when a matrix is invertible. We already know that a square matrix is invertible if and only if it is row equivalent to the identity matrix. In this section, we will develop a second, numerical criterion that tells us when a square matrix is invertible.

## 3.4.1 Introduction

To begin, let's consider a $2\times2$ matrix $A$ whose columns are vectors ${\mathbf v}_1$ and ${\mathbf v}_2$. We have frequently drawn the vectors and studied the linear combinations they form using a figure such as [Figure 3.4.1](ref:fig-intro-dets).

> FIGURE {fig:fig-intro-dets} number=3.4.1 src=../../media/ch03/basis-1.svg
> alt: Two vectors and the grid of linear combinations they define.
> width: 50%
> caption: Linear combinations of two vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ form a collection of congruent parallelograms.

Notice how the linear combinations form a set of congruent parallelograms in the plane. In this section, we will use the area of these parallelograms to define a numerical quantity called the determinant that tells us whether the matrix $A$ is invertible.

To recall, the area of parallelogram is found by multiplying the length of one side by the perpendicular distance to its parallel side. Using the notation in the figure, the area of the parallelogram is $bh$.

> IMAGE {img:parallelogram-area} src=../../media/ch03/parallelogram-area.svg
> alt: Defining the base and height of a parallelogram.

:::exploration {act:preview-3-4-1} Preview Activity 3.4.1
We will explore the area formula in this preview activity.
PROBLEM:
a) Find the area of the following parallelograms.
    1.

    > IMAGE {img:parallelogram-a} src=../../media/ch03/parallelogram-a.svg
    > alt: A one by one square

    2.

    > IMAGE {img:parallelogram-b} src=../../media/ch03/parallelogram-b.svg
    > alt: A rectangle having sides of length two and three

    3.

    > IMAGE {img:parallelogram-c} src=../../media/ch03/parallelogram-c.svg
    > alt: A square whose sides make 45 degree angles with the coordinate axes.

    4.

    > IMAGE {img:parallelogram-d} src=../../media/ch03/parallelogram-d.svg
    > alt: A parallelogram with horizontal sides.

    5.

    > IMAGE {img:parallelogram-e} src=../../media/ch03/parallelogram-e.svg
    > alt: A parallelogram with horizontal sides.

b) Explain why the area of the parallelogram formed by the vectors ${\mathbf v}$ and ${\mathbf w}_1$ is the same as that formed by ${\mathbf v}$ and ${\mathbf w}_2$.

    > IMAGE {img:area-shear} src=../../media/ch03/area-shear.svg
    > alt: A horizontal vector with two vectors ending on the same horizontal line.

SOLUTION:
a) We find the following areas.

    1. 
        A $1\times1$ square has area 1.

    2. 
        A $2\times3$ rectangle has area 6.

    3. 
        The square has side length $\sqrt{2}$ giving an area of 2.

    4. 
        If we consider the horizontal length as the base, we see that $b=h=2$ so that the area is 4.

    5. 
        In the same way, we can consider both the base and height to be 2 so that the area is 4.

b) If we consider the base to be the length of ${\mathbf v}$, then the height, which is the perpendicular distance to its parallel side, is the same in both parallelograms.
:::

## 3.4.2 Determinants of $2\times2$ matrices

We will begin by defining the determinant of a $2\times2$ matrix $A = \left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right]$. First, however, we need to define the orientation of an ordered pair of vectors. As shown in [Figure 3.4.2](ref:fig-det-orientation), an ordered pair of vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ is called *positively* oriented if the angle, measured in the counterclockwise direction, from ${\mathbf v}_1$ to ${\mathbf v}_2$ is less than $180^\circ$; we say the pair is *negatively* oriented if it is more than $180^\circ$.

> FIGURE {fig:fig-det-orientation} number=3.4.2 src=../../media/ch03/det-orientation-a.svg
> alt: A positively oriented basis for R two
> caption: The vectors on the left are positively oriented while the ones on the right are negatively oriented.
> subfigure src=../../media/ch03/det-orientation-a.svg alt: A positively oriented basis for R two
> subfigure src=../../media/ch03/det-orientation-b.svg alt: A negatively oriented basis for R two

:::definition {def:definition-3-4-3} Definition 3.4.3
{index-entry:determinant} Suppose a $2\times2$ matrix $A$ has columns ${\mathbf v}_1$ and ${\mathbf v}_2$. If the pair of vectors is positively oriented, then the *determinant* of $A$, denoted $\det(A)$, is the area of the parallelogram formed by ${\mathbf v}_1$ and ${\mathbf v}_2$. If the pair is negatively oriented, then $\det(A)$ is -1 times the area of the parallelogram.
:::

:::example {ex:example-det-identity} Example 3.4.4
Consider the determinant of the identity matrix

$$ I = \left[\begin{array}{rr} 1& 0 \\ 0 & 1 \\ \end{array}\right] = \left[\begin{array}{rr} {\mathbf e}_1 & {\mathbf e}_2 \\ \end{array}\right] $$

. As seen on the left of [Figure 3.4.5](ref:fig-det-identity), the vectors ${\mathbf v}_1 = {\mathbf e}_1$ and ${\mathbf v}_2={\mathbf e}_2$ form a positively oriented pair. Since the parallelogram they form is a $1\times1$ square, we have $\det(I) = 1.$
> FIGURE {fig:fig-det-identity} number=3.4.5 src=../../media/ch03/det-identity-a.svg
> alt: The parallelogram that defines the determinant of the identity matrix
> caption: The determinant $\det(I) = 1$, as seen on the left. On the right, we see that $\det(A) = -2$ where $A$ is the matrix whose columns are shown.
> subfigure src=../../media/ch03/det-identity-a.svg alt: The parallelogram that defines the determinant of the identity matrix
> subfigure src=../../media/ch03/det-identity-b.svg alt: The parallelogram that defines the determinant of the matrix A
Now consider the matrix

$$ A = \left[\begin{array}{rr} -2& 0 \\ 0 & 1 \\ \end{array}\right] = \left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \\ \end{array}\right] $$

. As seen on the right of [Figure 3.4.5](ref:fig-det-identity), the vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ form a negatively oriented pair. The parallelogram they define is a $2\times1$ rectangle so we have $\det(A) = -2$.
:::

:::activity {act:activity-3-4-2} Activity 3.4.2
In this activity, we will find the determinant of some simple $2\times2$ matrices and discover some important properties of determinants.
> FIGURE {fig:js-det} number=3.4.6 src=../../media/ch03/det-preview.png
> alt: 
> caption: The geometric meaning of the determinant of a matrix.

a) 
    Use the diagram to find the determinant of the matrix $\left[\begin{array}{rr} -\frac12 & 0 \\ 0 & 2 \end{array}\right]$. Along with [Example 3.4.4](ref:example-det-identity), what does this lead you to believe is generally true about the determinant of a diagonal matrix?

b) 
    Use the diagram to find the determinant of the matrix $\left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right]$. What is the geometric effect of the matrix transformation defined by this matrix?

c) 
    Use the diagram to find the determinant of the matrix $\left[\begin{array}{rr} 2 & 1 \\ 0 & 1 \\ \end{array}\right]$. More generally, what do you notice about the determinant of any matrix of the form $\left[\begin{array}{rr} 2 & k \\ 0 & 1 \\ \end{array}\right]$? What does this say about the determinant of an upper triangular matrix?

d) 
    Use the diagram to find the determinant of any matrix of the form $\left[\begin{array}{rr} 2 & 0 \\ k & 1 \\ \end{array}\right]$. What does this say about the determinant of a lower triangular matrix?

e) 
    Use the diagram to find the determinant of the matrix $\left[\begin{array}{rr} 1 & -1 \\ -2 & 2 \\ \end{array}\right]$. In general, what is the determinant of a matrix whose columns are linearly dependent?

f) 
    Consider the matrices

    $$ A = \left[\begin{array}{rr} 2 & 1 \\ 2 & -1 \\ \end{array}\right],~~~ B = \left[\begin{array}{rr} 1 & 0 \\ 0 & 2 \\ \end{array}\right] $$

    . Use the diagram to find the determinants of $A$, $B$, and $AB$. What does this suggest is generally true about the relationship of $\det(AB)$ to $\det(A)$ and $\det(B)$?

SOLUTION:

a) 
    The determinant is $-1$ because the vectors are negatively oriented and the rectangle has sides of length $\frac12$ and $2$. The determinant of a diagonal matrix seems to be the product of the diagonal entries.

b) 
    The matrix transformation is a reflection over the line $y=x$ and we see that the determinant is $-1$.

c) 
    The determinant will continue to be $2$ for any value of $k$. This illustrates the fact that the determinant of an upper triangular matrix equals the product of its diagonal entries.

d) 
    The same reasoning tells us that this determinant is $2$ and, in fact, the determinant of a lower triangular matrix equals the product of its diagonal entries.

e) 
    The determinant of this matrix is $0$ because the parallelogram formed by the vector has no area. This suggests that the determinant of a matrix whose columns are linearly dependent is $0$.

f) 
    We find that $\det(A) = -4$, $\det(B) = 2$, and $\det(AB) = -8$. This suggests that $\det(AB) = \det(A) \det(B)$.

:::

Later in this section, we will learn an algebraic technique for computing determinants. In the meantime, we will simply note that we can define determinants for $n\times n$ matrices by measuring the volume of a box defined by the columns of the matrix, even if this box resides in ${\mathbb R}^n$ for some very large $n$.

For example, the columns of a $3\times3$ matrix $A$ will form a parallelpiped, like the one shown here, and there is a means by which we can classify sets of such vectors as either positively or negatively oriented. Therefore, we can define the determinant $\det(A)$ in terms of the volume of the parallelpiped, but we will not worry about the details here.

> IMAGE {img:det-3d} src=../../media/ch03/det-3d.svg
> alt: A set of three vectors in three dimensions and the parallelpiped they define.

Though the previous activity deals with determinants of $2\times2$ matrices, it illustrates some important properties of determinants that are true more generally.

- 
    If $A$ is a triangular matrix, then $\det(A)$ equals the product of the entries on the diagonal. For example,

    $$ \det\left[\begin{array}{rr} 2 & 2 \\ 0 & 3 \\ \end{array}\right] = 2\cdot 3 = 6 $$

    , since the two parallelograms in [Figure 3.4.7](ref:fig-parallelogram-f) have equal area.

    > FIGURE {fig:fig-parallelogram-f} number=3.4.7 src=../../media/ch03/parallelogram-f.svg
    > alt: A parallelogram formed by the columns of a two by two matrix.
    > caption: The determinant of a triangular matrix equals the product of its diagonal entries.
    > subfigure src=../../media/ch03/parallelogram-f.svg alt: A parallelogram formed by the columns of a two by two matrix.
    > subfigure src=../../media/ch03/parallelogram-g.svg alt: A rectangle whose sides have lengths two and three.

- 
    We also saw that

    $$ \det \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right] = -1 $$

    because the columns form a negatively oriented pair. You may remember from [Subsection 3.1.4](ref:3.1#subsec-triangular-invertible) that a matrix such as this is obtained by interchanging two rows of the identity matrix.

- 
    The determinant satisfies a multiplicative property, which says that

    $$ \det(AB) = \det(A)\det(B). $$

    Rather than simply thinking of the determinant as the area of a parallelogram, we may also think of it as a factor by which areas are scaled under the matrix transformation defined by the matrix. Applying the matrix transformation defined by $B$ will scale area by $\det(B)$. If we then compose $B$ with the matrix transformation defined by $A$, area will scale a second time by the factor $\det(A)$. The net effect is that the matrix transformation defined by $AB$ scales area by $\det(A)\det(B)$ so that $\det(AB)=\det(A)\det(B)$.

:::proposition {prop:proposition-det-properties} Proposition 3.4.8
The determinant satisfies these properties:

- 
    The determinant of a triangular matrix equals the product of its diagonal entries.

- 
    If $P$ is obtained by interchanging two rows of the identity matrix, then $\det(P) = -1$.

- 
    $\det(AB) = \det(A)\det(B)$.

:::

## 3.4.3 Determinants and invertibility

Perhaps the most important property of determinants also appeared in the previous activity. We saw that when the columns of the matrix $A$ are linearly dependent, the parallelogram formed by those vectors folds down onto a line. For instance, if $A=\begin{bmatrix} 1 & -1 \\ 2 & -2 \\ \end{bmatrix}$, then the resulting parallelogram, as shown in [Figure 3.4.9](ref:figure-linear-dep-det), has zero area, which means that $\det(A)=0$.

> FIGURE {fig:figure-linear-dep-det} number=3.4.9 src=../../media/ch03/parallelogram-h.svg
> alt: A line segment in the two dimensional coordinate plane.
> width: 40%
> caption: When the columns of $A$ are linearly dependent, we find that $\det(A) = 0$.

The condition that the columns of $A$ are linearly dependent is precisely the same as the condition that $A$ is not invertible. This leads us to believe that $A$ is not invertible if and only if its determinant is zero. The following proposition expresses this thought.

:::proposition {prop:prop-invertible-det} Proposition 3.4.10
The matrix $A$ is invertible if and only if $\det(A) \neq 0$.
:::

To understand this proposition more fully, let's remember that the matrix $A$ is invertible if and only if it is row equivalent to the identity matrix $I$. We will therefore consider how the determinant changes when we perform row operations on a matrix. Along the way, we will discover an effective means to compute the determinant.

In [Subsection 3.1.4](ref:3.1#subsec-triangular-invertible), we saw how to describe the three row operations, scaling, interchange, and replacement, using matrix multiplication. If we perform a row operation on the matrix $A$ to obtain the matrix $A'$, we would like to relate $\det(A)$ and $\det(A')$. To do so, remember that

- 
    Scalings are performed by multiplying a matrix $A$ by a diagonal matrix, such as

    $$ S = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 3 & 0 \\ 0 & 0 & 1 \\ \end{array}\right], $$

    which has the effect of multiplying the second row of $A$ by $3$ to obtain $A'$. Since $S$ is diagonal, we know that its determinant is the product of its diagonal entries so that $\det(S) = 3$. This means that $A'=SA$ and therefore

    $$ \det(A')=\det(S)\det(A) = 3\det(A). $$

    In general, if we scale a row of $A$ by $k$, we have $\det(A') = k\det(A)$.

- 
    Interchanges are performed by matrices such as

    $$ P = \left[\begin{array}{rrr} 0 & 1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right], $$

    which has the effect of interchanging the first and second rows of $A$. As we saw in [Proposition 3.4.8](ref:proposition-det-properties), $\det(P) = -1$. Therefore, when $PA=A'$, we have

    $$ \det(A')=\det(P) \det(A) = -\det(A). $$

    In other words, $\det(A') = -\det(A)$ when we perform an interchange.

- 
    Row replacement operations are performed by matrices such as

    $$ R = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ -2 & 0 & 1 \\ \end{array}\right], $$

    which multiplies the first row by $-2$ and adds the result to the third row. Since this is a lower triangular matrix, we know that the determinant is the product of the diagonal entries, which says that $\det(R) = 1$. This means that when $RA = A'$, we have $\det(A')=\det(R)\det(A) = \det(A)$. In other words, a row replacement does not change the determinant.

:::proposition {prop:proposition-det-row-operations} Proposition 3.4.11 (The effect of row operations on the determinant)

- 
    If $A'$ is obtained from $A$ by scaling a row by $k$, then $\det(A') = k\det(A)$.

- 
    If $A'$ is obtained from $A$ by interchanging two rows, then $\det(A') = -\det(A)$.

- 
    If $A'$ is obtained from $A$ by performing a row replacement operation, then $\det(A') = \det(A)$.

:::

:::activity {act:activity-3-4-3} Activity 3.4.3
We will investigate the connection between the determinant of a matrix and its invertibility using Gaussian elimination.

a) 
    Consider the two upper triangular matrices

    $$ U_1 = \left[\begin{array}{rrr} 1 & -1 & 2 \\ 0 & 2 & 4 \\ 0 & 0 & -2 \\ \end{array}\right],~~~ U_2 = \left[\begin{array}{rrr} 1 & -1 & 2 \\ 0 & 2 & 4 \\ 0 & 0 & 0 \\ \end{array}\right]. $$

    Remembering [Proposition 3.1.9](ref:3.1#proposition-triangular-invertibility), which of the matrices $U_1$ and $U_2$ are invertible? What are the determinants $\det(U_1)$ and $\det(U_2)$?

b) 
    Explain why an upper triangular matrix is invertible if and only if its determinant is not zero.

c) 
    Let's now consider the matrix

    $$ A = \left[\begin{array}{rrr} 1 & -1 & 2 \\ -2 & 2 & -6 \\ 3 & -1 & 10 \\ \end{array}\right] $$

    and begin the Gaussian elimination process with a row replacement operation

    $$ A = \left[\begin{array}{rrr} 1 & -1 & 2 \\ -2 & 2 & -6 \\ 3 & -1 & 10 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & -1 & 2 \\ 0 & 0 & -2 \\ 3 & -1 & 10 \\ \end{array}\right] = A_1 $$

    . What is the relationship between $\det(A)$ and $\det(A_1)$?

d) 
    Next we perform another row replacement operation:

    $$ A_1= \left[\begin{array}{rrr} 1 & -1 & 2 \\ 0 & 0 & -2 \\ 3 & -1 & 10 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & -1 & 2 \\ 0 & 0 & -2 \\ 0 & 2 & 4 \\ \end{array}\right] = A_2 $$

    . What is the relationship between $\det(A)$ and $\det(A_2)$?

e) 
    Finally, we perform an interchange:

    $$ A_2 = \left[\begin{array}{rrr} 1 & -1 & 2 \\ 0 & 0 & -2 \\ 0 & 2 & 4 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & -1 & 2 \\ 0 & 2 & 4 \\ 0 & 0 & -2 \\ \end{array}\right] = U $$

    to arrive at an upper triangular matrix $U$. What is the relationship between $\det(A)$ and $\det(U)$?

f) 
    Since $U$ is upper triangular, we can compute its determinant, which allows us to find $\det(A)$. What is $\det(A)$? Is $A$ invertible?

g) 
    Now consider the matrix

    $$ A = \left[\begin{array}{rrr} 1 & -1 & 3 \\ 0 & 2 & -2 \\ 2 & 1 & 3 \\ \end{array}\right]. $$

    Perform a sequence of row operations to find an upper triangular matrix $U$ that is row equivalent to $A$. Use this to determine $\det(A)$ and whether $A$ is invertible.

h) 
    Suppose we apply a sequence of row operations on a matrix $A$ to obtain $A'$. Explain why $\det(A) \neq 0$ if and only if $\det(A') \neq 0$.

i) 
    Explain why an $n\times n$ matrix $A$ is invertible if and only if $\det(A) \neq 0$.

SOLUTION:

a) 
    The matrix $U_1$ is invertible because we see there is a pivot position in every row and column. The matrix $U_2$, however, is not invertible because there is not a pivot position in the third row. Also, $\det(U_1)=-4$ and $\det(U_2)=0$.

b) 
    The determinant of an upper triangular matrix equals the product of its diagonal entries. Consequently, if the determinant of an upper triangular matrix is not zero, then each of its diagonal entries must be nonzero. In this case, there is a pivot position in every row and every column so that the matrix is invertible.

c) 
    Row replacement operations do not change the determinant so $\det(A) = \det(A_1)$.

d) 
    In the same way, $\det(A) = \det(A_2)$.

e) 
    Interchanges change the sign of the determinant so $\det(A) = -\det(U)$.

f) 
    The determinant $\det(U) = -4$ since it is the product of the diagonal entries of $U$. This means that $\det(A) = 4$. We see that $A$ is invertible because $U$, which has a pivot position in every row and every column, is invertible.

g) 
    Beginning with a row replacement operation, we arrive at

    $$ A_1=\left[\begin{array}{rrr} 1 & - 1 & 3 \\ 0 & 2 & -2 \\ 0 & -3 & 3 \\ \end{array}\right] $$

    . We next scale the second row by $\frac12$ to obtain

    $$ A_2=\left[\begin{array}{rrr} 1 & - 1 & 3 \\ 0 & 1 & -1 \\ 0 & -3 & 3 \\ \end{array}\right] $$

    . Another row replacement operation gives

    $$ A_3=\left[\begin{array}{rrr} 1 & - 1 & 3 \\ 0 & 1 & -1 \\ 0 & 0 & 0 \\ \end{array}\right] $$

    . Putting these operations together, we see that $\det(A) = 2\det(U) = 0$. In this case, $A$ is not invertible because $U$, which has a row without a pivot position, is not invertible.

h) 
    Performing one of the three row operations either leaves the determinant unchanged (row replacement), changes its sign (interchange), or multiplies it by a nonzero number (scaling). Therefore, if we begin with a matrix whose determinant is not zero, the determinant remains nonzero after any row operation is applied.

i) 
    If we apply a sequence of row operations to $A$ to find a row equivalent matrix $U$ that is upper triangular, we know that $\det(A)\neq0$ if and only if $\det(U) \neq 0$. We also know that $A$ is invertible if and only if $U$ is invertible. Putting these facts together, we conclude that $\det(A)\neq 0$ if and only if $A$ is invertible.

:::

As seen in this activity, row operations can be used to compute the determinant of a matrix. More specifically, applying the forward substitution phase of Gaussian elimination to the matrix $A$ leads us to an upper triangular matrix $U$ so that $A\sim U$.

We know that $U$ is invertible when all of its diagonal entries are nonzero. We also know that $\det(U)\neq 0$ under the same condition. This tells us $U$ is invertible if and only if $\det(U) \neq 0$.

Now if $\det(A)\neq 0$, we also have $\det(U)\neq 0$ since applying a sequence of row operations to $A$ only multiplies the determinant by a nonzero number. It then follows that $U$ is invertible so $U\sim I$. Therefore, we also know that $A\sim I$ and so $A$ must also be invertible.

This explains [Proposition 3.4.10](ref:prop-invertible-det) and so we know that $A$ is invertible if and only if $\det(A)\neq 0$.

Finally, notice that if $A$ is invertible, we have $A^{-1}A = I$, which tells us that

$$ \det(A^{-1}A) = \det(A^{-1})\det(A) = 1. $$

Therefore, $\det(A^{-1}) = 1/\det(A)$.

:::proposition {prop:prop-det-inverse-reciprocal} Proposition 3.4.12
If $A$ is an invertible matrix, then $\det(A^{-1}) = 1/\det(A)$.
:::

## 3.4.4 Cofactor expansions

We now have a technique for computing the determinant of a matrix using row operations. There is another way to compute determinants, using what are called *cofactor expansions*, that will be important for us in the next chapter. We will describe this method here.

To begin, the determinant of a $2\times2$ matrix is

$$ \det\left[\begin{array}{rr} a & b \\ c & d \\ \end{array}\right] = ad-bc $$

. With a little bit of work, it can be shown that this number is the same as the signed area of the parallelogram we introduced earlier.

Using a cofactor expansion to find the determinant of a more general $n\times n$ matrix is a little more work so we will demonstrate it with an example.

:::example {ex:example-3-4-13} Example 3.4.13
We illustrate how to use a cofactor expansion to find the determinant of $A$ where

$$ A = \left[\begin{array}{rrr} 1 & -1 & 2 \\ -2 & 2 & -6 \\ 3 & -1 & 10 \\ \end{array}\right]. $$

To begin, we choose one row or column. It doesn't matter which we choose because the result will be the same in any case. Here, we choose the second row

$$ \left[\begin{array}{rrr} \color{lightgray}{1} & \color{lightgray}{-1} & \color{lightgray}{2} \\ -2 & 2 & -6 \\ \color{lightgray}{3} & \color{lightgray}{-1} & \color{lightgray}{10} \\ \end{array}\right] $$

.
The determinant will be found by creating a sum of terms, one for each entry in the row we have chosen. For each entry in the row, we form its term by multiplying

- 
    $(-1)^{i+j}$ where $i$ and $j$ are the row and column numbers, respectively, of the entry,

- 
    the entry itself, and

- 
    the determinant of the entries left over when we have crossed out the row and column containing the entry.

Since we are computing the determinant of this matrix

$$ \left[\begin{array}{rrr} \color{gray}{1} & \color{gray}{-1} & \color{gray}{2} \\ -2 & 2 & -6 \\ \color{gray}{3} & \color{gray}{-1} & \color{gray}{10} \\ \end{array}\right] $$

using the second row, the entry in the first column of this row is $-2$. Let's see how to form the term from this entry.
The term itself is $-2$, and the matrix that is left over when we cross out the second row and first column is

$$ \left[\begin{array}{rrr} \color{gray}{1} & {-1} & {2} \\ \color{gray}{-2} & \color{gray}{2} & \color{gray}{-6} \\ \color{gray}{3} & {-1} & {10} \\ \end{array}\right] $$

whose determinant is

$$ \det\left[\begin{array}{rr} -1 & 2 \\ -1 & 10 \\ \end{array}\right] = -1(10) - 2 (-1) = -8 $$

. Since this entry is in the second row and first column, the term we construct is $(-1)^{2+1}(-2)(-8) = -16$.
Putting this together, we find the determinant to be

$$ \begin{aligned} \left[\begin{array}{rrr} {1} & {-1} & {2} \\ -2 & {2} & {-6} \\ {3} & {-1} & {10} \\ \end{array}\right] {}={} & (-1)^{2+1}(-2)\det\left[\begin{array}{rr} -1 & 2 \\ -1 & 10 \\ \end{array}\right] \\ & {}+{} (-1)^{2+2}(2)\det\left[\begin{array}{rr} 1 & 2 \\ 3 & 10 \\ \end{array}\right] \\ & {}+{} (-1)^{2+3}(-6)\det\left[\begin{array}{rr} 1 & -1 \\ 3 & -1 \\ \end{array}\right] \\ \\ {}={} & (-1)(-2)(-1(10)-2(-1)) \\ & + (1)(2)(1(10)-2(3)) \\ & + (-1)(-6)((1)(-1)-(-1)3) \\ \\ {}={} & -16 + 8 + 12 \\ {}={} & 4 \\ \end{aligned} $$

. Notice that this agrees with the determinant that we found for this matrix using row operations in the last activity.
:::

:::activity {act:activity-3-4-4} Activity 3.4.4
We will explore cofactor expansions through some examples.

a) 
    Using a cofactor expansion, show that the determinant of the following matrix

    $$ \det \left[\begin{array}{rrr} 2 & 0 & -1 \\ 3 & 1 & 2 \\ -2 & 4 & -3 \\ \end{array}\right] = -36 $$

    . Remember that you can choose any row or column to create the expansion, but the choice of a particular row or column may simplify the computation.

b) 
    Use a cofactor expansion to find the determinant of

    $$ \left[\begin{array}{rrrr} -3 & 0 & 0 & 0 \\ 4 & 1 & 0 & 0 \\ -1 & 4 & -4 & 0\\ 0 & 3 & 2 & 3 \\ \end{array}\right] $$

    . Explain how the cofactor expansion technique shows that the determinant of a triangular matrix is equal to the product of its diagonal entries.

c) 
    Use a cofactor expansion to determine whether the following vectors form a basis of ${\mathbb R}^3$:

    $$ \left[\begin{array}{r}2 \\ -1 \\ -2 \end{array}\right], \left[\begin{array}{r}1 \\ -1 \\ 2 \end{array}\right], \left[\begin{array}{r}1 \\ 0 \\ -4 \end{array}\right] $$

    .

d) 
    Sage will compute the determinant of a matrix `A` with the command `A.det()`. Use Sage to find the determinant of the matrix

    $$ \left[\begin{array}{rrrr} 2 & 1 & -2 & -3 \\ 3 & 0 & -1 & -2 \\ -3 & 4 & 1 & 2\\ 1 & 3 & 3 & -1 \\ \end{array}\right] $$

    .

    :::sage
    ```sage

    ```
    :::

SOLUTION:

a) 
    We will using a cofactor expanion along the first row so that

    $$ \begin{array}{rl} \det\left[\begin{array}{rrr} 2 & 0 & -1 \\ 3 & 1 & 2 \\ -2 & 4 & -3 \\ \end{array}\right] = & (-1)^{1+1}\cdot 2 \det\left[\begin{array}{rr} 1 & 2 \\ 4 & -3 \\ \end{array}\right] \\ & + (-1)^{1+3}\cdot (-1) \det\left[\begin{array}{rr} 3 & 1 \\ -2 & 4 \\ \end{array}\right] \\ = & 2(-11) - 14 = -36\text{.} \end{array} $$

b) 
    Expanding along the first row gives

    $$ \begin{array}{rl} \det \left[\begin{array}{rrrr} -3 & 0 & 0 & 0 \\ 4 & 1 & 0 & 0 \\ -1 & 4 & -4 & 0\\ 0 & 3 & 2 & 3 \\ \end{array}\right] & = 3\det \left[\begin{array}{rrr} 1 & 0 & 0 \\ 4 & -4 & 0\\ 3 & 2 & 3 \\ \end{array}\right] \\ & =-3(1)\det \left[\begin{array}{rr} -4 & 0 \\ 2 & 3 \\ \end{array}\right] \\ & =-3(1)(-4)(3) = 36\text{.} \end{array} $$

c) 
    We form the matrix $A$ whose columns are the three given vectors. Expanding along either the second row or third column to take advantage of the zero in the $(2,3)$ entry, we see that $\det(A) = 0$, which means that $A$ is not invertible. Therefore, the vectors do not form a basis for ${\mathbb R}^3$.

d) 
    Sage tells us that $\det(A) = 72$.

:::

## 3.4.5 Summary

In this section, we associated a numerical quantity, the determinant, to a square matrix and showed how it tells us whether the matrix is invertible.

- 
    The determinant of a matrix has a geometric interpretation. In particular, when $n=2$, the determinant is the signed area of the parallelogram formed by the two columns of the matrix.

- 
    The determinant satisfies many properties. For instance, $\det(AB) = \det(A) \det(B)$ and the determinant of a triangular matrix is equal to the product of its diagonal entries.

- 
    These properties helped us compute the determinant of a matrix using row operations. This also led to the important observation that the determinant of a matrix is nonzero if and only if the matrix is invertible.

- 
    Finally, we learned how to compute the determinant of a matrix using cofactor expansions, which will be a valuable tool for us in the next chapter.

We have seen three ways to compute the determinant: by interpreting the determinant as a signed area or volume; by applying appropriate row operations; and by using a cofactor expansion. It's worth spending a moment to think about the relative merits of these approaches.

The geometric definition of the determinant tells us that the determinant is measuring a natural geometric quantity, an insight that does not easily come through the other two approaches. The intuition we gain by thinking about the determinant geometrically makes it seem reasonable that the determinant should be zero for matrices that are not invertible: if the columns are linearly dependent, the vectors cannot create a positive volume.

Approaching the determinant through row operations provides an effective means of computing the determinant. In fact, this is what most computer programs do behind the scenes when they compute a determinant. This approach is also a useful theoretical tool for explaining why the determinant tells us whether a matrix is invertible.

The cofactor expansion method will be useful to us in the next chapter when we look at eigenvalues and eigenvectors. It is not, however, a practical way to compute a determinant. To see why, consider the fact that the determinant of a $2\times2$ matrix, written as $ad-bc$, requires us to compute two terms, $ad$ and $bc$. To compute the determinant of a $3\times3$ matrix, we need to compute three $2\times2$ determinants, which involves $3\cdot 2 = 6$ terms. For a $4\times4$ matrix, we need to compute four $3\times3$ determinants, which produces $4\cdot3\cdot2 = 24$ terms. Continuing in this way, we see that the cofactor expansion of a $10\times10$ matrix would involve $10\cdot9\cdot8\ldots3\cdot2 = 10! = 3628800$ terms.

By contrast, we have seen that the number of steps required to perform Gaussian elimination on an $n\times n$ matrix is proportional to $n^3$. When $n=10$, we have $n^3 = 1000$, which points to the fact that finding the determinant using Gaussian elimination is considerably less work.

## 3.4.6 Exercises

:::exercise {exercise-3-4-001} number=3.4.1 answered=yes src=src/exercises/exercises3-4.xml:5
PROBLEM:
Consider the matrices

$$ A = \left[\begin{array}{rrr} 2 & 1 & 0 \\ -4 & -4 & 3 \\ 2 & 1 & -3 \\ \end{array}\right], \qquad B = \left[\begin{array}{rrrr} -2 & 3 & 0 & 0 \\ 0 & 4 & 2 & 0 \\ 4 & -6 & -1 & 2 \\ 0 & 4 & 2 & -3 \\ \end{array}\right] $$

.

a) 
    Find the determinants of $A$ and $B$ using row operations.

b) 
    Now find the determinants of $A$ and $B$ using cofactor expansions to verify your results

ANSWER:
$\det(A) = 12$ and $\det(B) = -24$.
SOLUTION:
We find that $\det(A) = 12$ and $\det(B) = -24$.
:::

:::exercise {exercise-3-4-002} number=3.4.2 answered=yes src=src/exercises/exercises3-4.xml:43
PROBLEM:
This exercise concerns rotations and reflections in ${\mathbb R}^2$.

a) 
    Suppose that $A$ is the matrix that performs a counterclockwise rotation in ${\mathbb R}^2$. Draw a typical picture of the vectors that form the columns of $A$ and use the geometric definition of the determinant to determine $\det(A)$.

b) 
    Suppose that $B$ is the matrix that performs a reflection in a line passing through the origin. Draw a typical picture of the columns of $B$ and use the geometric definition of the determinant to determine $\det(B)$.

c) 
    As we saw in [Section 2.6](ref:2.6#sec-transforms-geom), the matrices have the form

    $$ A = \left[\begin{array}{rr} \cos \theta & -\sin\theta \\ \sin \theta & \cos \theta \\ \end{array}\right], \qquad B = \left[\begin{array}{rr} \cos(2\theta) & \sin(2\theta) \\ \sin(2\theta) & -\cos(2\theta) \\ \end{array}\right] $$

    . Compute the determinants of $A$ and $B$ and verify that they agree with what you found in the earlier parts of this exercise.

ANSWER:

a) 
    $\det(A) = 1$.

b) 
    $\det(B) = -1$.

SOLUTION:

a) 
    The vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ that form the columns of $A$ are found by rotating the standard basis vectors ${\mathbf e}_1$ and ${\mathbf e}_2$. Consequently, they are positively oriented and form a $1\times1$ square. This says that $\det(A) = 1$.

b) 
    The vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ that form the columns of $B$ are found by reflecting the standard basis vectors ${\mathbf e}_1$ and ${\mathbf e}_2$. Consequently, they are negatively oriented and form a $1\times1$ square. This says that $\det(B) = -1$.

c) 
    We see that $\det(A) =\cos^2\theta + \sin^2\theta = 1$ and $\det(B) = -\cos^2(2\theta) -\sin^2(2\theta) = -1$.

:::

:::exercise {exercise-3-4-003} number=3.4.3 answered=yes src=src/exercises/exercises3-4.xml:114
PROBLEM:
In the next chapter, we will say that matrices $A$ and $B$ are *similar* if there is a matrix $P$ such that $A= PBP^{-1}$.

a) 
    Suppose that $A$ and $B$ are matrices and that there is a matrix $P$ such that $A=PBP^{-1}$. Explain why $\det(A) = \det(B)$.

b) 
    Suppose that $A$ is a $3\times3$ matrix and that there is a matrix $P$ such that

    $$ A = P \left[\begin{array}{rrr} 2 & 0 & 0 \\ 0 & -5 & 0 \\ 0 & 0 & -3 \\ \end{array}\right] P^{-1} $$

    . Find $\det(A)$.

ANSWER:

a) 
    $\det(A) = \det(B)$ because $\det(P) \det(P^{-1}) = 1$.

b) 
    $\det(A) = 30$.

SOLUTION:

a) 
    $\det(A) = \det(P) \det(B) \det(P^{-1}) = \det(B)$.

b) 
    $\det(A) = (\det(P)) (2)(-5)(-3) (\det(P^{-1})) = 30$ since $\det(P) \det(P^{-1}) = 1$.

:::

:::exercise {exercise-3-4-004} number=3.4.4 answered=yes src=src/exercises/exercises3-4.xml:163
PROBLEM:
Consider the matrix

$$ A = \left[\begin{array}{rrr} -2 & 1 & k \\ 2 & 3 & 0 \\ 1 & 2 & 2 \\ \end{array}\right] $$

where $k$ is a parameter.

a) 
    Find an expression for $\det(A)$ in terms of the parameter $k$.

b) 
    Use your expression for $\det(A)$ to determine the values of $k$ for which the vectors

    $$ \left[\begin{array}{r}-2 \\ 2 \\ 1 \end{array}\right], \left[\begin{array}{r}1 \\ 3 \\ 2 \end{array}\right], \left[\begin{array}{r}k \\ 0 \\ 2 \end{array}\right] $$

    are linearly independent.

ANSWER:

a) 
    $\det(A) = k-16$

b) 
    $k\neq 16$.

SOLUTION:

a) 
    We see that $\det(A) = k-16$.

b) 
    The vectors are linearly independent when the matrix $A$ is invertible, which means that $\det(A)\neq 0$. Therefore, the vectors are linearly independent when $k\neq 16$.

:::

:::exercise {exercise-3-4-005} number=3.4.5 answered=yes src=src/exercises/exercises3-4.xml:208
PROBLEM:
Determine whether the following statements are true or false and explain your response.

a) 
    If we have a square matrix $A$ and multiply the first row by $5$ and add it to the third row to obtain $A'$, then $\det(A') = 5\det(A)$.

b) 
    If we interchange two rows of a matrix, then the determinant is unchanged.

c) 
    If we scale a row of the matrix $A$ by $17$ to obtain $A'$, then $\det(A') = 17\det(A)$.

d) 
    If $A$ and $A'$ are row equivalent and $\det(A') = 0$, then $\det(A) = 0$ also.

e) 
    If $A$ is row equivalent to the identity matrix, then $\det(A) = \det(I) = 1$.

ANSWER:

a) 
    False

b) 
    False

c) 
    True

d) 
    True

e) 
    False

SOLUTION:

a) 
    False. This is a row replacement operation, which leaves the determinant unchanged.

b) 
    False. Applying an interchange operation changes the sign of the determinant.

c) 
    True. Scaling a row of $A$ by $r$ multiplies the determinant by $r$.

d) 
    True. Row operations either leave the determinant unchanged, change its sign, or multiply it by a nonzero number. Therefore, if $\det(A')=0$ and $A$ and $A'$ are related through a sequence of row operations, then $\det(A) = 0$.

e) 
    False. It is true that $\det(I) = 1$, but a sequence of row operations that cause $A$ and $I$ to be row equivalent may multiply the determinant by a nonzero number or change its sign. We do know, however, that $\det(A)\neq 0$ and so $A$ is invertible.

:::

:::exercise {exercise-3-4-006} number=3.4.6 answered=yes src=src/exercises/exercises3-4.xml:270
PROBLEM:
Suppose that $A$ and $B$ are $5\times5$ matrices such that $\det(A) = -2$ and $\det(B) = 5$. Find the following determinants:

a) 
    $\det(2A)$.

b) 
    $\det(A^3)$.

c) 
    $\det(AB)$.

d) 
    $\det(-A)$.

e) 
    $\det(AB^{-1})$.

ANSWER:

a) 
    $\det(2A) = -64$.

b) 
    $\det(A^3) = -8$.

c) 
    $\det(AB) = -10$.

d) 
    $\det(-A) = 2$.

e) 
    $\det (AB^{-1}) = -\frac 25$.

SOLUTION:

a) 
    Multiplying the entire matrix by $2$ scales each row by $2$. Therefore, $\det(2A) = 2^5\det(A) = -64$.

b) 
    We have $\det(A^3) = (\det(A))^3 = -8$.

c) 
    We know that $\det(AB) = \det(A) \det(B) = -10$.

d) 
    Multiplying the matrix by $-1$ scales each row by $-1$ so we have $\det(-A) = (-1)^5\det(A) = 2$.

e) 
    $\det(AB^{-1}) = \det(A) \det(B^{-1}) = \det(A)/\det(B) = -\frac 25$.

:::

:::exercise {exercise-3-4-007} number=3.4.7 answered=yes src=src/exercises/exercises3-4.xml:324
PROBLEM:
Suppose that $A$ and $B$ are $n\times n$ matrices.

a) 
    If $A$ and $B$ are both invertible, use determinants to explain why $AB$ is invertible.

b) 
    If $AB$ is invertible, use determinants to explain why both $A$ and $B$ are invertible.

ANSWER:

a) 
    If $A$ and $B$ are invertible, then $\det(A) \neq 0$ and $\det(B) \neq 0$. Therefore, $\det(AB) = \det(A)\det(B) \neq 0$, which shows that $AB$ is invertible.

b) 
    If $AB$ is invertible, then $\det (AB) = \det(A) \det(B) \neq 0$. This implies that $\det(A)\neq0$ and $\det(B) \neq 0$, from which we conclude that both $A$ and $B$ are invertible.

SOLUTION:

a) 
    If $A$ and $B$ are invertible, then $\det(A) \neq 0$ and $\det(B) \neq 0$. Therefore, $\det(AB) = \det(A)\det(B) \neq 0$, which shows that $AB$ is invertible.

b) 
    If $AB$ is invertible, then $\det (AB) = \det(A) \det(B) \neq 0$. This implies that $\det(A)\neq0$ and $\det(B) \neq 0$, from which we conclude that both $A$ and $B$ are invertible.

:::

:::exercise {exercise-3-4-008} number=3.4.8 answered=yes src=src/exercises/exercises3-4.xml:368
PROBLEM:
Provide a justification for your responses to the following questions.

a) 
    If every entry in one row of a matrix is zero, what can you say about the determinant?

b) 
    If two rows of a square matrix are identical, what can you say about the determinant?

c) 
    If two columns of a square matrix are identical, what can you say about the determinant?

d) 
    If one column of a matrix is a linear combination of the others, what can you say about the determinant?

ANSWER:
In all four cases, the determinant must be zero.
SOLUTION:

a) 
    The determinant must be zero. This is because the matrix cannot be invertible since there is a row without a pivot. Also, applying a cofactor expansion along that row will produce zero for the determinant.

b) 
    The determinant is zero again. If we multiply one of the rows by $-1$ and add it to the other row, we obtain a row whose entries are all zero. This operation does not change the determinant, but we know that the determinant of the new matrix is zero by the previous part of this problem.

c) 
    The determinant must be zero. This is because the columns are not linearly independent, which means that the matrix cannot be invertible. Hence, the determinant is zero.

d) 
    The determinant must be zero. This is because the columns are not linearly independent, which means that the matrix cannot be invertible. Hence, the determinant is zero.

:::

:::exercise {exercise-3-4-009} number=3.4.9 answered=yes src=src/exercises/exercises3-4.xml:421
PROBLEM:
Consider the matrix

$$ A = \left[\begin{array}{rrr} 0 & 1 & x \\ 2 & 2 & y \\ -1 & 0 & z \\ \end{array}\right] $$

.

a) 
    Assuming that $\det(A) = 0$, rewrite the equation in terms of $x$, $y$, and $z$.

b) 
    Explain why ${\mathbf v}_1$ and ${\mathbf v}_2$, the first two columns of $A$, satisfy the equation you found in the previous part.

c) 
    Explain why the solution space of this equation is the plane spanned by ${\mathbf v}_1$ and ${\mathbf v}_2$.

ANSWER:

a) 
    $\det(A) = 2x-y-2z = 0$.

b) 
    If we replace the third column by either ${\mathbf v}_1$ or ${\mathbf v}_2$, we obtain a matrix whose columns are linearly dependent.

c) 
    If $\det(A)=0$ for a vector $\left[\begin{array}{r}x \\ y \\ z \end{array}\right]$, then $\left[\begin{array}{r}x \\ y \\ z \end{array}\right]$ is a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

SOLUTION:

a) 
    Using a cofactor expansion, we have $\det(A) = 2x-y-2z = 0$.

b) 
    If we replace the third column by either ${\mathbf v}_1$ or ${\mathbf v}_2$, we obtain a matrix whose columns are linearly dependent. Therefore, the determinant of the matrix must be zero.

c) 
    If $\det(A) = 0$ for some vector $\left[\begin{array}{r}x \\ y \\ z \end{array}\right]$, then the columns of $A$ must be linear dependent. Therefore, $\left[\begin{array}{r}x \\ y \\ z \end{array}\right]$ is a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$ and lies in the plane that is their span.

:::

:::exercise {exercise-3-4-010} number=3.4.10 answered=yes src=src/exercises/exercises3-4.xml:481
PROBLEM:
In this section, we studied the effect of row operations on the matrix $A$. In this exercise, we will study the effect of analogous *column* operations.
Suppose that $A$ is the $3\times3$ matrix $A= \left[\begin{array}{rrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right]$. Also consider elementary matrices

$$ R = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ -3 & 0 & 1 \\ \end{array}\right],~~~ S = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 3 & 0 \\ 0 & 0 & 1 \\ \end{array}\right],~~~ P = \left[\begin{array}{rrr} 0 & 0 & 1 \\ 0 & 1 & 0 \\ 1 & 0 & 0 \\ \end{array}\right] $$

.

a) 
    Explain why the matrix $AR$ is obtained from $A$ by replacing the first column ${\mathbf v}_1$ by ${\mathbf v}_1 - 3{\mathbf v}_3$. We call this a column replacement operation. Explain why column replacement operations do not change the determinant.

b) 
    Explain why the matrix $AS$ is obtained from $A$ by multiplying the second column by $3$. Explain the effect that scaling a column has on the determinant of a matrix.

c) 
    Explain why the matrix $AP$ is obtained from $A$ by interchanging the first and third columns. What is the effect of this operation on the determinant?

d) 
    Use column operations to compute the determinant of

    $$ A=\left[\begin{array}{rrr} 0 & -3 & 1 \\ 1 & 1 & 4 \\ 1 & 1 & 0 \\ \end{array} \right] $$

    .

ANSWER:

a) 
    Column replacements do not change the determinant because $\det(R)=1$.

b) 
    Scaling a column by $r$ multiplies the determinant by $r$ because $\det(S)=r$.

c) 
    Interchanges change the sign of the determinant because $\det(P)=-1$.

d) 
    $\det(A) = -12$.

SOLUTION:

a) 
    The columns of $AR$ are found by multiplying the columns of $R$ by $A$. If we remember that a vector multiplied by a matrix forms a linear combination of the columns of $A$, we see that the first column of $AR$ is ${\mathbf v}_1-3{\mathbf v}_2$ and that the other two columns are unchanged.

    Since $\det(R) = 1$, we have $\det(AR) = \det(A)$, which says that this operation does not change the determinant.

b) 
    Multiplying by $S$ multiplies the determinant by $3$ since $\det(S)=3$.

c) 
    Multiplying by $P$ changes the sign of the determinant since $\det(P) = -1$.

d) 
    If we interchange the first and third columns of $A$, we have

    $$ A_1=\left[\begin{array}{rrr} 1 & -3 & 0 \\ 4 & 1 & 1 \\ 0 & 1 & 1 \\ \end{array}\right] $$

    and $\det(A) = -\det(A_1)$. Now we will multiply the first column by $3$ and add to the second column to obtain

    $$ A_2=\left[\begin{array}{rrr} 1 & 0 & 0 \\ 4 & 13 & 1 \\ 0 & 1 & 1 \\ \end{array}\right] $$

    and $\det(A) = -\det(A_2)$. Let's interchange the second and third columns so that

    $$ A_3=\left[\begin{array}{rrr} 1 & 0 & 0 \\ 4 & 1 & 13 \\ 0 & 1 & 1 \\ \end{array}\right] $$

    so that $\det(A) = \det(A_3)$ and then multiply the second column by $-13$ and add to the third column so that

    $$ A_4=\left[\begin{array}{rrr} 1 & 0 & 0 \\ 4 & 1 & 0 \\ 0 & 1 & -12 \\ \end{array}\right]\text{.} $$

    This gives $\det(A) = \det(A_4) = -12$.

:::

:::exercise {exercise-3-4-011} number=3.4.11 answered=yes src=src/exercises/exercises3-4.xml:615
PROBLEM:
Consider the matrices

$$ A = \left[\begin{array}{rrrr} 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ 1 & 0 & 0 & 0 \\ \end{array}\right],~~~ B = \left[\begin{array}{rrrr} 0 & 1 & 0 & 0 \\ 1 & 0 & 0 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 1 & 0 \\ \end{array}\right],~~~ C = \left[\begin{array}{rrrr} 0 & 0 & 0 & a \\ 0 & 0 & b & 0 \\ 0 & c & 0 & 0 \\ d & 0 & 0 & 0 \\ \end{array}\right] $$

. Use row operations to find the determinants of these matrices.
ANSWER:
$\det(A) = -1$, $\det(B) = 1$, and $\det(C) = abcd$.
SOLUTION:
It takes three interchanges to see that $A\sim I$, which implies that $\det(A) = -1$.
Two interchanges show us that $A\sim I$ and hence $\det(B) = 1$.
Two interchanges produce a diagonal matrix so that $\det(C) = abcd$.
:::

:::exercise {exercise-3-4-012} number=3.4.12 answered=yes src=src/exercises/exercises3-4.xml:659
PROBLEM:
Consider the matrices

$$ \begin{aligned} A = \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right], \qquad & B = \left[\begin{array}{rrr} 0 & 1 & 0 \\ 1 & 0 & 1 \\ 0 & 1 & 0 \\ \end{array}\right], \\ \\ C = \left[\begin{array}{rrrr} 0 & 1 & 0 & 0 \\ 1 & 0 & 1 & 0 \\ 0 & 1 & 0 & 1 \\ 0 & 0 & 1 & 0 \\ \end{array}\right], \qquad & D = \left[\begin{array}{rrrrr} 0 & 1 & 0 & 0 & 0 \\ 1 & 0 & 1 & 0 & 0 \\ 0 & 1 & 0 & 1 & 0 \\ 0 & 0 & 1 & 0 & 1 \\ 0 & 0 & 0 & 1 & 0 \\ \end{array}\right] \end{aligned} $$

a) 
    Use row (and/or column) operations to find the determinants of these matrices.

b) 
    Write the $6\times6$ and $7\times7$ matrices that follow in this pattern and state their determinants based on what you have seen.

ANSWER:

a) 
    $\det(A) = -1$, $\det(B) = 0$, $\det(C) = 1$, and $\det(D) = 0$.

b) 
    If $E$ and $F$ are the $6\times6$ and $7\times7$ matrices, respectively, we expect that $\det(E) = -1$ and $\det(F) = 0$.

SOLUTION:

a) 
    $\det(A) = -1$, $\det(B) = 0$, $\det(C) = 1$, and $\det(D) = 0$.

b) 
    If $E$ and $F$ are the $6\times6$ and $7\times7$ matrices, respectively, we expect that $\det(E) = -1$ and $\det(F) = 0$.

:::

:::exercise {exercise-3-4-013} number=3.4.13 answered=yes src=src/exercises/exercises3-4.xml:728
PROBLEM:
The following matrix is called a *Vandermond* matrix:

$$ V = \left[\begin{array}{rrr} 1 & a & a^2 \\ 1 & b & b^2 \\ 1 & c & c^2 \\ \end{array}\right] $$

.

a) 
    Use row operations to explain why $\det(V) = (b-a)(c-a)(c-b)$.

b) 
    Explain why $V$ is invertible if and only if $a$, $b$, and $c$ are all distinct real numbers.

c) 
    There is a natural way to generalize this to a $4\times4$ matrix with parameters $a$, $b$, $c$, and $d$. Write this matrix and state its determinant based on your previous work.

This matrix appeared in [Exercise 1.4.9](ref:1.4#exercise-poly-fit) when we were found a polynomial that passed through a given set of points.
ANSWER:

a) 
    Perform a sequence of row operations to form an upper triangular matrix.

b) 
    If $a$, $b$, and $c$ are distinct, then $\det(V) \neq 0$.

c) 
    The determinant is $(d-a)(d-b)(d-c)(c-a)(c-b)(b-a)$.

SOLUTION:

a) 
    If $a$, $b$, and $c$ are not distinct, we see that $\det(V)=0$ because two of the rows are identical. Therefore, we apply the following row operations, assuming $a$, $b$, and $c$ are distinct:

    $$ \begin{array}{rl} V = & \left[\begin{array}{rrr} 1 & a & a^2 \\ 1 & b & b^2 \\ 1 & c & c^2 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & a & a^2 \\ 0 & b-a & b^2-a^2 \\ 0 & c-a & c^2-a^2 \\ \end{array}\right] \\ \sim & \left[\begin{array}{rrr} 1 & a & a^2 \\ 0 & 1 & b+a \\ 0 & 1 & c+a \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & a & a^2 \\ 0 & 1 & b+a \\ 0 & 0 & c-b \\ \end{array}\right]\text{.} \end{array} $$

    Because of the scalings by $b-a$ and $c-a$, we have $\det(V) = (b-a)(c-a)(c-b)$.

b) 
    If $a$, $b$, and $c$ are distinct, then $\det(V) \neq 0$, which implies that $V$ is invertible.

c) 
    In the $4\times4$ case, we have

    $$ \det\left[\begin{array}{rrrr} 1 & a & a^2 & a^3 \\ 1 & b & b^2 & b^3 \\ 1 & c & c^2 & c^3 \\ 1 & d & d^2 & d^3 \\ \end{array}\right] = (d-a)(d-b)(d-c)(c-a)(c-b)(b-a)\text{.} $$

:::
