# 6.5 Orthogonal least squares {sec-least-squares}

Our work so far has developed a rich set of tools that allow us to use orthogonality to simplify some problems. As we will see in this section, these tools lead naturally to several important techniques for working with data, such as linear regression.

## 6.5.1 Introduction

Suppose we collect some data when performing an experiment and plot it as shown on the left of [Figure 6.5.1](ref:lst-squares-intro). Notice that there is no line on which all the points lie; in fact, it would be surprising if there were since we can expect some uncertainty in the measurements recorded. There does, however, appear to be a line, as shown on the right, on which the points *almost* lie.

> FIGURE {fig:lst-squares-intro} number=6.5.1 src=../../media/ch06/lst-squares-1.svg
> alt: A scatter plot of two dimensional data points that approximately lie on a line.
> caption: A collection of points and a line approximating the linear relationship implied by them.
> subfigure src=../../media/ch06/lst-squares-1.svg alt: A scatter plot of two dimensional data points that approximately lie on a line.
> subfigure src=../../media/ch06/lst-squares-2.svg alt: A scatter plot of two dimensional data points and a line on which they approximately lie.

In this section, we'll explore how the techniques developed in this chapter enable us to find the line that best approximates the data. More specifically, we'll see how the search for a line passing through the data points leads to an inconsistent system $A{\mathbf x}={\mathbf b}$. Since we are unable to find a solution, we instead seek the vector ${\mathbf x}$ where $A{\mathbf x}$ is as close as possible to ${\mathbf b}$. Orthogonal projection gives us just the right tool for doing this.

:::exploration {act:preview-6-5-1} Preview Activity 6.5.1
PROBLEM:
a) Is there a solution to the equation $A{\mathbf x}={\mathbf b}$ where $A$ and ${\mathbf b}$ are such that

    $$ \begin{bmatrix} 1 & 2 \\ 2 & 5 \\ -1 & 0 \\ \end{bmatrix} {\mathbf x} = \left[\begin{array}{r}5 \\ -3 \\ -1 \end{array}\right] $$

    .
    :::sage
    ```sage

    ```
    :::
b) We know that $\left[\begin{array}{r}1 \\ 2 \\ -1 \end{array}\right]$ and $\left[\begin{array}{r}2 \\ 5 \\ 0 \end{array}\right]$ form a basis for $\text{Col}(A)$. Find an orthogonal basis for $\text{Col}(A)$.
c) Find the orthogonal projection $\widehat{\mathbf b}$ of ${\mathbf b}$ onto $\text{Col}(A)$.
d) Explain why the equation $A{\mathbf x}=\widehat{\mathbf b}$ must be consistent and then find its solution.
SOLUTION:
a) The reduced row echelon form

    $$ \left[ \begin{array}{cc|c} 1 & 2 & 5 \\ 2 & 5 & -3 \\ -1 & 0 & -1\\ \end{array} \right] \sim \left[ \begin{array}{cc|c} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array} \right] $$

    shows that there is no solution.
b) Applying Gram-Schmidt, we find an orthogonal basis consisting of ${\mathbf w}_1=\left[\begin{array}{c}1 \\ 2 \\ -1 \end{array}\right]$ and ${\mathbf w}_2=\left[\begin{array}{r}0 \\ 1 \\ 2 \end{array}\right]$.
c) The projection formula gives $\widehat{{\mathbf b}} = \left[\begin{array}{c}0 \\ -1 \\ -2 \end{array}\right]$.
d) The equation is consistent because $\widehat{{\mathbf b}}$ is in $\text{Col}(A)$. We find the solution ${\mathbf x}=\left[\begin{array}{r}2 \\ -1 \end{array}\right]$.
:::

## 6.5.2 A first example

When we've encountered inconsistent systems in the past, we've simply said there is no solution and moved on. The preview activity, however, shows how we can find approximate solutions to an inconsistent system: if there are no solutions to $A{\mathbf x} = {\mathbf b}$, we instead solve the consistent system $A{\mathbf x} = \widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}$ onto $\text{Col}(A)$. As we'll see, this solution is, in a specific sense, the best possible.

:::activity {act:activity-6-5-2} Activity 6.5.2
Suppose we have three data points $(1,1)$, $(2,1)$, and $(3,3)$ and that we would like to find a line passing through them.

a) 
    Plot these three points in [Figure 6.5.2](ref:fig-ls-empty). Are you able to draw a line that passes through all three points?

    > FIGURE {fig:fig-ls-empty} number=6.5.2 src=../../media/ch06/empty-ls.svg
    > alt: A two dimensional coordinate grid and set of axes.
    > width: 50%
    > caption: Plot the three data points here.

b) 
    Remember that the equation of a line can be written as $b + mx=y$ where $m$ is the slope and $b$ is the $y$-intercept. We will try to find $b$ and $m$ so that the three points lie on the line.

    The first data point $(1,1)$ gives an equation for $b$ and $m$. In particular, we know that when $x=1$, then $y=1$ so we have $b + m(1) = 1$ or $b + m = 1$. Use the other two data points to create a linear system describing $m$ and $b$.

c) 
    We have obtained a linear system having three equations, one from each data point, for the two unknowns $b$ and $m$. Identify a matrix $A$ and vector ${\mathbf b}$ so that the system has the form $A{\mathbf x}={\mathbf b}$, where ${\mathbf x}=\left[\begin{array}{c}b \\ m \end{array}\right]$.

    Notice that the unknown vector ${\mathbf x}=\left[\begin{array}{c}b \\ m \end{array}\right]$ describes the line that we seek.

d) 
    Is there a solution to this linear system? How does this question relate to your attempt to draw a line through the three points above?

    :::sage
    ```sage

    ```
    :::

e) 
    Since this system is inconsistent, we know that ${\mathbf b}$ is not in the column space $\text{Col}(A)$. Find an orthogonal basis for $\text{Col}(A)$ and use it to find the orthogonal projection $\widehat{\mathbf b}$ of ${\mathbf b}$ onto $\text{Col}(A)$.

f) 
    Since $\widehat{\mathbf b}$ is in $\text{Col}(A)$, the equation $A{\mathbf x} = \widehat{\mathbf b}$ is consistent. Find its solution ${\mathbf x} = \left[\begin{array}{c}b \\ m \end{array}\right]$ and sketch the line $y=b + mx$ in [Figure 6.5.2](ref:fig-ls-empty). We say that this is the line of best fit.

ANSWER:

a) 
    It's not possible to draw a line through all three points.

b) 
    We have the equations

    $$ \begin{aligned} b + m & {}={} 1 \\ b + 2m & {}={} 1 \\ b + 3m & {}={} 3 \end{aligned} $$

c) 
    We have $A = \begin{bmatrix} 1 & 1 \\ 1 & 2 \\ 1 & 3 \\ \end{bmatrix}$ and ${\mathbf b}=\left[\begin{array}{r}1 \\ 1 \\ 3 \end{array}\right]$.

d) 
    This linear system is inconsistent.

e) 
    $\widehat{{\mathbf b}}=\left[\begin{array}{r}2/3 \\ 5/3 \\ 8/3 \end{array}\right]$.

f) 
    ${\mathbf x}=\left[\begin{array}{r}-1/3 \\ 1 \end{array}\right]$. This line is shown in [](ref:fig-best-fit-line-ans).

    > FIGURE {fig:fig-best-fit-line-ans} number= src=../../media/ch06/line-regress-2.svg
    > alt: 
    > width: 50%
    > caption: The line that best approximates the three data points.

SOLUTION:

a) 
    After plotting the points, we see that it's not possible to draw a line through all three points.

b) 
    We have the equations

    $$ \begin{aligned} b + m & {}={} 1 \\ b + 2m & {}={} 1 \\ b + 3m & {}={} 3 \end{aligned} $$

c) 
    We have $A = \begin{bmatrix} 1 & 1 \\ 1 & 2 \\ 1 & 3 \\ \end{bmatrix}$ and ${\mathbf b}=\left[\begin{array}{r}1 \\ 1 \\ 3 \end{array}\right]$.

d) 
    Finding the reduced row echelon form of the associated augmented matrix tells us this is an inconsistent system. Since a solution would describe a line passing through the three points, we should expect this.

e) 
    Applying Gram-Schmidt gives us the orthogonal basis ${\mathbf w}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right]$ and ${\mathbf w}_2 = \left[\begin{array}{r}-1 \\ 0 \\ 1 \end{array}\right]$. Projecting ${\mathbf b}$ onto $\text{Col}(A)$ gives $\widehat{{\mathbf b}}=\left[\begin{array}{r}2/3 \\ 5/3 \\ 8/3 \end{array}\right]$.

f) 
    Solving the equation $A{\mathbf x} = \widehat{{\mathbf b}}$ gives ${\mathbf x}=\left[\begin{array}{c}-1/3 \\ 1 \end{array}\right]$, which describes a line having vertical intercept $b=-1/3$ and the slope $=1$. This line is shown in [](ref:fig-best-fit-line).

    > FIGURE {fig:fig-best-fit-line} number= src=../../media/ch06/line-regress-2.svg
    > alt: 
    > width: 50%
    > caption: The line that best approximates the three data points.

:::

This activity illustrates the idea behind a technique known as *orthogonal least squares*, which we have been working toward throughout this chapter. If the data points are denoted as $(x_i, y_i)$, we construct the matrix $A$ and vector ${\mathbf b}$ as

$$ A = \begin{bmatrix} 1 & x_1 \\ 1 & x_2 \\ 1 & x_3 \\ \end{bmatrix},\hspace{24pt} {\mathbf b} = \left[\begin{array}{r}y_1 \\ y_2 \\ y_3 \end{array}\right]\text{.} $$

With the vector ${\mathbf x}=\left[\begin{array}{c}b \\ m \end{array}\right]$ representing the line $b+mx = y$, we see that the equation $A{\mathbf x}={\mathbf b}$ describes a line passing through all the data points. In our activity, it is visually apparent that there is no such line, which agrees with the fact that the equation $A{\mathbf x}={\mathbf b}$ is inconsistent.

Remember that $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}$ onto $\text{Col}(A)$, is the closest vector in $\text{Col}(A)$ to ${\mathbf b}$. Therefore, when we solve the equation $A{\mathbf x}=\widehat{{\mathbf b}}$, we are finding the vector ${\mathbf x}$ so that $A{\mathbf x} = \left[\begin{array}{r}b+mx_1 \\ b+mx_2 \\ b+mx_3 \end{array}\right]$ is as close to ${\mathbf b}=\left[\begin{array}{r}y_1 \\ y_2 \\ y_3 \end{array}\right]$ as possible. Let's think about what this means within the context of this problem.

The difference ${\mathbf b}-A{\mathbf x} = \left[\begin{array}{r}y_1-(b+mx_1) \\ y_2-(b+mx_2) \\ y_3-(b+mx_3) \end{array}\right]$ so that the square of the distance between $A{\mathbf x}$ and ${\mathbf b}$ is

$$ \begin{aligned} \left|{\mathbf b} - A{\mathbf x}\right|^2 & = \\ & \left(y_1-(b+mx_1)\right)^2 + \left(y_2-(b+mx_2)\right)^2 + \left(y_3-(b+mx_3)\right)^2\text{.} \end{aligned} $$

Our approach finds the values for $b$ and $m$ that make this sum of squares as small as possible, which is why we call this a *least-squares* problem.

Drawing the line defined by the vector ${\mathbf x}=\left[\begin{array}{c}b \\ m \end{array}\right]$, the quantity $y_i - (b + mx_i)$ reflects the vertical distance between the line and the data point $(x_i, y_i)$, as shown in [Figure 6.5.3](ref:fig-least-squares-def). Seen in this way, the square of the distance $\left|{\mathbf b}-A{\mathbf x}\right|^2$ is a measure of how much the line defined by the vector ${\mathbf x}$ misses the data points. The solution to the least-squares problem is the line that misses the data points by the smallest amount possible.

> FIGURE {fig:fig-least-squares-def} number=6.5.3 src=../../media/ch06/line-regress-1.svg
> alt: Three data points, the least squares line, and vertical lines from the points to the line.
> width: 50%
> caption: The solution of the least-squares problem and the vertical distances between the line and the data points.

## 6.5.3 Solving least-squares problems

Now that we've seen an example of what we're trying to accomplish, let's put this technique into a more general framework.

Given an inconsistent system $A{\mathbf x} = {\mathbf b}$, we seek the vector ${\mathbf x}$ that minimizes the distance from $A{\mathbf x}$ to ${\mathbf b}$. In other words, ${\mathbf x}$ satisfies $A{\mathbf x} = \widehat{\mathbf b}$, where $\widehat{{\mathbf b}}$ is the orthogonal projection of ${\mathbf b}$ onto the column space $\text{Col}(A)$. We know the equation $A{\mathbf x}=\widehat{{\mathbf b}}$ is consistent since $\widehat{{\mathbf b}}$ is in $\text{Col}(A)$, and we know there is only one solution if we assume that the columns of $A$ are linearly independent.

We will usually denote the solution of $A{\mathbf x} = \widehat{{\mathbf b}}$ by $\widehat{{\mathbf x}}$ and call this vector the *least-squares approximate solution* of $A{\mathbf x}={\mathbf b}$ to distinguish it from a (possibly non-existent) solution of $A{\mathbf x}={\mathbf b}$.

There is an alternative method for finding $\widehat{{\mathbf x}}$ that does not involve first finding the orthogonal projection $\widehat{{\mathbf b}}$. Remember that $\widehat{{\mathbf b}}$ is defined by the fact that $\widehat{\mathbf b} - {\mathbf b}$ is orthogonal to $\text{Col}(A)$. In other words, $\widehat{{\mathbf b}}-{\mathbf b}$ is in the orthogonal complement $\text{Col}(A)^\perp$, which [Proposition 6.2.10](ref:6.2#prop-col-orthog) tells us is the same as $\text{Nul}(A^T)$. Since $\widehat{{\mathbf b}}-{\mathbf b}$ is in $\text{Nul}(A^T)$, it follows that

$$ A^T(\widehat{\mathbf b}-{\mathbf b}) = {\mathbf 0}\text{.} $$

Because the least-squares approximate solution is the vector $\widehat{{\mathbf x}}$ such that $A\widehat{{\mathbf x}} = \widehat{{\mathbf b}}$, we can rearrange this equation to see that

$$ \begin{aligned} A^T(A\widehat{{\mathbf x}} - {\mathbf b}) & = {\mathbf 0} \\ A^TA\widehat{{\mathbf x}} - A^T{\mathbf b} & = {\mathbf 0} \\ A^TA\widehat{{\mathbf x}} & = A^T{\mathbf b}\text{.} \end{aligned} $$

{index-entry:normal equation} This equation is called the *normal equation*, and we have the following proposition.

:::proposition {prop:proposition-6-5-4} Proposition 6.5.4
If the columns of $A$ are linearly independent, then there is a unique least-squares approximate solution $\widehat{{\mathbf x}}$ to the equation $A{\mathbf x}={\mathbf b}$ given by the normal equation

$$ A^TA\widehat{{\mathbf x}} = A^T{\mathbf b}\text{.} $$

:::

:::example {ex:example-6-5-5} Example 6.5.5
Consider the equation

$$ \begin{bmatrix} 2 & 1 \\ 2 & 0 \\ -1 & 3 \\ \end{bmatrix} {\mathbf x} = \left[\begin{array}{r}16 \\ -1 \\ 7 \end{array}\right] $$

with matrix $A$ and vector ${\mathbf b}$. Since this equation is inconsistent, we will find the least-squares approximate solution $\widehat{{\mathbf x}}$ by solving the normal equation $A^TA\widehat{{\mathbf x}} = A^T{\mathbf b}$, which has the form

$$ A^TA\widehat{{\mathbf x}} = \begin{bmatrix} 9 & -1 \\ -1 & 10 \\ \end{bmatrix} \widehat{{\mathbf x}} = \left[\begin{array}{r}23 \\ 37 \end{array}\right] = A^T{\mathbf b} $$

and the solution $\widehat{{\mathbf x}}=\left[\begin{array}{r}3 \\ 4 \end{array}\right]$.
:::

:::activity {act:activity-6-5-3} Activity 6.5.3
The rate at which a cricket chirps is related to the outdoor temperature, as reflected in some experimental data that we'll study in this activity. The chirp rate $C$ is expressed in chirps per second while the temperature $T$ is in degrees Fahrenheit. Evaluate the following cell to load the data:
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py', globals())
df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/crickets.csv')
data = [vector(row) for row in df.values]
chirps = vector(df['Chirps'])
temps = vector(df['Temperature'])
print(df)
list_plot(data, color='blue', size=40, xmin=12, xmax=22, ymin=60, ymax=100)

```
:::
Evaluating this cell also provides:

- 
    the vectors `chirps` and `temps` formed from the columns of the dataset.

- 
    the command `onesvec(n)`, which creates an $n$-dimensional vector whose entries are all one.

- 
    Remember that you can form a matrix whose columns are the vectors `v1` and `v2` with `matrix([v1, v2]).T`.

We would like to represent this relationship by a linear function

$$ \beta_0 + \beta_1 C = T\text{.} $$

a) 
    Use the first data point $(C_1,T_1)=(20.0,88.6)$ to write an equation involving $\beta_0$ and $\beta_1$.

b) 
    Suppose that we represent the unknowns using a vector ${\mathbf x} = \left[\begin{array}{r}\beta_0 \\ \beta_1 \end{array}\right]$. Use the 15 data points to create the matrix $A$ and vector ${\mathbf b}$ so that the linear system $A{\mathbf x}= {\mathbf b}$ describes the unknown vector ${\mathbf x}$.

    :::sage
    ```sage

    ```
    :::

c) 
    Write the normal equations $A^TA\widehat{{\mathbf x}} = A^T{\mathbf b}$; that is, find the matrix $A^TA$ and the vector $A^T{\mathbf b}$.

d) 
    Solve the normal equations to find $\widehat{{\mathbf x}}$, the least-squares approximate solution to the equation $A{\mathbf x}={\mathbf b}$. Call your solution `xhat` since `x` has another meaning in Sage.

    :::sage
    ```sage

    ```
    :::

    What are the values of $\beta_0$ and $\beta_1$ that you found?

e) 
    If the chirp rate is 22 chirps per second, what is your prediction for the temperature?

    You can plot the data and your line, assuming you called the solution `xhat`, using the cell below.

    :::sage
    ```sage
    plot_model(xhat, data, domain=(12, 22))

    ```
    :::

ANSWER:

a) 
    $\beta_0 + 20.0\beta_1 = 88.6$.

b) 
    $A$ is the $15\times2$ matrix whose first column consists only of 1's and whose second column is the vector of chirp rates. The vector ${\mathbf b}$ is the vector of temperatures.

c) 
    $A^TA=\begin{bmatrix} 15.0 & 248.5 \\ 248.5 & 4157.9 \\ \end{bmatrix}$ and $A^T{\mathbf b} = \left[\begin{array}{r}1190.2 \\ 19857.7 \end{array}\right]$

d) 
    $\widehat{{\mathbf x}} = \left[\begin{array}{r}\beta_0 \\ \beta_1 \end{array}\right] = \left[\begin{array}{r}22.8 \\ 3.4 \end{array}\right]$.

e) 
    $97.9$ degrees.

SOLUTION:

a) 
    We have the equation $\beta_0 + 20.0\beta_1 = 88.6$.

b) 
    $A$ is the $15\times2$ matrix whose first column consists only of 1's and whose second column is the vector of chirp rates. The vector ${\mathbf b}$ is the vector of temperatures.

c) 
    $A^TA=\begin{bmatrix} 15.0 & 248.5 \\ 248.5 & 4157.9 \\ \end{bmatrix}$ and $A^T{\mathbf b} = \left[\begin{array}{r}1190.2 \\ 19857.7 \end{array}\right]$

d) 
    $\widehat{{\mathbf x}} = \left[\begin{array}{r}\beta_0 \\ \beta_1 \end{array}\right] = \left[\begin{array}{r}22.8 \\ 3.4 \end{array}\right]$.

e) 
    The predicted temperature is $\beta_0 + 22\beta_1 = 97.9$ degrees.

:::

This example demonstrates an approach, called *linear regression*, in which a collection of data is modeled using a linear function found by solving a least-squares problem. Once we have the linear function that best fits the data, we can make predictions about situations that we haven't encountered in the data.

If we're going to use our function to make predictions, it's natural to ask how much confidence we have in these predictions. This is a statistical question that leads to a rich and well-developed theory^[For example, see Gareth James, Daniela Witten, Trevor Hastie, Robert Tibshirani. *An Introduction to Statistical Learning: with Applications in R.* Springer, 2013.], which we won't explore in much detail here. However, there is one simple measure of how well our linear function fits the data that is known as the coefficient of determination and denoted by $R^2$.

We have seen that the square of the distance $\left|{\mathbf b}-A{\mathbf x}\right|^2$ measures the amount by which the line fails to pass through the data points. When the line is close to the data points, we expect this number to be small. However, the size of this measure depends on the scale of the data. For instance, the two lines shown in [Figure 6.5.6](ref:fig-regression-scale) seem to fit the data equally well, but $|{\mathbf b}-A\widehat{{\mathbf x}}|^2$ is 100 times larger on the right.

> FIGURE {fig:fig-regression-scale} number=6.5.6 src=../../media/ch06/line-regress-1.svg
> alt: Three data points, the least squares line, and vertical line segments from the points to the line.
> caption: The lines appear to fit equally well in spite of the fact that $\left|{\mathbf b}-A\widehat{{\mathbf x}}\right|^2$ differs by a factor of 100.
> subfigure src=../../media/ch06/line-regress-1.svg alt: Three data points, the least squares line, and vertical line segments from the points to the line.
> subfigure src=../../media/ch06/line-regress-10.svg alt: A similar set of three data points whose coordinates have been multiplied by a factor of 10.

The coefficient of determination $R^2$ is defined by normalizing $|{\mathbf b}-A\widehat{{\mathbf x}}|^2$ so that it is independent of the scale. Recall that we described how to demean a vector in [Section 6.1](ref:6.1#sec-dot-product): given a vector ${\mathbf v}$, we obtain $\widetilde{{\mathbf v}}$ by subtracting the average of the components from each component.

:::definition {def:definition-6-5-7} Definition 6.5.7 (Coefficient of determination)
{index-entry:coefficient of determination} {index-entry:R squared} The coefficient of determination is

$$ R^2 = 1 - \frac{|{\mathbf b} - A\widehat{{\mathbf x}}|^2} {|\widetilde{{\mathbf b}}|^2}, $$

where $\widetilde{{\mathbf b}}$ is the vector obtained by demeaning ${\mathbf b}$.
:::

A more complete explanation of this definition relies on the concept of variance, which we explore in [Exercise 6.5.12](ref:ex-r2-meaning) and the next chapter. For the time being, it's enough to know that $0\leq R^2 \leq 1$ and that the closer $R^2$ is to 1, the better the line fits the data. In our original example, illustrated in [Figure 6.5.6](ref:fig-regression-scale), we find that $R^2 = 0.75$, and in our study of cricket chirp rates, we have $R^2=0.69$. However, assessing the confidence we have in predictions made by solving a least-squares problem can require considerable thought, and it would be naive to rely only on the value of $R^2$.

## 6.5.4 Using $QR$ factorizations

As we've seen, the least-squares approximate solution $\widehat{{\mathbf x}}$ to $A{\mathbf x}={\mathbf b}$ may be found by solving the normal equation $A^TA\widehat{{\mathbf x}} = A^T{\mathbf b}$, and this can be a practical strategy for some problems. However, this approach can be problematic as small rounding errors can accumulate and lead to inaccurate final results.

As the next activity demonstrates, there is an alternate method for finding the least-squares approximate solution $\widehat{{\mathbf x}}$ using a $QR$ factorization of the matrix $A$, and this method is preferable as it is numerically more reliable.

:::activity {act:activity-BFI} Activity 6.5.4

a) 
    Suppose we are interested in finding the least-squares approximate solution to the equation $A{\mathbf x} = {\mathbf b}$ and that we have the $QR$ factorization $A=QR$. Explain why the least-squares approximate solution is given by solving

    $$ \begin{aligned} A\widehat{{\mathbf x}} & = QQ^T{\mathbf b} \\ \\ QR\widehat{{\mathbf x}} & = QQ^T{\mathbf b} \\ \end{aligned} $$

b) 
    Multiply both sides of the second expression by $Q^T$ and explain why

    $$ R\widehat{{\mathbf x}} = Q^T{\mathbf b}. $$

    Since $R$ is upper triangular, this is a relatively simple equation to solve using back substitution, as we saw in [Section 5.1](ref:5.1#sec-gaussian-revisited). We will therefore write the least-squares approximate solution as

    $$ \widehat{{\mathbf x}} = R^{-1}Q^T{\mathbf b}, $$

    and put this to use in the following context.

c) 
    Brozak’s formula, which is used to calculate a person's body fat index $BFI$, is

    $$ BFI = 100 \left(\frac{4.57}{\rho} - 4.142\right) $$

    where $\rho$ denotes a person's body density in grams per cubic centimeter. Obtaining an accurate measure of $\rho$ is difficult, however, because it requires submerging the person in water and measuring the volume of water displaced. Instead, we will gather several other body measurements, which are more easily obtained, and use it to predict $BFI$.

    For instance, suppose we take 10 patients and measure their weight $w$ in pounds, height $h$ in inches, abdomen $a$ in centimeters, wrist circumference $r$ in centimeters, neck circumference $n$ in centimeters, and $BFI$. Evaluating the following cell loads and displays the data.

    :::sage
    ```sage
    sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py', globals())
    df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/bfi.csv')
    weight = vector(df['Weight'])
    height = vector(df['Height'])
    abdomen = vector(df['Abdomen'])
    wrist = vector(df['Wrist'])
    neck = vector(df['Neck'])
    BFI = vector(df['BFI'])
    print(df)

    ```
    :::

    In addition, that cell provides:

    a) 
        vectors `weight`, `height`, `abdomen`, `wrist`, `neck`, and `BFI` formed from the columns of the dataset.

    b) 
        the command `onesvec(n)`, which returns an $n$-dimensional vector whose entries are all one.

    c) 
        the command `QR(A)` that returns the $QR$ factorization of $A$ as `Q, R = QR(A)`.

    d) 
        the command `demean(v)`, which returns the demeaned vector $\widetilde{{\mathbf v}}$.

    We would like to find the linear function

    $$ \beta_0 + \beta_1w + \beta_2h + \beta_3a + \beta_4r + \beta_5n = BFI $$

    that best fits the data.

    Use the first data point to write an equation for the parameters $\beta_0,\beta_1,\ldots,\beta_5$.

d) 
    Describe the linear system $A{\mathbf x} = {\mathbf b}$ for these parameters. More specifically, describe how the matrix $A$ and the vector ${\mathbf b}$ are formed.

e) 
    Construct the matrix $A$ and find its $QR$ factorization in the cell below.

    :::sage
    ```sage

    ```
    :::

f) 
    Find the least-squares approximate solution $\widehat{{\mathbf x}}$ by solving the equation $R\widehat{{\mathbf x}} = Q^T{\mathbf b}$. You may want to use `N(xhat)` to display a decimal approximation of the vector. What are the parameters $\beta_0,\beta_1,\ldots,\beta_5$ that best fit the data?

g) 
    Find the coefficient of determination $R^2$ for your parameters. What does this imply about the quality of the fit?

    :::sage
    ```sage

    ```
    :::

h) 
    Suppose a person's measurements are: weight 190, height 70, abdomen 90, wrist 18, and neck 35. Estimate this person's $BFI$.

ANSWER:

a) 
    Use the fact that $\widehat{{\mathbf b}}=QQ^T{\mathbf b}$.

b) 
    Use the fact that $Q^TQ=I$.

c) 
    $\beta_0 + 154\beta_1 + 68\beta_2 + 85\beta_3 + 17\beta_4 + 36\beta_5 = 13$

d) 
    $A$ is the $10\times6$ matrix whose columns are a vector of all 1's followed by the vectors of weights, heights, abdominal, wrist, and neck measurements. The vector ${\mathbf b}$ is the vector of BFI readings.

e) 
    $Q$ is a $10\times6$ matrix and $R$ is a $6\times6$ upper triangular matrix.

f) 
    We find that

    $$ \beta_0 = 54.08, \beta_1 = 0.19, \beta_2 = -2.62, \beta_3 = 0.92, \beta_4 = 2.70, \beta_5 = -0.41 $$

g) 
    $R^2=0.95$

h) 
    Evaluating $\beta_0 + 190\beta_1 + 70\beta_2 + 90\beta_3 + 18\beta_4 + 35\beta_5 = 22.9$

SOLUTION:

a) 
    The columns of $Q$ form an orthonormal basis for $\text{Col}(A)$ so that $\widehat{{\mathbf b}}=QQ^T{\mathbf b}$. The equation $A\widehat{{\mathbf x}}=\widehat{{\mathbf b}}$ then becomes $QR\widehat{{\mathbf x}}=QQ^T{\mathbf b}$.

b) 
    Since $Q^TQ=I$, we have $Q^TQR\widehat{{\mathbf x}} = Q^TQQ^T{\mathbf b}$, which gives $R\widehat{{\mathbf x}} = Q^T{\mathbf b}$.

c) 
    $\beta_0 + 154\beta_1 + 68\beta_2 + 85\beta_3 + 17\beta_4 + 36\beta_5 = 13$

d) 
    $A$ is the $10\times6$ matrix whose columns are a vector of all 1's followed by the vectors of weights, heights, abdominal, wrist, and neck measurements. The vector ${\mathbf b}$ is the vector of BFI readings.

e) 
    $Q$ is a $10\times6$ matrix and $R$ is a $6\times6$ upper triangular matrix.

f) 
    We find that

    $$ \beta_0 = 54.08, \beta_1 = 0.19, \beta_2 = -2.62, \beta_3 = 0.92, \beta_4 = 2.70, \beta_5 = -0.41 $$

g) 
    $R^2=0.95$

h) 
    Evaluating $\beta_0 + 190\beta_1 + 70\beta_2 + 90\beta_3 + 18\beta_4 + 35\beta_5 = 22.9$

:::

To summarize, we have seen that

:::proposition {prop:proposition-6-5-8} Proposition 6.5.8
If the columns of $A$ are linearly independent and we have the $QR$ factorization $A=QR$, then the least-squares approximate solution $\widehat{{\mathbf x}}$ to the equation $A{\mathbf x}={\mathbf b}$ is given by

$$ \widehat{{\mathbf x}} = R^{-1}Q^T{\mathbf b}\text{.} $$

:::

## 6.5.5 Polynomial Regression

In the examples we've seen so far, we have fit a linear function to a dataset. Sometimes, however, a polynomial, such as a quadratic function, may be more appropriate. It turns out that the techniques we've developed in this section are still useful as the next activity demonstrates.

:::activity {act:activity-6-5-5} Activity 6.5.5

a) 
    Suppose that we have a small dataset containing the points $(0,2)$, $(1,1)$, $(2,3)$, and $(3,3)$, such as appear when the following cell is evaluated.

    :::sage
    ```sage
    sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py',
    globals())
    data = [[0, 2], [1, 1], [2, 3], [3, 3]]
    list_plot(data, color='blue', size=40)

    ```
    :::

    In addition to loading and plotting the data, evaluating that cell provides the following commands:

    - 
        `Q, R = QR(A)` returns the $QR$ factorization of $A$.

    - 
        `demean(v)` returns the demeaned vector $\widetilde{{\mathbf v}}$.

    Let's fit a quadratic function of the form

    $$ \beta_0 + \beta_1 x + \beta_2 x^2 = y $$

    to this dataset.

    Write four equations, one for each data point, that describe the coefficients $\beta_0$, $\beta_1$, and $\beta_2$.

b) 
    Express these four equations as a linear system $A{\mathbf x} = {\mathbf b}$ where ${\mathbf x} = \left[\begin{array}{r}\beta_0 \\ \beta_1 \\ \beta_2 \end{array}\right]$.

    Find the $QR$ factorization of $A$ and use it to find the least-squares approximate solution $\widehat{{\mathbf x}}$.

    :::sage
    ```sage

    ```
    :::

c) 
    Use the parameters $\beta_0$, $\beta_1$, and $\beta_2$ that you found to write the quadratic function that fits the data. You can plot this function, along with the data, by entering your function in the place indicated below.

    :::sage
    ```sage
    list_plot(data, color='blue', size=40) + plot( **your function here**,
    0, 3, color='red')

    ```
    :::

d) 
    What is your predicted $y$ value when $x=1.5$?

e) 
    Find the coefficient of determination $R^2$ for the quadratic function. What does this say about the quality of the fit?

f) 
    Now fit a cubic polynomial of the form

    $$ \beta_0 + \beta_1x + \beta_2 x^2 + \beta_3x^3 = y $$

    to this dataset.

    :::sage
    ```sage

    ```
    :::

g) 
    Find the coefficient of determination $R^2$ for the cubic function. What does this say about the quality of the fit?

h) 
    What do you notice when you plot the cubic function along with the data? How does this reflect the value of $R^2$ that you found?

    :::sage
    ```sage
    list_plot(data, color='blue', size=40) + plot( **your function here**,
    0, 3, color='red')

    ```
    :::

ANSWER:

a) 
    We have the equations

    $$ \begin{aligned} \beta_0 + 0\beta_1 + 0^2\beta_2 & {}={} 2 \\ \beta_0 + 1\beta_1 + 1^2\beta_2 & {}={} 1 \\ \beta_0 + 2\beta_1 + 2^2\beta_2 & {}={} 3 \\ \beta_0 + 3\beta_1 + 3^2\beta_2 & {}={} 3 \end{aligned} $$

b) 
    $\widehat{{\mathbf x}} = \left[\begin{array}{r}7/4 \\ -1/4 \\ 1/4 \end{array}\right]$

c) 
    $\frac74 - \frac14 x + \frac14x^2 = y$.

d) 
    $1.9375$.

e) 
    $0.54$

f) 
    $2-\frac{25}{6}x+4x^2-\frac56x^3 = y$.

g) 
    $R^2=1$

h) 
    The graph of the cubic function passes through each data point.

SOLUTION:

a) 
    We have the equations

    $$ \begin{aligned} \beta_0 + 0\beta_1 + 0^2\beta_2 & {}={} 2 \\ \beta_0 + 1\beta_1 + 1^2\beta_2 & {}={} 1 \\ \beta_0 + 2\beta_1 + 2^2\beta_2 & {}={} 3 \\ \beta_0 + 3\beta_1 + 3^2\beta_2 & {}={} 3 \end{aligned} $$

b) 
    With $A=\begin{bmatrix} 1 & 0 & 0 \\ 1 & 1 & 1 \\ 1 & 2 & 4 \\ 1 & 3 & 9 \\ \end{bmatrix}$ and ${\mathbf b}=\left[\begin{array}{r}2 \\ 1 \\ 3 \\ 3 \end{array}\right]$, we find $\widehat{{\mathbf x}} = \left[\begin{array}{r}7/4 \\ -1/4 \\ 1/4 \end{array}\right]$

c) 
    The quadratic function is $\frac74 - \frac14 x + \frac14x^2 = y$.

d) 
    The predicted value is $y=\frac74 - \frac14(1.5)+\frac14(1.5)^2 = 1.9375$.

e) 
    $R^2 = 0.54$

f) 
    We find $2-\frac{25}{6}x+4x^2-\frac56x^3 = y$.

g) 
    $R^2=1$, which means that we have a perfect fit.

h) 
    The graph of the cubic function passes through each data point.

:::

The matrices $A$ that you created in the last activity when fitting a quadratic and cubic function to a dataset have a special form. In particular, if the data points are labeled $(x_i, y_i)$ and we seek a degree $k$ polynomial, then

$$ A = \begin{bmatrix} 1 & x_1 & x_1^2 & \ldots & x_1^k \\ 1 & x_2 & x_2^2 & \ldots & x_2^k \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ 1 & x_m & x_m^2 & \ldots & x_m^k \\ \end{bmatrix}. $$

This is called a *Vandermonde* matrix of degree $k$.

:::activity {act:activity-6-5-6} Activity 6.5.6
This activity explores a dataset describing Arctic sea ice and that comes from [sustainabilitymath.org](http://sustainabilitymath.org/)
Evaluating the cell below will plot the extent of Arctic sea ice, in millions of square kilometers, during the twelve months of 2012.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py', globals())
df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/sea_ice.csv')
data = [vector([row[0], row[2]]) for row in df.values]
month = vector(df['Month'])
ice = vector(df['2012'])
print(df[['Month', '2012']])
list_plot(data, color='blue', size=40)

```
:::
In addition, you have access to a few special variables and commands:

- 
    `month` is the vector of month values and `ice` is the vector of sea ice values from the table above.

- 
    `vandermonde(x, k)` constructs the Vandermonde matrix of degree $k$ using the points in the vector `x`.

- 
    `Q, R = QR(A)` provides the $QR$ factorization of $A$.

- 
    `demean(v)` returns the demeaned vector $\widetilde{{\mathbf v}}$.

a) 
    Find the vector $\widehat{{\mathbf x}}$, the least-squares approximate solution to the linear system that results from fitting a degree 5 polynomial to the data.

    :::sage
    ```sage

    ```
    :::

b) 
    If your result is stored in the variable `xhat`, you may plot the polynomial and the data together using the following cell.

    :::sage
    ```sage
    plot_model(xhat, data)

    ```
    :::

c) 
    Find the coefficient of determination $R^2$ for this polynomial fit.

d) 
    Repeat these steps to fit a degree 8 polynomial to the data, plot the polynomial with the data, and find $R^2$.

    :::sage
    ```sage

    ```
    :::

e) 
    Repeat one more time by fitting a degree 11 polynomial to the data, creating a plot, and finding $R^2$.

    :::sage
    ```sage

    ```
    :::

    It's certainly true that higher degree polynomials fit the data better, as seen by the increasing values of $R^2$, but that's not always a good thing. For instance, when $k=11$, you may notice that the graph of the polynomial wiggles a little more than we would expect. In this case, the polynomial is trying too hard to fit the data, which usually contains some uncertainty, especially if it's obtained from measurements. The error built in to the data is called *noise,* and its presence means that we shouldn't expect our polynomial to fit the data perfectly. When we choose a polynomial whose degree is too high, we give the noise too much weight in the model, which leads to some undesirable behavior, like the wiggles in the graph.

    Fitting the data with a polynomial whose degree is too high is called *overfitting*, a phenomenon that can appear in many machine learning applications. Generally speaking, we would like to choose $k$ large enough to capture the essential features of the data but not so large that we overfit and build the noise into the model. There are ways to determine the optimal value of $k$, but we won't pursue that here.

f) 
    Choosing a reasonable value of $k$, estimate the extent of Arctic sea ice at month 6.5, roughly at the Summer Solstice.

ANSWER:

a) 
    $\widehat{{\mathbf x}} = \begin{bmatrix} 17.4\\-7.1\\4.5\\-1.1\\0.1\\-0.003 \end{bmatrix}$

b) 
    The fifth degree polynomial fits the data fairly well.

c) 
    $R^2=0.99$

d) 
    $R^2=0.9997$.

e) 
    $R^2=1$

f) 
    $8.7$ million square kilometers of sea ice.

SOLUTION:

a) 
    $\widehat{{\mathbf x}} = \begin{bmatrix} 17.4\\-7.1\\4.5\\-1.1\\0.1\\-0.003 \end{bmatrix}$

b) 
    The fifth degree polynomial fits the data fairly well.

c) 
    $R^2=0.99$

d) 
    $R^2=0.9997$.

e) 
    $R^2=1$

f) 
    $k=5$ seems like a good choice, and this gives the prediction of $8.7$ million square kilometers of sea ice.

:::

## 6.5.6 Summary

This section introduced some types of least-squares problems and a framework for working with them.

- 
    Given an inconsistent system $A{\mathbf x}={\mathbf b}$, we find $\widehat{{\mathbf x}}$, the least-squares approximate solution, by requiring that $A\widehat{{\mathbf x}}$ be as close to ${\mathbf b}$ as possible. In other words, $A\widehat{{\mathbf x}} = \widehat{{\mathbf b}}$ where $\widehat{{\mathbf b}}$ is the orthogonal projection of ${\mathbf b}$ onto $\text{Col}(A)$.

- 
    One way to find $\widehat{{\mathbf x}}$ is by solving the normal equations $A^TA\widehat{{\mathbf x}} = A^T{\mathbf b}.$ This is not our preferred method since numerical problems can arise.

- 
    A second way to find $\widehat{{\mathbf x}}$ uses a $QR$ factorization of $A$. If $A=QR$, then $\widehat{{\mathbf x}} = R^{-1}Q^T{\mathbf b}$ and finding $R^{-1}$ is computationally feasible since $R$ is upper triangular.

- 
    This technique may be applied widely and is useful for modeling data. We saw examples in this section where linear functions of several input variables and polynomials provided effective models for different datasets.

- 
    A simple measure of the quality of the fit is the coefficient of determination $R^2$ though some additional thought should be given in real applications.

## 6.5.7 Exercises

Evaluating the following cell loads in some commands that will be helpful in the following exercises. In particular, there are commands:

- 
    `QR(A)` that returns the $QR$ factorization of `A` as `Q, R = QR(A)`,

- 
    `onesvec(n)` that returns the $n$-dimensional vector whose entries are all 1,

- 
    `demean(v)` that demeans the vector `v`,

- 
    `vandermonde(x, k)` that returns the Vandermonde matrix of degree $k$ formed from the components of the vector `x`, and

- 
    `plot_model(xhat, data)` that plots the `data` and the model `xhat`.

:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py', globals())

```
:::

:::exercise {exercise-6-5-001} number=6.5.1 answered=yes src=src/exercises/exercises6-5.xml:49
PROBLEM:
Suppose we write the linear system

$$ \begin{bmatrix} 1 & -1 \\ 2 & -1 \\ -1 & 3 \end{bmatrix} {\mathbf x} = \left[\begin{array}{r}-8 \\ 5 \\ -10 \end{array}\right] $$

as $A{\mathbf x}={\mathbf b}$.

a) 
    Find an orthogonal basis for $\text{Col}(A)$.

b) 
    Find $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}$ onto $\text{Col}(A)$.

c) 
    Find a solution to the linear system $A{\mathbf x} = \widehat{{\mathbf b}}$.

ANSWER:

a) 
    ${\mathbf w}_1=\left[\begin{array}{r}1 \\ 2 \\ -1 \end{array}\right]$ and ${\mathbf w}_2=\left[\begin{array}{r}0 \\ 1 \\ 2 \end{array}\right]$

b) 
    $\widehat{{\mathbf b}} = \left[\begin{array}{r}2 \\ 1 \\ -8 \end{array}\right]$.

c) 
    ${\mathbf x}=\left[\begin{array}{r}-1 \\ -3 \end{array}\right]$.

SOLUTION:

a) 
    Applying Gram-Schmidt gives the orthogonal basis

    $$ {\mathbf w}_1=\left[\begin{array}{r}1 \\ 2 \\ -1 \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}0 \\ 1 \\ 2 \end{array}\right] $$

b) 
    Applying the Projection Formula gives $\widehat{{\mathbf b}} = \left[\begin{array}{r}2 \\ 1 \\ -8 \end{array}\right]$.

c) 
    Solving the linear system gives ${\mathbf x}=\left[\begin{array}{r}-1 \\ -3 \end{array}\right]$.

:::

:::exercise {exercise-6-5-002} number=6.5.2 answered=yes src=src/exercises/exercises6-5.xml:134 label=ex-lst-squares-line
PROBLEM:
Consider the data in [Table 6.5.9](ref:table-lst-squares-line).
> TABLE {tab:table-lst-squares-line} number=6.5.9 cols=2
> caption: A dataset with four points.
|  |  |
| --- | --- |
| $x$ | $y$ |
| 1 | 1 |
| 2 | 1 |
| 3 | 1 |
| 4 | 2 |
:::sage
```sage

```
:::

a) 
    Set up the linear system $A{\mathbf x}={\mathbf b}$ that describes the line $b + mx = y$ passing through these points.

b) 
    Write the normal equations that describe the least-squares approximate solution to $A{\mathbf x}={\mathbf b}$.

c) 
    Find the least-squares approximate solution $\widehat{{\mathbf x}}$ and plot the data and the resulting line.

d) 
    What is your predicted $y$-value when $x=3.5$?

e) 
    Find the coefficient of determination $R^2$.

ANSWER:

a) 
    $A=\begin{bmatrix} 1 & 1 \\ 1 & 2 \\ 1 & 3 \\ 1 & 4 \\ \end{bmatrix}$, ${\mathbf b}=\left[\begin{array}{r}1 \\ 1 \\ 1 \\ 2 \end{array}\right]$.

b) 
    $\begin{bmatrix} 4 & 10 \\ 10 & 30 \\ \end{bmatrix} \widehat{{\mathbf x}} = \left[\begin{array}{r}5 \\ 14 \end{array}\right]$

c) 
    $\widehat{{\mathbf x}} = \left[\begin{array}{r}1/2 \\ 3/10 \end{array}\right]$

d) 
    $1.55$.

e) 
    $R^2=0.6$

SOLUTION:

a) 
    The matrix $A=\begin{bmatrix} 1 & 1 \\ 1 & 2 \\ 1 & 3 \\ 1 & 4 \\ \end{bmatrix}$ and the vector ${\mathbf b}=\left[\begin{array}{r}1 \\ 1 \\ 1 \\ 2 \end{array}\right]$.

b) 
    $\begin{bmatrix} 4 & 10 \\ 10 & 30 \\ \end{bmatrix} \widehat{{\mathbf x}} = \left[\begin{array}{r}5 \\ 14 \end{array}\right]$

c) 
    $\widehat{{\mathbf x}} = \left[\begin{array}{r}1/2 \\ 3/10 \end{array}\right]$

d) 
    The predicted value is $y=1/2 + 3/10*3.5 = 1.55$.

e) 
    $R^2=0.6$

:::

:::exercise {exercise-6-5-003} number=6.5.3 answered=yes src=src/exercises/exercises6-5.xml:295
PROBLEM:
Consider the four points in [Table 6.5.9](ref:table-lst-squares-line).
:::sage
```sage

```
:::

a) 
    Set up a linear system $A{\mathbf x} = {\mathbf b}$ that describes a quadratic function

    $$ \beta_0+\beta_1x+\beta_2x^2 = y $$

    passing through the points.

b) 
    Use a $QR$ factorization to find the least-squares approximate solution $\widehat{{\mathbf x}}$ and plot the data and the graph of the resulting quadratic function.

c) 
    What is your predicted $y$-value when $x=3.5$?

d) 
    Find the coefficient of determination $R^2$.

SOLUTION:

a) 
    We have the Vandermonde matrix $A = \begin{bmatrix} 1 & 1 & 1 \\ 1 & 2 & 4 \\ 1 & 3 & 9 \\ 1 & 4 & 16\\ \end{bmatrix}$ and vector ${\mathbf b}=\left[\begin{array}{r}1 \\ 1 \\ 1 \\ 2 \end{array}\right]$.

b) 
    The quadratic function is $1.75 - 0.95x + 0.25x^2$.

c) 
    This gives the predicted value $1.75 - 0.95(3.5) + 0.25(3.5)^2=1.488$.

d) 
    $R^2=0.93$

:::

:::exercise {exercise-6-5-004} number=6.5.4 answered=yes src=src/exercises/exercises6-5.xml:374
PROBLEM:
Consider the data in [Table 6.5.10](ref:table-lst-squares-multi).
> TABLE {tab:table-lst-squares-multi} number=6.5.10 cols=3
> caption: A simple dataset
|  |  |  |
| --- | --- | --- |
| $x_1$ | $x_2$ | $y$ |
| 1 | 1 | 4.2 |
| 1 | 2 | 3.3 |
| 2 | 1 | 5.9 |
| 2 | 2 | 5.1 |
| 3 | 2 | 7.5 |
| 3 | 3 | 6.3 |
:::sage
```sage

```
:::

a) 
    Set up a linear system $A{\mathbf x} = {\mathbf b}$ that describes the relationship

    $$ \beta_0 + \beta_1 x_1 + \beta_2 x_2 = y. $$

b) 
    Find the least-squares approximate solution $\widehat{{\mathbf x}}$.

c) 
    What is your predicted $y$-value when $x_1 = 2.4$ and $x_2=2.9$?

d) 
    Find the coefficient of determination $R^2$.

ANSWER:

a) 
    $\begin{bmatrix} 1 & 1 & 1 \\ 1 & 1 & 2 \\ 1 & 2 & 1 \\ 1 & 2 & 2 \\ 1 & 3 & 2 \\ 1 & 3 & 3 \\ \end{bmatrix} {\mathbf x} = \begin{bmatrix} 4.2 \\ 3.3 \\ 5.9 \\ 5.1 \\ 7.5 \\ 6.3 \end{bmatrix}$

b) 
    $\widehat{{\mathbf x}}=\left[\begin{array}{r}2.95 \\ 2.00 \\ -0.85 \end{array}\right]$

c) 
    $2.95+2.00(2.4)-0.85(2.9) = 5.27$.

d) 
    $R^2=0.99$

SOLUTION:

a) 
    $\begin{bmatrix} 1 & 1 & 1 \\ 1 & 1 & 2 \\ 1 & 2 & 1 \\ 1 & 2 & 2 \\ 1 & 3 & 2 \\ 1 & 3 & 3 \\ \end{bmatrix} {\mathbf x} = \begin{bmatrix} 4.2 \\ 3.3 \\ 5.9 \\ 5.1 \\ 7.5 \\ 6.3 \end{bmatrix}$

b) 
    $\widehat{{\mathbf x}}=\left[\begin{array}{r}2.95 \\ 2.00 \\ -0.85 \end{array}\right]$

c) 
    $2.95+2.00(2.4)-0.85(2.9) = 5.27$.

d) 
    $R^2=0.99$

:::

:::exercise {exercise-6-5-005} number=6.5.5 answered=yes src=src/exercises/exercises6-5.xml:539
PROBLEM:
Determine whether the following statements are true or false and explain your thinking.

a) 
    If $A{\mathbf x}={\mathbf b}$ is consistent, then $\widehat{{\mathbf x}}$ is a solution to $A{\mathbf x}={\mathbf b}$.

b) 
    If $R^2=1$, then the least-squares approximate solution $\widehat{{\mathbf x}}$ is also a solution to the original equation $A{\mathbf x}={\mathbf b}$.

c) 
    Given the $QR$ factorization $A=QR$, we have $A\widehat{{\mathbf x}}=Q^TQ{\mathbf b}$.

d) 
    A $QR$ factorization provides a method for finding the least-squares approximate solution to $A{\mathbf x}={\mathbf b}$ that is more reliable than solving the normal equations.

e) 
    A solution to $AA^T{\mathbf x} = A{\mathbf b}$ is the least-squares approximate solution to $A{\mathbf x} = {\mathbf b}$.

ANSWER:

a) 
    True

b) 
    True

c) 
    False

d) 
    True

e) 
    False

SOLUTION:

a) 
    True. If $A{\mathbf x}={\mathbf b}$, then ${\mathbf b}$ is in $\text{Col}(A)$ so $A\widehat{{\mathbf x}} = \widehat{{\mathbf b}} = {\mathbf b}$.

b) 
    True. If $R^2 = 1 - \frac{|A\widehat{{\mathbf x}} - {\mathbf b}|^2} {|\widetilde{{\mathbf b}}|^2} = 1$, then $|A\widehat{{\mathbf x}}-{\mathbf b}| = 0$. Therefore, $A\widehat{{\mathbf x}} = {\mathbf b}$.

c) 
    False. The product $Q^TQ = I$ rather than the matrix that projects vectors orthogonally onto $\text{Col}(A)$.

d) 
    True, numerical issues are more likely to arise when solving the normal equations.

e) 
    False. The normal equations $A^TA\widehat{{\mathbf x}} = A^T{\mathbf b}$ gives the least-squares approximate solution.

:::

:::exercise {exercise-6-5-006} number=6.5.6 answered=yes src=src/exercises/exercises6-5.xml:635
PROBLEM:
Explain your response to the following questions.

a) 
    If $\widehat{{\mathbf x}}={\mathbf 0}$, what does this say about the vector ${\mathbf b}$?

b) 
    If the columns of $A$ are orthonormal, how can you easily find the least-squares approximate solution to $A{\mathbf x}={\mathbf b}$?

ANSWER:

a) 
    ${\mathbf b}$ is in $\text{Col}(A)^\perp = \text{Nul}(A^T)$.

b) 
    $\widehat{{\mathbf x}} = A^T{\mathbf b}$.

SOLUTION:

a) 
    Since $A\widehat{{\mathbf x}} = \widehat{{\mathbf b}}$ and $\widehat{{\mathbf x}} = {\mathbf 0}$, we know that $\widehat{{\mathbf b}}={\mathbf 0}$. This says that ${\mathbf b}$ is in $\text{Col}(A)^\perp = \text{Nul}(A^T)$.

b) 
    In this case, $\widehat{{\mathbf b}} = AA^T{\mathbf b}$, which means we have $A\widehat{{\mathbf x}} = AA^T{\mathbf b}$. If we multiply both sides by $A^T$, we have $\widehat{{\mathbf x}} = A^T{\mathbf b}$.

:::

:::exercise {exercise-6-5-007} number=6.5.7 answered=yes src=src/exercises/exercises6-5.xml:694
PROBLEM:
The following cell loads in some data showing the number of people in Bangladesh living without electricity over 27 years. It also defines vectors `year`, which records the years in the dataset, and `people`, which records the number of people.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py', globals())
df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/bangladesh.csv')
data = [vector(row) for row in df.values]
year = vector(df['Year'])
people = vector(df['People'])
print(df)
list_plot(data, size=40, color='blue')

```
:::

a) 
    Suppose we want to write

    $$ N = \beta_0 + \beta_1 t $$

    where $t$ is the year and $N$ is the number of people. Construct the matrix $A$ and vector ${\mathbf b}$ so that the linear system $A{\mathbf x}={\mathbf b}$ describes the vector ${\mathbf x}=\left[\begin{array}{r}\beta_0 \\ \beta_1 \end{array}\right]$.

b) 
    Using a $QR$ factorization of $A$, find the values of $\beta_0$ and $\beta_1$ in the least-squares approximate solution $\widehat{{\mathbf x}}$.

c) 
    What is the coefficient of determination $R^2$ and what does this tell us about the quality of the approximation?

d) 
    What is your prediction for the number of people living without electricity in 1985?

e) 
    Estimate the year in which there will be no people living without electricity.

ANSWER:

a) 
    The matrix $A$ will be the $27\times 2$ matrix whose first column is all 1's and whose second column is the vector of years. The vector ${\mathbf b}$ is the vector that records the number of people.

b) 
    $N = 3.88\times10^9 - 1.90\times10^6t$.

c) 
    $R^2=0.90$

d) 
    $1.14\times10^8$.

e) 
    2045

SOLUTION:

a) 
    The matrix $A$ will be the $27\times 2$ matrix whose first column is all 1's and whose second column is the vector of years. The vector ${\mathbf b}$ is the vector that records the number of people.

b) 
    We obtain $N = 3.88\times10^9 - 1.90\times10^6t$.

c) 
    $R^2=0.90$

d) 
    $3.88\times10^9 - 1.90\times10^6(1985) = 1.14\times10^8$.

e) 
    Solve $N = 3.88\times10^9 - 1.90\times10^6t=0$ to obtain 2045.

:::

:::exercise {exercise-6-5-008} number=6.5.8 answered=yes src=src/exercises/exercises6-5.xml:835
PROBLEM:
This problem concerns a dataset describing planets in our Solar system. For each planet, we have the length $L$ of the semi-major axis, essentially the distance from the planet to the Sun in AU (astronomical units), and the period $P$, the length of time in years required to complete one orbit around the Sun.
We would like to model this data using the function $P = CL^r$ where $C$ and $r$ are parameters we need to determine. Since this isn't a linear function, we will transform this relationship by taking the natural logarithm of both sides to obtain

$$ \ln(P) = \ln(C) + r\ln(L). $$

Evaluating the following cell loads the dataset and defines two vectors `logaxis`, whose components are $\ln(L)$, and `logperiod`, whose components are $\ln(P)$.
:::sage
```sage
import numpy as np
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py', globals())
df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/planets.csv',index_col=0)
logaxis = vector(np.log(df['Semi-major axis']))
logperiod = vector(np.log(df['Period']))
print(df)

```
:::

a) 
    Construct the matrix $A$ and vector ${\mathbf b}$ so that the solution to $A{\mathbf x}={\mathbf b}$ is the vector ${\mathbf x}=\left[\begin{array}{c}\ln(C) \\ r \end{array}\right]$.

b) 
    Find the least-squares approximate solution $\widehat{{\mathbf x}}$. What does this give for the values of $C$ and $r$?

c) 
    Find the coefficient of determination $R^2$. What does this tell us about the quality of the approximation?

d) Suppose that the orbit of an asteroid has a semi-major axis whose length is $L=4.0$ AU. Estimate the period $P$ of the asteroid's orbit.
e) 
    Halley's Comet has a period of $P=75$ years. Estimate the length of its semi-major axis.

ANSWER:

a) 
    The matrix $A$ is the $9\times2$ matrix whose first column is all 1's and whose second column is the vector of the logarithms of the semi-major axes. The vector ${\mathbf b}$ is the vector that records the logarithms of the periods.

b) 
    $C=0.996$ and $r=1.50$.

c) 
    $R^2=1.000$

d) 
    $7.99$ years.

e) 
    $17.9$ AU.

SOLUTION:

a) 
    The matrix $A$ is the $9\times2$ matrix whose first column is all 1's and whose second column is the vector of the logarithms of the semi-major axes. The vector ${\mathbf b}$ is the vector that records the logarithms of the periods.

b) 
    We find $\widehat{{\mathbf x}}=\left[\begin{array}{r}\ln(C) \\ r \end{array}\right] = \left[\begin{array}{r}-0.0036 \\ 1.501 \end{array}\right]$ so that $C=e^{-0.0036} = 0.996$ and $r=1.50$. This means that $P = 0.996L^{1.5}$.

c) 
    $R^2=1.000$, which means that we have a very good fit because this data reflects a physical law.

d) 
    $P = 0.996(4.0)^{1.5}=7.99$ years.

e) 
    The expression $\ln(P) = \ln(C) + r\ln(L)$ means that $\ln(76) = \ln(C) + r\ln(L)$. Solving for $L = 17.9$ AU.

:::

:::exercise {exercise-6-5-009} number=6.5.9 answered=yes src=src/exercises/exercises6-5.xml:993
PROBLEM:
Evaluating the following cell loads a dataset describing the temperature in the Earth's atmosphere at various altitudes. There are also two vectors `altitude`, expressed in kilometers, and `temperature`, in degrees Celsius.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py', globals())
df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/altitude-temps.csv')
data = [vector(row) for row in df.values]
altitude = vector(df['Altitude'])
temperature = vector(df['Temperature'])
print(df)
list_plot(data, size=40, color='blue')

```
:::

a) 
    Describe how to form the matrix $A$ and vector ${\mathbf b}$ so that the linear system $A{\mathbf x}={\mathbf b}$ describes a degree $k$ polynomial fitting the data.

b) 
    After choosing a value of $k$, construct the matrix $A$ and vector ${\mathbf b}$, and find the least-squares approximate solution $\widehat{{\mathbf x}}$.

c) 
    Plot the polynomial and data using `plot_model(xhat, data)`.

d) 
    Now examine what happens as you vary the degree of the polynomial $k$. Choose an appropriate value of $k$ that seems to capture the most important features of the data while avoiding overfitting, and explain your choice.

e) 
    Use your value of $k$ to estimate the temperature at an altitude of 55 kilometers.

ANSWER:

a) 
    The matrix $A$ will be the Vandermonde matrix of degree $k$ using the altitude readings while ${\mathbf b}$ is the vector of temperatures.

b) 
    $k=6$ appears to give a good fit without overfitting.

c) 
    We have

    $$ 18.0-10.3x+0.35x^2+0.0003x^3-0.0001x^4+1.5\times10^{-6}x^5 -4.7\times 10^{-9}x^6\text{.} $$

d) 
    A small value of $k$ does not adequately track important features of the data. If we increase $k$ too far, the graph tries too hard to match the data, and we see spurious features in the graph.

e) 
    We estimate the temperature to be $-7$ degrees Celsius.

SOLUTION:

a) 
    The matrix $A$ will be the Vandermonde matrix of degree $k$ using the altitude readings while ${\mathbf b}$ is the vector of temperatures.

b) 
    $k=6$ appears to give a good fit without overfitting.

c) 
    We have

    $$ 18.0-10.3x+0.35x^2+0.0003x^3-0.0001x^4+1.5\times10^{-6}x^5 -4.7\times 10^{-9}x^6\text{.} $$

d) 
    A small value of $k$ does not adequately track important features of the data. If we increase $k$ too far, the graph tries too hard to match the data, and we see spurious features in the graph.

e) 
    $k=6$ seems to work well. With this function, we estimate the temperature to be $-7$ degrees Celsius.

:::

:::exercise {exercise-6-5-010} number=6.5.10 answered=yes src=src/exercises/exercises6-5.xml:1149
PROBLEM:
The following cell loads some data describing 1057 houses in a particular real estate market. For each house, we record the living area in square feet, the lot size in acres, the age in years, and the price in dollars. The cell also defines variables `area`, `size`, `age`, and `price`.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py', globals())
df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/housing.csv',index_col=0)
df = df.fillna(df.mean())
area = vector(df['Living.Area'])
size = vector(df['Lot.Size'])
age = vector(df['Age'])
price = vector(df['Price'])
df

```
:::
We will use linear regression to predict the price of a house given its living area, lot size, and age:

$$ \beta_0 + \beta_1~\text{Living Area} + \beta_2~\text{Lot Size} + \beta_3~\text{Age} = \text{Price}. $$

a) 
    Use a $QR$ factorization to find the least-squares approximate solution $\widehat{{\mathbf x}}$.

b) 
    Discuss the significance of the signs of $\beta_1$, $\beta_2$, and $\beta_3$.

c) 
    If two houses are identical except for differing in age by one year, how would you predict that their prices compare to each another?

d) 
    Find the coefficient of determination $R^2$. What does this say about the quality of the fit?

e) 
    Predict the price of a house whose living area is 2000 square feet, lot size is 1.5 acres, and age is 50 years.

ANSWER:

a) 
    $\widehat{{\mathbf x}} = \left[\begin{array}{r}\beta_0 \\ \beta_1 \\ \beta_2 \\ \beta_3 \end{array}\right] = \left[\begin{array}{r}20823 \\ 84.7 \\ 588.4 \\ -263.6 \end{array}\right]$

b) 
    Increasing the living area or the lot size will cause the house price to increase, but an older house will cost less.

c) 
    A house that's one year older will cost about $\$263.60$ less.

d) 
    $R^2=0.59$

e) 
    We estimate $\$177966$.

SOLUTION:

a) 
    $\widehat{{\mathbf x}} = \left[\begin{array}{r}\beta_0 \\ \beta_1 \\ \beta_2 \\ \beta_3 \end{array}\right] = \left[\begin{array}{r}20823 \\ 84.7 \\ 588.4 \\ -263.6 \end{array}\right]$

b) 
    $\beta_1$ and $\beta_2$ are positive, which means that increasing the living area or the lot size will cause the house price to increase. However, $\beta_3$ is negative, which means that an older house will cost less.

c) 
    Because $\beta_3=-263.6$, we would expect a house that's one year older to cost $\$263.60$ less.

d) 
    $R^2=0.59$, which is far from perfect without being terrible. There are other factors that are not included in the dataset that can also influence the house price, such as number of bedrooms and the location.

e) 
    We estimate $\$177966$.

:::

:::exercise {exercise-6-5-011} number=6.5.11 answered=yes src=src/exercises/exercises6-5.xml:1301
PROBLEM:
We observed that if the columns of $A$ are linearly independent, then there is a unique least-squares approximate solution to the equation $A{\mathbf x}={\mathbf b}$ because the equation $A\widehat{{\mathbf x}}=\widehat{{\mathbf b}}$ has a unique solution. We also said that $\widehat{{\mathbf x}}$ is the unique solution to the normal equation $A^TA\widehat{{\mathbf x}} = A^T{\mathbf b}$ without explaining why this equation has a unique solution. This exercise offers an explanation.
Assuming that the columns of $A$ are linearly independent, we would like to conclude that the equation $A^TA\widehat{{\mathbf x}}=A^T{\mathbf b}$ has a unique solution.

a) 
    Suppose that ${\mathbf x}$ is a vector for which $A^TA{\mathbf x} = {\mathbf 0}$. Explain why the following argument is valid and allows us to conclude that $A{\mathbf x} = {\mathbf 0}$.

    $$ \begin{aligned} A^TA{\mathbf x} & = {\mathbf 0} \\ {\mathbf x}\cdot A^TA{\mathbf x} & = {\mathbf x}\cdot{\mathbf 0} = 0 \\ (A{\mathbf x})\cdot(A{\mathbf x}) & = 0 \\ \left|A{\mathbf x}\right|^2 & = 0. \\ \end{aligned} $$

    In other words, if $A^TA{\mathbf x} = {\mathbf 0}$, we know that $A{\mathbf x} = {\mathbf 0}$.

b) 
    If the columns of $A$ are linearly independent and $A{\mathbf x} = {\mathbf 0}$, what do we know about the vector ${\mathbf x}$?

c) 
    Explain why $A^TA{\mathbf x} = {\mathbf 0}$ can only happen when ${\mathbf x} = {\mathbf 0}$.

d) 
    Assuming that the columns of $A$ are linearly independent, explain why $A^TA\widehat{{\mathbf x}}=A^T{\mathbf b}$ has a unique solution.

ANSWER:

a) 
    Use the fact that ${\mathbf x}\cdot(A^TA{\mathbf x})= (A{\mathbf x})^T(A{\mathbf x})$.

b) 
    It must be true that ${\mathbf x}={\mathbf 0}$.

c) 
    This follows from the previous two parts of this exercise.

d) 
    The columns of $A^TA$ must be linearly independent.

SOLUTION:

a) 
    Starting with the assumption that $A^TA{\mathbf x} = {\mathbf 0}$, we dot both sides of the equation with ${\mathbf x}$ to obtain ${\mathbf x} \cdot A^TA{\mathbf x} = 0$. From here, we write

    $$ \begin{aligned} {\mathbf x}\cdot A^TA{\mathbf x} & = 0 \\ {\mathbf x}^TA^TA{\mathbf x} & = 0 \\ (A{\mathbf x})^T(A{\mathbf x}) & = 0 \\ (A{\mathbf x})\cdot (A{\mathbf x}) & = 0 \\ \left|A{\mathbf x}\right|^2 & = 0. \\ \end{aligned} $$

    This says that the length of $A{\mathbf x}$ must be zero, which tells us that $A{\mathbf x}={\mathbf 0}$.

b) 
    If the columns of $A$ are linearly independent, we know that the only solution to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$ is ${\mathbf x} = {\mathbf 0}$.

c) 
    The previous two parts of this exercise tell us that $A^TA{\mathbf x} = {\mathbf 0}$ implies that $A{\mathbf x} = {\mathbf 0}$, which implies that ${\mathbf x} = {\mathbf 0}$.

d) 
    Since the only solution to the homogeneous equation $A^TA{\mathbf x} = {\mathbf 0}$ is ${\mathbf x}={\mathbf 0}$, the columns of $A^TA$ are linearly independent, which means that $A^TA\widehat{{\mathbf x}}=A^T{\mathbf b}$ has only one solution.

:::

:::exercise {exercise-6-5-012} number=6.5.12 answered=yes src=src/exercises/exercises6-5.xml:1441 label=ex-r2-meaning
PROBLEM:
This problem is about the meaning of the coefficient of determination $R^2$ and its connection to variance, a topic that appears in the next section. Throughout this problem, we consider the linear system $A{\mathbf x}={\mathbf b}$ and the approximate least-squares solution $\widehat{{\mathbf x}}$, where $A\widehat{{\mathbf x}}=\widehat{{\mathbf b}}$. We suppose that $A$ is an $m\times n$ matrix, and we will denote the $m$-dimensional vector ${\mathbf 1} = \left[\begin{array}{r}1 \\ 1 \\ \vdots \\ 1 \end{array}\right]$.

a) 
    Explain why $\overline{{\mathbf b}}$, the mean of the components of ${\mathbf b}$, can be found as the dot product

    $$ \overline{{\mathbf b}} = \frac 1m {\mathbf b}\cdot{\mathbf 1}. $$

b) 
    In the examples we have seen in this section, explain why ${\mathbf 1}$ is in $\text{Col}(A)$.

c) 
    If we write ${\mathbf b} = \widehat{{\mathbf b}} + {\mathbf b}^\perp$, explain why

    $$ {\mathbf b}^\perp\cdot{\mathbf 1} = 0 $$

    and hence why the mean of the components of ${\mathbf b}^\perp$ is zero.

d) 
    The variance of an $m$-dimensional vector ${\mathbf v}$ is $\text{Var}({\mathbf v}) = \frac1m \left|\widetilde{{\mathbf v}}\right|^2$, where $\widetilde{{\mathbf v}}$ is the vector obtained by demeaning ${\mathbf v}$.

    Explain why

    $$ \text{Var}({\mathbf b}) = \text{Var}(\widehat{{\mathbf b}}) + \text{Var}({\mathbf b}^\perp). $$

e) 
    Explain why

    $$ \frac{\left|{\mathbf b} - A\widehat{{\mathbf x}}\right|^2}{\left|\widetilde{{\mathbf b}}\right|^2} = \frac{\text{Var}({\mathbf b}^\perp)}{\text{Var}({\mathbf b})} $$

    and hence

    $$ R^2 = \frac{\text{Var}(\widehat{{\mathbf b}})}{\text{Var}({\mathbf b})} = \frac{\text{Var}(A\widehat{{\mathbf x}})}{\text{Var}({\mathbf b})}. $$

    These expressions indicate why it is sometimes said that $R^2$ measures the “fraction of variance explained” by the function we are using to fit the data. As seen in the previous exercise, there may be other features that are not recorded in the dataset that influence the quantity we wish to predict.

f) 
    Explain why $0\leq R^2 \leq 1$.

ANSWER:

a) 
    ${\mathbf b}\cdot{\mathbf 1}$ simply sums the components of ${\mathbf b}$.

b) 
    ${\mathbf 1}$ is a column of $A$.

c) 
    ${\mathbf b}^\perp$ is in $\text{Col}(A)^\perp$.

d) 
    Use the fact that $\widehat{{\mathbf b}}$ and ${\mathbf b}^\perp$ are orthogonal.

e) 
    This follows from ${\mathbf b} = \widehat{{\mathbf b}} + {\mathbf b}^\perp$.

f) 
    This follow from $\text{Var}({\mathbf b}) = \text{Var}(\widehat{{\mathbf b}}) + \text{Var}({\mathbf b}^\perp)$.

SOLUTION:

a) 
    ${\mathbf b}\cdot{\mathbf 1}$ simply sums the components of ${\mathbf b}$.

b) 
    The examples we've seen fit the data using functions that have a constant term such as $y=\beta_0+\beta_1x$. This means that ${\mathbf 1}$ will be a column of the matrix $A$ and hence in $\text{Col}(A)$.

c) 
    Since ${\mathbf 1}$ is in $\text{Col}(A)$, any vector in $\text{Col}(A)^\perp$, such as ${\mathbf b}^\perp$, will be orthogonal to ${\mathbf 1}$.

d) 
    Notice that

    $$ {\mathbf b}\cdot{\mathbf 1} = \widehat{{\mathbf b}}\cdot{\mathbf 1} + {\mathbf b}^\perp\cdot{\mathbf 1} = \widehat{{\mathbf b}}\cdot{\mathbf 1} $$

    which says that

    $$ \widetilde{{\mathbf b}} = \widetilde{\widehat{{\mathbf b}}} + {\mathbf b}^\perp\text{.} $$

    Since $\widehat{{\mathbf b}}$ and ${\mathbf b}^\perp$ are orthogonal, we have $\widetilde{\widehat{{\mathbf b}}}\cdot{\mathbf b}^\perp = 0$. This means that

    $$ |\widetilde{{\mathbf b}}|^2 = (\widetilde{\widehat{{\mathbf b}}}+{\mathbf b}^\perp)\cdot (\widetilde{\widehat{{\mathbf b}}}+{\mathbf b}^\perp) = |\widetilde{\widehat{{\mathbf b}}}|^2 + |{\mathbf b}^\perp|^2 $$

    so that $\text{Var}({\mathbf b}) = \text{Var}(\widehat{{\mathbf b}})+\text{Var}({\mathbf b}^\perp)$.

e) 
    $|{\mathbf b}-A\widehat{{\mathbf x}}|^2 = |{\mathbf b}-\widehat{{\mathbf b}}|^2 = |{\mathbf b}^\perp|^2$, which explains why

    $$ \frac{\left|{\mathbf b} - A\widehat{{\mathbf x}}\right|^2}{\left|\widetilde{{\mathbf b}}\right|^2} = \frac{\text{Var}({\mathbf b}^\perp)}{\text{Var}({\mathbf b})}\text{.} $$

    Then

    $$ R^2 = 1 - \frac{\left|{\mathbf b} - A\widehat{{\mathbf x}}\right|^2}{\left|\widetilde{{\mathbf b}}\right|^2} = 1-\frac{\text{Var}({\mathbf b}^\perp)}{\text{Var}({\mathbf b})} = \frac{\text{Var}({\mathbf b}) - \text{Var}({\mathbf b}^\perp)}{\text{Var}({\mathbf b})} = \frac{\text{Var}(\widehat{{\mathbf b}})}{\text{Var}({\mathbf b})}\text{.} $$

f) 
    The variances are nonnegative so we have $R^2 \geq 0$. Also,

    $$ 1 = \frac{\text{Var}({\mathbf b})}{\text{Var}({\mathbf b})} = \frac{\text{Var}(\widehat{{\mathbf b}})+\text{Var}({\mathbf b}^\perp)}{\text{Var}({\mathbf b})} \geq \frac{\text{Var}(\widehat{{\mathbf b}})}{\text{Var}({\mathbf b})}=R^2\text{.} $$

:::
