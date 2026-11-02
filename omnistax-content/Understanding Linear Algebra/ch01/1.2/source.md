# 1.2 Finding solutions to linear systems {sec-finding-solutions}

In the previous section, we looked at systems of linear equations from a graphical perspective. Since the equations had only two or three variables, we could study the solution spaces as the intersections of lines and planes.
Because we will eventually consider systems with many equations and many variables, this graphical approach will not generally be a useful strategy. Instead, we will approach this problem algebraically and develop a technique to describe the solution spaces of general linear systems.

## 1.2.1 Gaussian elimination

{index-entry:Gaussian elimination} We will develop an algorithm, which is usually called *Gaussian elimination*, that allows us to describe the solution space of a linear system. This algorithm plays a central role in much of what is to come.

:::exploration {act:preview-1-2-1} Preview Activity 1.2.1
In this activity, we will consider some simple examples that will guide us in finding a more general approach.
PROBLEM:
a) Give a description of the solution space to the linear system:

    $$ \begin{alignedat}{3} x & = & 2 \\ y & = & -1. \\ \end{alignedat} $$

b) Give a description of the solution space to the linear system:

    $$ \begin{alignedat}{4} -x & {} + {} & 2y & {}-{} & z & {}={} & -3 \\ & & 3y & {}+{} & z & {}={} & -1 \\ & & & & 2z & {}={} & 4. \\ \end{alignedat} $$

c) Give a description of the solution space to the linear system:

    $$ \begin{alignedat}{3} x & {} + {} & 3y & {}={} & -1 \\ 2x& {}+{} & y & {}={} & 3. \\ \end{alignedat} $$

d) Describe the solution space to the linear equation $0x = 0$.
e) Describe the solution space to the linear equation $0x = 5$.
ANSWER:
a) $(x,y) = (2,-1)$.
b) $(x,y,z) = (-1,-1,2)$.
c) $(x,y) = (2,-1)$.
d) Any real number is a solution.
e) There are no solutions.
SOLUTION:
a) The equations tell us the value of both variables so there is only one solution $(x,y) = (2,-1)$.
b) We first use the third equation to determine that $z=2$. We next substitute this value into the first two equations to obtain

    $$ \begin{alignedat}{3} -x & {} + {} & 2y & {}={} & -1 \\ & & 3y & {}={} & -3. \\ \end{alignedat} $$

    Now we can use the second equation to determine that $y=-1$, substitute that value into the first equation, and determine that $x=-1$. This tells us that the linear system has one solution $(x,y,z) = (-1,-1,2)$.
c) Notice that we can rewrite the first equation as $x=-1-3y$ and substitute this into the second equation to obtain

    $$ 2(-1-3y)+y = -2 -5y = 3. $$

    This tells us that $y=-1$ and $x=-1-3y = 2$. The linear system therefore has one solution $(x,y) = (2,-1)$.
d) No matter the value of $x$, we have $0x = 0$. Therefore, the solution space to the equation $0x=0$ is all real numbers $x$. In other words, this equation does not place a restriction on the value of $x$.
e) By contrast, the equation $0x=5$ has no solutions since no value of $x$, when multiplied by $0$, can produce $5$.
:::

These examples lead to a few observations that motivate a general approach to finding solutions of linear systems.

:::observation {obs:observation-1-2-1} Observation 1.2.1
First, finding the solution space to some systems is simple. For example, because each equation in the following system

$$ \begin{alignedat}{3} x & {}={} & -4 \\ y & {}={} & 2. \\ \end{alignedat} $$

has only one variable, it prescribes a specific value for that variable. We therefore see that there is exactly one solution, which is $(x,y) = (-4,2)$. We call such a system *decoupled*. {index-entry:decoupled system}
:::

:::observation {obs:observation-1-2-2} Observation 1.2.2
Second, there is a process that can be used to find solutions to certain types of linear systems. For instance, let's consider the system

$$ \begin{alignedat}{4} x & {} + {} & 2y & {}-{} & 2z & {}={} & -4 \\ & & -y & {}+{} & z & {}={} & 3 \\ & & & & 3z & {}={} & 3. \\ \end{alignedat} $$

Multiplying both sides of the last equation by $1/3$ gives us

$$ \begin{alignedat}{4} x & {} + {} & 2y & {}-{} & 2z & {}={} & -4 \\ & & -y & {}+{} & z & {}={} & 3 \\ & & & & z & {}={} & 1. \\ \end{alignedat} $$

Any solution to this linear system must then have $z=1$.
Once we know that, we can substitute $z=1$ into the first and second equations and simplify to obtain a new system of equations having the same solutions:

$$ \begin{alignedat}{3} x & {} + {} & 2y {}={} && -2 \\ & & -y {}={} && 2. \\ \end{alignedat} $$

The second equation, after multiplying both sides by $-1$, tells us that $y=-2$. We can then substitute this value into the first equation to determine that $x=2$.
In this way, we arrive at a decoupled system, which shows that there is exactly one solution, namely $(x,y,z)=(2,-2,1)$.
Our original system,

$$ \begin{alignedat}{4} x & {} + {} & 2y & {}-{} & 2z & {}={} & -4 \\ & & -y & {}+{} & z & {}={} & 3 \\ & & & & 3z & {}={} & 3, \\ \end{alignedat} $$

{index-entry:triangular system} {index-entry:back substitution} is called a *triangular* system due to the shape formed by the coefficients. As this example demonstrates, triangular systems are easily solved by this process, which is called *back substitution*.
:::

:::observation {obs:observation-1-2-3} Observation 1.2.3
We can use substitution in a more general way to solve linear systems. For example, a natural approach to the system

$$ \begin{alignedat}{3} x & {} + {} & 2y & {}={} & 1 \\ 2x& {}+{} & 3y & {}={} & 3. \\ \end{alignedat} $$

is to use the first equation to express $x$ in terms of $y$:

$$ x = 1-2y $$

and then substitute this into the second equation and simplify:

$$ \begin{alignedat}{2} 2x + 3y & {}= & 3 \\ 2(1-2y) + 3y & {}={} & 3 \\ 2-4y + 3y & {}={} & 3 \\ -y & {}={} & 1 \\ y & {}={} & -1 \\ \end{alignedat} $$

From here, we can substitute $y=-1$ into the first equation to arrive at the solution $(x,y)=(3,-1)$.
However, the two-step process of solving for $x$ in terms of $y$ and substituting into the second equation may be performed more efficiently by adding a multiple of the first equation to the second. In this case, we will multiply the first equation by -2 and add to the second equation

$$ \begin{array}{cr} & -2(\text{equation 1}) \\ + & \text{equation 2} \\ \hline \end{array} $$

to obtain

$$ \begin{array}{cr} & -2(x+2y=1) \\ + & 2x+3y = 3 \\ \hline \\ \end{array} $$

which gives us

$$ \begin{array}{crcr} & -2x-4y & = & -2 \\ + & 2x+3y & = & 3 \\ \hline & -y & = & 1. \\ \end{array} $$

In this way, the system

$$ \begin{alignedat}{3} x & {} + {} & 2y & {}={} & 1 \\ 2x& {}+{} & 3y & {}={} & 3 \\ \end{alignedat} $$

is transformed into the new triangular system

$$ \begin{alignedat}{3} x & {} + {} & 2y & {}={} & 1 \\ & & -y & {}={} & 1. \\ \end{alignedat} $$

Notice that this process can be reversed. Beginning with the triangular system, we can recover the original system by multiplying the first equation by 2 and adding it to the second. Because of this, the two systems have the same solution space. We will revisit this point later and give what may be a more convincing explanation.
Of course, the choice to multiply the first equation by -2 was made so that the terms involving $x$ in the two equations will cancel leading to a triangular system that can be solved using back substitution.
:::

Based on these observations, we take note of three operations that transform a system of linear equations into a new system of equations having the same solution space. Our goal is to create a new system whose solution space is the same as the original system's and may be easily described.

- **Scaling**: 
    We can multiply one equation by a nonzero number. For instance,

    $$ 2x -4y = 6 $$

    has the same set of solutions as

    $$ \frac12(2x-4y=6) $$

    or

    $$ x-2y=3 $$

    .

- **Interchange**: 
    Interchanging equations will not change the set of solutions. For instance,

    $$ \begin{alignedat}{3} 2x & {}+{} & 4y & {}={} & 1 \\ x & {}-{} & 3y & {}={} & 0 \\ \end{alignedat} $$

    has the same set of solutions as

    $$ \begin{alignedat}{3} x & {}-{} & 3y & {}={} & 0 \\ 2x & {}+{} & 4y & {}={} & 1. \\ \end{alignedat} $$

- **Replacement**: 
    As we saw above, we may multiply one equation by a real number and add it to another equation. We call this process *replacement*.

:::example {ex:example-1-2-4} Example 1.2.4
Let's illustrate the use of these operations to find the solution space to the system of equations:

$$ \begin{alignedat}{4} x & {}+{} & 2y & & & {}={} & 4 \\ 2x & {}+{} & y & {}-{} & 3z & {}={} & 11 \\ -3x & {}-{} & 2y & {}+{} & z & {}={} & -10 \\ \end{alignedat} $$

We will first transform the system into a triangular system so we start by eliminating $x$ from the second and third equations.
We begin with a replacement operation where we multiply the first equation by -2 and add the result to the second equation.

$$ \begin{alignedat}{4} x & {}+{} & 2y & & & {}={} & 4 \\ & & -3y & {}-{} & 3z & {}={} & 3 \\ -3x & {}-{} & 2y & {}+{} & z & {}={} & -10 \\ \end{alignedat} $$

Another replacement operation eliminates $x$ from the third equation. We multiply the first equation by 3 and add to the third.

$$ \begin{alignedat}{4} x & {}+{} & 2y & & & {}={} & 4 \\ & & -3y & {}-{} & 3z & {}={} & 3 \\ & & 4y & {}+{} & z & {}={} & 2 \\ \end{alignedat} $$

Scale the second equation by multiplying it by $-1/3$.

$$ \begin{alignedat}{4} x & {}+{} & 2y & & & {}={} & 4 \\ & & y & {}+{} & z & {}={} & -1 \\ & & 4y & {}+{} & z & {}={} & 2 \\ \end{alignedat} $$

Eliminate $y$ from the third equation by multiplying the second equation by -4 and adding it to the third. Notice that we now have a triangular system that can be solved using back substitution.

$$ \begin{alignedat}{4} x & {}+{} & 2y & & & {}={} & 4 \\ & & y & {}+{} & z & {}={} & -1 \\ & & & & -3z & {}={} & 6 \\ \end{alignedat} $$

After scaling the third equation by $-1/3$, we have found the value for $z$.

$$ \begin{alignedat}{4} x & {}+{} & 2y & & & {}={} & 4 \\ & & y & {}+{} & z & {}={} & -1 \\ & & & & z & {}={} & -2 \\ \end{alignedat} $$

We eliminate $z$ from the second equation by multiplying the third equation by -1 and adding to the second.

$$ \begin{alignedat}{4} x & {}+{} & 2y & & & {}={} & 4 \\ & & y & & & {}={} & 1 \\ & & & & z & {}={} & -2 \\ \end{alignedat} $$

Finally, multiply the second equation by -2 and add to the first to obtain:

$$ \begin{alignedat}{3} x & {}={} & 2 \\ y & {}={} & 1 \\ z & {}={} & -2. \\ \end{alignedat} $$

Now that we have arrived at a decoupled system, we know that there is exactly one solution to our original system of equations, which is $(x,y,z) = (2,1,-2)$.
:::

One could find the same result by applying a different sequence of replacement and scaling operations. However, we chose this particular sequence guided by our desire to first transform the system into a triangular one. To do this, we eliminated the first variable $x$ from all but one equation and then proceeded to the next variables working left to right. Once we had a triangular system, we used back substitution moving through the variables right to left.

We call this process *Gaussian elimination* and note that it is our primary tool for solving systems of linear equations.

:::activity {act:activity-1-2-2} Activity 1.2.2 (Gaussian Elimination)
For each of the following linear systems, use Gaussian elimination to describe the solutions to the following systems of linear equations. In particular, determine whether each linear system has exactly one solution, infinitely many solutions, or no solutions.

a) 
    $\begin{alignedat}{4} x & {}+{} & y & {}+{} & 2z & {}={} & 1 \\ 2x & {}-{} & y & {}-{} & 2z & {}={} & 2 \\ -x & {}+{} & y & {}+{} & z & {}={} & 0 \\ \\ \end{alignedat}$

b) 
    $\begin{alignedat}{4} -x & {}-{} & 2y & {}+{} & 2z & {}={} & -1 \\ 2x & {}+{} & 4y & {}-{} & z & {}={} & 5 \\ x & {}+{} & 2y & & & {}={} & 3 \\ \\ \end{alignedat}$

c) 
    $\begin{alignedat}{4} -x & {}-{} & 2y & {}+{} & 2z & {}={} & -1 \\ 2x & {}+{} & 4y & {}-{} & z & {}={} & 5 \\ x & {}+{} & 2y & & & {}={} & 2 \\ \\ \end{alignedat}$

ANSWER:

a) 
    There is a single solution $(1,2,-1)$.

b) 
    There are infinitely many solutions.

c) 
    There are no solutions.

SOLUTION:

a) 
    Our aim is to apply a sequence of scaling, interchange, and replacement operations to first put the system into a triangular form. We begin by multiplying the first equation by $-2$ and adding it to the second equation. Next, we add the first equation to the third. This leads us to:

    $$ \begin{alignedat}{4} x & {}+{} & y & {}+{} & 2z & {}={} & 1 \\ & & -3y & {}-{} & 6z & {}={} & 0 \\ & & 2y & {}+{} & 3z & {}={} & 1 \\ \end{alignedat} $$

    We will now apply a scaling operation to make the coefficient of $y$ equal $1$ in the second equation.

    $$ \begin{alignedat}{4} x & {}+{} & y & {}+{} & 2z & {}={} & 1 \\ & & y & {}+{} & 2z & {}={} & 0 \\ & & 2y & {}+{} & 3z & {}={} & 1 \\ \end{alignedat} $$

    Another replacement operation brings the system into a triangular form.

    $$ \begin{alignedat}{4} x & {}+{} & y & {}+{} & 2z & {}={} & 1 \\ & & y & {}+{} & 2z & {}={} & 0 \\ & & & & -z & {}={} & 1 \\ \end{alignedat} $$

    From here, we begin the process of back substitution seeking a decoupled system.

    $$ \begin{alignedat}{4} x & {}+{} & y & & & {}={} & 3 \\ & & y & & & {}={} & 2 \\ & & & & z & {}={} & -1 \\ \end{alignedat} $$

    Finally, we have the decoupled system

    $$ \begin{alignedat}{4} x & & & & & {}={} & 1 \\ & & y & & & {}={} & 2 \\ & & & & z & {}={} & -1, \\ \end{alignedat} $$

    which tells us that the solution space consists of the single solution $(1,2,-1)$.

b) 
    Once again, we begin with a sequence of replacement and scaling operations that lead to the triangular system

    $$ \begin{alignedat}{4} -x & {}-{} & 2y & {}+{} & 2z & {}={} & -1 \\ & & & & z & {}={} & 1 \\ & & & & 0 & {}={} & 0 \\ \end{alignedat} $$

    Back substitution gives us the system

    $$ \begin{alignedat}{4} x & {}+{} & 2y & & & {}={} & 3 \\ & & & & z & {}={} & 1 \\ & & & & 0 & {}={} & 0 \\ \end{alignedat} $$

    The third equation does not impose a restriction on the solutions since it is satisfied for any $(x,y,z)$. The second equation tells us that $z$ must equal $1$; however, there are infinitely many solutions to the first equation that have $z=1$. Therefore, this system has infinitely many solutions.

c) 
    After applying two replacement and one scaling operation, we find

    $$ \begin{alignedat}{4} -x & {}-{} & 2y & {}+{} & 2z & {}={} & -1 \\ & & & & z & {}={} & 1 \\ & & & & 2z & {}={} & 1 \\ \end{alignedat} $$

    Another replacement operation leads to the system

    $$ \begin{alignedat}{4} -x & {}-{} & 2y & {}+{} & 2z & {}={} & -1 \\ & & & & z & {}={} & 1 \\ & & & & 0 & {}={} & 1 \\ \end{alignedat} $$

    Since the third equation has no solutions, the original system can have no solutions as well.

:::

## 1.2.2 Augmented matrices

After performing Gaussian elimination a few times, you probably noticed that you spent most of the time concentrating on the coefficients and simply recorded the variables as place holders. Based on this observation, we will introduce a shorthand description of linear systems.

{index-entry:augmented matrix} When writing a linear system, we always write the variables in the same order in each equation. We then construct an *augmented matrix* by simply forgetting about the variables and recording the numerical data in a rectangular array. For instance, the system of equations below has the following augmented matrix

$$ \begin{alignedat}{4} -x & {}-{} & 2y & {}+{} & 2z & {}={} & -1 \\ 2x & {}+{} & 4y & {}-{} & z & {}={} & 5 \\ x & {}+{} & 2y & & & {}={} & 3 \\ \end{alignedat} $$

$$ \left[ \begin{array}{rrr|r} -1 & -2 & 2 & -1 \\ 2 & 4 & -1 & 5 \\ 1 & 2 & 0 & 3 \\ \end{array} \right]. $$

The vertical line reminds us where the equals signs appear in the equations. Entries in the matrix to the left of the vertical line correspond to coefficients of the equations. We sometimes choose to focus only on the coefficients of the system in which case we write the *coefficient matrix* as {index-entry:coefficient matrix}

$$ \left[ \begin{array}{rrr} -1 & -2 & 2 \\ 2 & 4 & -1 \\ 1 & 2 & 0 \\ \end{array} \right]. $$

The three operations we perform on systems of equations translate naturally into operations on matrices. For instance, the replacement operation that multiplies the first equation by 2 and adds it to the second may be performed by multiplying the first row of the augmented matrix by 2 and adding it to the second row:

$$ \left[ \begin{array}{rrr|r} -1 & -2 & 2 & -1 \\ 2 & 4 & -1 & 5 \\ 1 & 2 & 0 & 3 \\ \end{array} \right] \sim \left[ \begin{array}{rrr|r} -1 & -2 & 2 & -1 \\ 0 & 0 & 3 & 3 \\ 1 & 2 & 0 & 3 \\ \end{array} \right]. $$

The symbol $\sim$ between the matrices indicates that the two matrices are related by a sequence of scaling, interchange, and replacement operations. Since these operations act on the rows of the matrices, we say that the matrices are *row equivalent*. Notice that the linear systems corresponding to two row equivalent augmented matrices have the same solution space. {index-entry:row equivalent}

:::activity {act:activity-1-2-3} Activity 1.2.3 (Augmented matrices and solution spaces)

a) 
    Write the augmented matrix for the linear system

    $$ \begin{alignedat}{4} x & {}+{} & 2y & {}-{} & z & {}={} & 1 \\ 3x & {}+{} & 2y & {}+{} & 2z & {}={} & 7 \\ -x & & & {}+{} & 4z & {}={} & -3 \\ \end{alignedat} $$

    and perform Gaussian elimination to describe the solution space in as much detail as you can.

b) 
    Suppose that you have a linear system in the variables $x$ and $y$ whose augmented matrix is row equivalent to

    $$ \left[ \begin{array}{rr|r} 1 & 0 & 3 \\ 0 & 1 & 0 \\ 0 & 0 & 0 \\ \end{array} \right]. $$

    Write the linear system corresponding to this augmented matrix and describe its solution set in as much detail as you can.

c) 
    Suppose that you have a linear system in the variables $x$ and $y$ whose augmented matrix is row equivalent to

    $$ \left[ \begin{array}{rr|r} 1 & 0 & 3 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array} \right]. $$

    Write the linear system corresponding to this augmented matrix and describe its solution set in as much detail as you can.

d) 
    Suppose that the augmented matrix of a linear system has the following shape where $*$ could be any real number.

    $$ \left[ \begin{array}{rrrrr|r} * & * & * & * & * & * \\ * & * & * & * & * & * \\ * & * & * & * & * & * \\ \end{array} \right]. $$

    1. 
        How many equations are there in this system and how many variables?

    2. 
        Based on our earlier discussion in [Section 1.1](ref:1.1#sec-expect), do you think it's possible that this system has exactly one solution, infinitely many solutions, or no solutions?

    3. 
        Suppose that this augmented matrix is row equivalent to

        $$ \left[ \begin{array}{rrrrr|r} 1 & 2 & 0 & 0 & 3 & 2 \\ 0 & 0 & 1 & 2 & -1 & -1 \\ 0 & 0 & 0 & 0 & 0 & 0 \\ \end{array} \right]. $$

        Make a choice for the names of the variables and write the corresponding linear system. Does the system have exactly one solution, infinitely many solutions, or no solutions?

ANSWER:

a) 
    There is a single solution $(3,-1,0)$.

b) 
    There is a single solution $(3,0)$.

c) 
    There are no solutions.

d) 
    This system has three equations in five variables, and there are infinitely many solutions.

SOLUTION:

a) 
    The augmented matrix for this linear system is

    $$ \left[\begin{array}{rrr|r} 1 & 2 & -1 & 1 \\ 3 & 2 & 2 & 7 \\ -1 & 0 & 4 & -3 \\ \end{array} \right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 0 & 3 \\ 0 & 1 & 0 & -1 \\ 0 & 0 & 1 & 0 \end{array}\right] $$

    This corresponds to the system of equations

    $$ \begin{alignedat}{3} x & {}={} & 3 \\ y & {}={} & -1 \\ z & {}={} & 0 \\ \end{alignedat} $$

    showing that there is a single solution $(x,y,z) = (3,-1,0)$.

b) 
    The corresponding system of equations is

    $$ \begin{alignedat}{3} x & {}={} & 3 \\ y & {}={} & 0 \\ 0 & {}={} & 0 \\ \end{alignedat} $$

    The third equation is satisfied for any values of $x$ and $y$. Therefore, we see that the only solution to the system is $(x,y) = (3,0)$.

c) 
    Here, the corresponding system of equations is

    $$ \begin{alignedat}{3} x & {}={} & 3 \\ y & {}={} & 0 \\ 0 & {}={} & 1 \\ \end{alignedat} $$

    Since the third equation is not satisfied for any values of $x$ and $y$, there are no solutions to the system.

d) 
    The system corresponding to this augmented matrix has three equations and five variables. Our first guess is there are infinitely many solutions. If we write out the equations corresponding to the augmented matrix, we find

    $$ \begin{alignedat}{5} x_1 & {}+{} & 2x_2 & & & & {}+{} & 3x_5 & {}={} & 2 \\ & & & x_3 & {}+{} & 2x_4 & {}-{} & x_5 & {}={} & -1 \\ \end{alignedat} $$

    since the third row of the augmented matrix does not restrict the solution space. From here, we see that there are infinitely many solutions: if we make any choice for the variables $x_2$, $x_4$, and $x_5$, we can find values for $x_1$ and $x_3$ that give a solution.

:::

## 1.2.3 Reduced row echelon form

There is a special class of matrices whose form makes it especially easy to describe the solution space of the corresponding linear system. As we describe the properties of this class of matrices, it may be helpful to consider an example, such as the following matrix.

$$ \left[ \begin{array}{rrrrrr} 1 & * & 0 & * & 0 & * \\ 0 & 0 & 1 & * & 0 & * \\ 0 & 0 & 0 & 0 & 1 & * \\ 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 \\ \end{array} \right]. $$

:::definition {def:reduced-row-echelon} Definition 1.2.5
{index-entry:reduced row echelon form} We say that a matrix is in *reduced row echelon form* if the following properties are satisfied.

- 
    If the entries in a row are all zero, then the same is true of any row below it.

- 
    If we move across a row from left to right, the first nonzero entry we encounter is 1. We call this entry the *leading entry* in the row.

- 
    The leading entry in any row is to the right of the leading entries in all the rows above it.

- 
    A leading entry is the only nonzero entry in its column.

{index-entry:reduced row echelon matrix} We call a matrix in reduced row echelon form a *reduced row echelon matrix*.
:::

We have been intentionally vague about whether the matrix we are considering is an augmented matrix corresponding to a linear system or a coefficient matrix since we will consider both possibilities in the future.

:::activity {act:activity-1-2-4} Activity 1.2.4 (Identifying reduced row echelon matrices)
Consider each of the following augmented matrices. Determine if the matrix is in reduced row echelon form. If it is not, perform a sequence of scaling, interchange, and replacement operations to obtain a row equivalent matrix that is in reduced row echelon form. Then use the reduced row echelon matrix to describe the solution space.

a) 
    $\left[ \begin{array}{rrr|r} 2 & 0 & 4 & -8 \\ 0 & 1 & 3 & 2 \\ \end{array} \right].$

b) 
    $\left[ \begin{array}{rrr|r} 1 & 0 & 0 & -1 \\ 0 & 1 & 0 & 3 \\ 0 & 0 & 1 & 1 \\ \end{array} \right].$

c) 
    $\left[ \begin{array}{rrr|r} 1 & 0 & 4 & 2 \\ 0 & 1 & 3 & 2 \\ 0 & 0 & 0 & 1 \\ \end{array} \right].$

d) 
    $\left[ \begin{array}{rrr|r} 0 & 1 & 3 & 2 \\ 0 & 0 & 0 & 0 \\ 1 & 0 & 4 & 2 \\ \end{array} \right].$

e) 
    $\left[ \begin{array}{rrr|r} 1 & 2 & -1 & 2 \\ 0 & 1 & -2 & 0 \\ 0 & 0 & 1 & 1 \\ \end{array} \right].$

ANSWER:

a) 
    The row equivalent reduced row echelon form is

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 2 & -4 \\ 0 & 1 & 3 & 2 \\ \end{array} \right], $$

    and there are infinitely many solutions.

b) 
    This matrix is in reduced row echelon form. There is a single solution $(-1,3,1)$.

c) 
    This matrix is also in reduced row echelon form. However, this are no solutions since the third equation is $0 = 1$.

d) 
    The row equivalent reduced row echelon form is

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 4 & 2 \\ 0 & 1 & 3 & 2 \\ 0 & 0 & 0 & 0 \\ \end{array} \right]. $$

    There are infinitely many solutions.

e) 
    The row equivalent reduced row echelon form is

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 0 & -1 \\ 0 & 1 & 0 & 2 \\ 0 & 0 & 1 & 1 \\ \end{array} \right]. $$

    This system has the single solution $(-1,2,1)$.

SOLUTION:

a) 
    Because the leading entry in the first row is not a $1$, this is not in reduced row echelon form. If we scale the first row by $1/2$, however, we have a matrix in reduced row echelon form.

    $$ \left[ \begin{array}{rrr|r} 2 & 0 & 4 & -8 \\ 0 & 1 & 3 & 2 \\ \end{array} \right] \sim \left[ \begin{array}{rrr|r} 1 & 0 & 2 & -4 \\ 0 & 1 & 3 & 2 \\ \end{array} \right]. $$

    We may write the corresponding linear system as

    $$ \begin{alignedat}{4} x_1 & & & {}+{} & 2x_3 & {}={} & -4 \\ & & x_2 & {}+{} & 3x_3 & {}={} & 2, \\ \end{alignedat} $$

    which may be rewritten as

    $$ \begin{alignedat}{2} x_1 & {}={} -4 - 2x_3 \\ x_2 & {}={} 2 - 3x_3. \\ \end{alignedat} $$

    Since $x_3$ may take on any value, this shows that there are infinitely many solutions.

b) 
    This matrix is in reduced row echelon form. There is a single solution $(-1,3,1)$.

c) 
    This matrix is also in reduced row echelon form. However, this are no solutions since the third equation is $0 = 1$.

d) 
    This is not in reduced row echelon form because the row of zeroes should be at the bottom of the matrix. We also need another interchange so that the leading entry in the second row is to the right of the leading entry in the first row.

    $$ \left[ \begin{array}{rrr|r} 0 & 1 & 3 & 2 \\ 0 & 0 & 0 & 0 \\ 1 & 0 & 4 & 2 \\ \end{array} \right] \sim \left[ \begin{array}{rrr|r} 1 & 0 & 4 & 2 \\ 0 & 1 & 3 & 2 \\ 0 & 0 & 0 & 0 \\ \end{array} \right]. $$

    Once again, there are infinitely many solutions.

e) 
    This is not in reduced row echelon form because the leading entry in the second and third rows are not the only nonzero elements in their columns. We can use replacement operations to remedy this

    $$ \left[ \begin{array}{rrr|r} 1 & 2 & -1 & 2 \\ 0 & 1 & -2 & 0 \\ 0 & 0 & 1 & 1 \\ \end{array} \right] \sim \left[ \begin{array}{rrr|r} 1 & 0 & 0 & -1 \\ 0 & 1 & 0 & 2 \\ 0 & 0 & 1 & 1 \\ \end{array} \right] $$

    and see that the system has the single solution $(-1,2,1)$.

:::

The examples in the previous activity indicate that there is a sequence of row operations that transforms any matrix into one in reduced row echelon form. Moreover, the conditions that define reduced row echelon matrices guarantee that this matrix is unique.

:::theorem {thm:thm-rref-is-unique} Theorem 1.2.6
For any given matrix, there is exactly one reduced row echelon matrix to which it is row equivalent.
:::

Once we have this reduced row echelon matrix, we may describe the set of solutions to the corresponding linear system with relative ease.

:::example {ex:example-1-2-7} Example 1.2.7 (Describing the solution space from a reduced row echelon matrix)

a) 
    Consider the reduced row echelon matrix

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 2 & -1 \\ 0 & 1 & 1 & 2 \\ \end{array} \right] $$

    and its corresponding linear system as

    $$ \begin{alignedat}{4} x & & & {}+{} & 2z & {}={} & -1 \\ & & y & {}+{} & z & {}={} & 2. \\ \end{alignedat} $$

    Let's rewrite the equations as

    $$ \begin{alignedat}{2} x & {}={} & -1 -2z\\ y & {}={} & 2-z. \\ \end{alignedat} $$

    From this description, it is clear that we obtain a solution for any value of the variable $z$. For instance, if $z=2$, then $x = -5$ and $y=0$ so that $(x,y,z) = (-5,0,2)$ is a solution. Similarly, if $z=0$, we see that $(x,y,z) = (-1,2,0)$ is also a solution.

    Because there is no restriction on the value of $z$, we call it a *free variable*, and note that the linear system has infinitely many solutions. The variables $x$ and $y$ are called *basic variables* as they are determined once we make a choice of the free variable. {index-entry:free variable} {index-entry:basic variable}

    We will call this description of the solution space, in which the basic variables are written in terms of the free variables, a *parametric description* of the solution space. {index-entry:parametric description}

b) 
    Consider the matrix

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 0 & 4 \\ 0 & 1 & 0 & -3 \\ 0 & 0 & 1 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array} \right]. $$

    The last equation gives

    $$ 0x +0y+0z = 0 $$

    , which is true for any $(x,y,z)$. We may safely ignore this equation since it does not impose a restriction on $(x,y,z)$. We then see that there is a unique solution $(x,y,z) = (4,-3,1)$.

c) 
    Consider the matrix

    $$ \left[ \begin{array}{rrr|r} 1 & 0 & 2 & 0 \\ 0 & 1 & -1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array} \right]. $$

    Beginning with the last equation, we see that

    $$ 0x +0y+0z = 0 = 1 $$

    , which is not true for any $(x,y,z)$. There is no solution to this particular equation and therefore no solution to the system of equations.

:::

## 1.2.4 Summary

We saw several important concepts in this section.

- 
    We can describe the solution space to a linear system by transforming it into a new linear system having the same solution space through a sequence of scaling, interchange, and replacement operations.

- 
    We can represent a linear system by an augmented matrix. Using scaling, interchange, and replacement operations, the augmented matrix is row equivalent to exactly one reduced row echelon matrix. The process of constructing this reduced row echelon matrix is called Gaussian elimination.

- 
    The reduced row echelon matrix allows us to easily describe the solution space of a linear system.

## 1.2.5 Exercises

:::exercise {exercise-1-2-001} number=1.2.1 answered=yes src=src/exercises/exercises1-2.xml:4
PROBLEM:
For each of the linear systems below, write the associated augmented matrix and find the reduced row echelon matrix that is row equivalent to it. Identify the basic and free variables and then describe the solution space of the original linear system using a parametric description, if appropriate.

a) 

    $$ \begin{alignedat}{3} 2x & {}+{} & y & {}={} & 0 \\ x & {}+{} & 2y & {}={} & 3 \\ -2x & {}+{} & 2y & {}={} & 6 \\ \\ \end{alignedat} $$

b) 

    $$ \begin{alignedat}{5} -x_1 & {}+{} & 2x_2 & & & {}+{} & x_3 & {}={} & 2 \\ 3x_1 & & & & & {}+{} & 2x_3 & {}={} & -1 \\ -x_1 & {}-{} & x_2 & & & {}+{} & x_3 & {}={} & 2 \\ \\ \end{alignedat} $$

c) 

    $$ \begin{alignedat}{5} x_1 & {}+{} & 2x_2 & {}-{} & 5x_3 & {}-{} & x_4 & {}={} & -3 \\ -2x_1 & {}-{} & 2x_2 & {}+{} & 6x_3 & {}-{} & 2x_4 & {}={} & 4 \\ x_1 & & & {}-{} & x_3 & {}+{} & 9x_4 & {}={} & -7 \\ & & -x_2 & {}+{} & 2x_3 & {}-{} & x_4 & {}={} & 4 \\ \\ \end{alignedat} $$

ANSWER:

a) 
    The reduced row echelon form is

    $$ \left[\begin{array}{rr|r} 1 & 0 & -1 \\ 0 & 1 & 2 \\ 0 & 0 & 0 \\ \end{array}\right]\text{,} $$

    and there is a single solution. Every variable is basic.

b) 
    The reduced row echelon form is

    $$ \left[\begin{array}{rrr|r} 1 & 0 & 0 & -1 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \\ \end{array}\right]\text{.} $$

    All the variables are basic so there is a unique solution: $x_1 = -1$, $x_2=0$, and $x_3=1$.

c) 
    The reduced row echelon form is

    $$ \left[\begin{array}{rrrr|r} 1 & 0 & -1 & 0 & 2 \\ 0 & 1 & -2 & 0 & -3 \\ 0 & 0 & 0 & 1 & -1 \\ 0 & 0 & 0 & 0 & 0 \end{array}\right]\text{,} $$

    which gives the equations

    $$ \begin{aligned} x_1 & = 2 + x_3 \\ x_2 & = -3 + 2x_3 \\ x_4 & = -1 \\ \end{aligned} $$

    . This shows that $x_3$ is a free variable and $x_1$, $x_2$, and $x_4$ are basic variables. There are therefore infinitely many solutions.

SOLUTION:

a) 
    The augmented matrix and its reduced row echelon form are

    $$ \left[\begin{array}{rr|r} 2 & 1 & 0 \\ 1 & 2 & 3 \\ -2 & 2 & 6 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & -1 \\ 0 & 1 & 2 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

    The linear system corresponding to the reduced row echelon form is

    $$ \begin{alignedat}{3} x & & & {}={} & -1 \\ & & y & {}={} & 2 \\ & & 0 & {}={} & 0\text{.} \\ \end{alignedat} $$

    This shows that there is a single solution $(-1,2)$ and that every variable is a basic variable.

b) 
    We have the augmented matrix

    $$ \left[\begin{array}{rrr|r} -1 & 2 & 1 & 2 \\ 3 & 0 & 2 & -1 \\ -1 & -1 & 1 & 2 \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 0 & -1 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \\ \end{array}\right]\text{.} $$

    This shows that all the variables are basic variables and that there is a unique solution: $x_1 = -1$, $x_2=0$, and $x_3=1$.

c) 
    The augmented matrix and its reduced row echelon form are

    $$ \left[\begin{array}{rrrr|r} 1 & 2 & -5 & -1 & -3 \\ -2 & -2 & 6 & -2 & 4 \\ 1 & 0 & -1 & 9 & -7 \\ 0 & -1 & 2 & -1 & 4 \end{array}\right] \sim \left[\begin{array}{rrrr|r} 1 & 0 & -1 & 0 & 2 \\ 0 & 1 & -2 & 0 & -3 \\ 0 & 0 & 0 & 1 & -1 \\ 0 & 0 & 0 & 0 & 0 \end{array}\right]\text{.} $$

    This gives the equations

    $$ \begin{aligned} x_1 & = 2 + x_3 \\ x_2 & = -3 + 2x_3 \\ x_4 & = -1 \\ \end{aligned} $$

    showing that $x_3$ is a free variable and $x_1$, $x_2$, and $x_4$ are basic variables. There are therefore infinitely many solutions.

:::

:::exercise {exercise-1-2-002} number=1.2.2 answered=yes src=src/exercises/exercises1-2.xml:208
PROBLEM:
Consider each matrix below and determine if it is in reduced row echelon form. If not, indicate the reason and apply a sequence of row operations to find its reduced row echelon matrix. For each matrix, indicate whether the corresponding linear system has infinitely many solutions, exactly one solution, or no solutions.

a) 

    $$ \left[ \begin{array}{rrrr|r} 1 & 1 & 0 & 3 & 3 \\ 0 & 1 & 0 & -2 & 1 \\ 0 & 0 & 1 & 3 & 4 \\ \end{array} \right] $$

b) 

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 0 \\ 0 & 2 & 0 & 0 & 0 \\ 0 & 0 & -3 & 0 & 0 \\ 0 & 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 & 1 \\ \end{array} \right] $$

c) 

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 3 & 3 \\ 0 & 1 & 0 & -2 & 1 \\ 0 & 0 & 1 & 3 & 4 \\ 0 & 0 & 0 & 3 & 3 \\ \end{array} \right] $$

d) 

    $$ \left[ \begin{array}{rrrr|r} 0 & 0 & 1 & 0 & -1 \\ 0 & 1 & 0 & 0 & 3 \\ 1 & 1 & 1 & 1 & 2 \\ \end{array} \right] $$

ANSWER:

a) 
    The reduced row echelon form is

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 5 & 2 \\ 0 & 1 & 0 & -2 & 1 \\ 0 & 0 & 1 & 3 & 4 \\ \end{array} \right]\text{,} $$

    and there are infinitely many solutions.

b) 
    The reduced row echelon form is

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 & 1 \\ \end{array} \right]\text{,} $$

    and there are no solutions.

c) 
    The reduced row echelon form is

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 & 3 \\ 0 & 0 & 1 & 0 & 1 \\ 0 & 0 & 0 & 1 & 1 \\ \end{array} \right]\text{,} $$

    and this linear system has a single solution.

d) 
    The reduced row echelon form is

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 1 & 0 \\ 0 & 1 & 0 & 0 & 3 \\ 0 & 0 & 1 & 0 & -1 \\ \end{array} \right]\text{,} $$

    and there are infinitely many solutions.

SOLUTION:

a) 
    This is not in reduced row echelon form since the leading entry in the second row is not the only nonzero entry in its column. Applying a replacement operation gives,

    $$ \left[ \begin{array}{rrrr|r} 1 & 1 & 0 & 3 & 3 \\ 0 & 1 & 0 & -2 & 1 \\ 0 & 0 & 1 & 3 & 4 \\ \end{array} \right] \sim \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 5 & 2 \\ 0 & 1 & 0 & -2 & 1 \\ 0 & 0 & 1 & 3 & 4 \\ \end{array} \right]\text{.} $$

    There are infinitely many solutions since $x_4$ is a free variable.

b) 
    This is not in reduced row echelon form since the leading entries are not all $1$. We can scale those rows to find the reduced row echelon form.

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 0 \\ 0 & 2 & 0 & 0 & 0 \\ 0 & 0 & -3 & 0 & 0 \\ 0 & 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 & 1 \\ \end{array} \right] \sim \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 & 1 \\ \end{array} \right]\text{.} $$

    There are no solutions since the last row gives the equation $0=1$.

c) 
    This is not in reduced row echelon form since the leading entry in the last row is not $1$ and is not the only nonzero entry in its column.

    $$ \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 3 & 3 \\ 0 & 1 & 0 & -2 & 1 \\ 0 & 0 & 1 & 3 & 4 \\ 0 & 0 & 0 & 3 & 3 \\ \end{array} \right] \sim \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 & 3 \\ 0 & 0 & 1 & 0 & 1 \\ 0 & 0 & 0 & 1 & 1 \\ \end{array} \right]\text{.} $$

    This linear system has a single solution.

d) 
    This is not in reduced row echelon form since the leading entries appear in the wrong order.

    $$ \left[ \begin{array}{rrrr|r} 0 & 0 & 1 & 0 & -1 \\ 0 & 1 & 0 & 0 & 3 \\ 1 & 1 & 1 & 1 & 2 \\ \end{array} \right] \sim \left[ \begin{array}{rrrr|r} 1 & 0 & 0 & 1 & 0 \\ 0 & 1 & 0 & 0 & 3 \\ 0 & 0 & 1 & 0 & -1 \\ \end{array} \right]\text{.} $$

    Since $x_4$ is a free variable, there are infinitely many solutions.

:::

:::exercise {exercise-1-2-003} number=1.2.3 answered=yes src=src/exercises/exercises1-2.xml:439
PROBLEM:
Give an example of a reduced row echelon matrix that describes a linear system having the stated properties. If it is not possible to find such an example, explain why not.

a) 
    Write a reduced row echelon matrix for a linear system having five equations and three variables and having exactly one solution.

b) 
    Write a reduced row echelon matrix for a linear system having three equations and three variables and having no solution.

c) 
    Write a reduced row echelon matrix for a linear system having three equations and five variables and having infinitely many solutions.

d) 
    Write a reduced row echelon matrix for a linear system having three equations and four variables and having exactly one solution.

e) 
    Write a reduced row echelon matrix for a linear system having four equations and four variables and having exactly one solution.

ANSWER:

a) 
    $\left[\begin{array}{rrr|r} 1 & 0 & 0 & 3 \\ 0 & 1 & 0 & -4 \\ 0 & 0 & 1 & 2 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.}$

b) 
    $\left[\begin{array}{rrr|r} 1 & 0 & -2 & 0 \\ 0 & 1 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right]\text{.}$

c) 
    $\left[\begin{array}{rrrrr|r} 1 & 0 & 0 & -2 & 3 & 7 \\ 0 & 1 & 0 & 3 & 0 & 4 \\ 0 & 0 & 1 & 1 & -1 & 2 \\ \end{array}\right]\text{.}$

d) 
    This is not possible.

e) 
    $\left[\begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 1 \\ 0 & 1 & 0 & 0 & -2 \\ 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 & 1 \\ \end{array}\right]\text{.}$

SOLUTION:

a) 
    Our matrix should have five rows and four columns. Here is an example.

    $$ \left[\begin{array}{rrr|r} 1 & 0 & 0 & 3 \\ 0 & 1 & 0 & -4 \\ 0 & 0 & 1 & 2 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

b) 
    Here is an example.

    $$ \left[\begin{array}{rrr|r} 1 & 0 & -2 & 0 \\ 0 & 1 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right]\text{.} $$

c) 
    Here is an example.

    $$ \left[\begin{array}{rrrrr|r} 1 & 0 & 0 & -2 & 3 & 7 \\ 0 & 1 & 0 & 3 & 0 & 4 \\ 0 & 0 & 1 & 1 & -1 & 2 \\ \end{array}\right]\text{.} $$

d) 
    This is not possible. If there is a solution, there will always be a free variable so there will be infinitely many solutions.

    $$ \left[\begin{array}{rrrr|r} 1 & 0 & 0 & * & * \\ 0 & 1 & 0 & * & * \\ 0 & 0 & 1 & * & * \\ \end{array}\right]\text{.} $$

e) 
    Here is an example.

    $$ \left[\begin{array}{rrrr|r} 1 & 0 & 0 & 0 & 1 \\ 0 & 1 & 0 & 0 & -2 \\ 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 & 1 \\ \end{array}\right]\text{.} $$

:::

:::exercise {exercise-1-2-004} number=1.2.4 answered=yes src=src/exercises/exercises1-2.xml:580
PROBLEM:
For any given matrix, [Theorem 1.2.6](ref:thm-rref-is-unique) tells us that there is a reduced row echelon matrix that is row equivalent to it. This exercise demonstrates why this is the case. Each of the following matrices satisfies three of the four conditions required of a reduced row echelon matrix as prescribed by [Definition 1.2.5](ref:reduced-row-echelon). For each, indicate how a sequence of row operations can be applied to form a row equivalent reduced row echelon matrix.

a) 

    $$ \begin{bmatrix} 1 & 0 & 2 & 3 \\ 0 & 0 & 0 & 0 \\ 0 & 1 & -2 & 1 \\ \end{bmatrix} $$

b) 

    $$ \begin{bmatrix} 1 & 0 & 0 & 2 \\ 0 & -2 & 0 & -4 \\ 0 & 0 & 1 & 1 \\ \end{bmatrix} $$

c) 

    $$ \begin{bmatrix} 0 & 1 & 0 & -2 \\ 0 & 0 & 1 & 4 \\ 1 & 0 & 0 & 3 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{bmatrix} $$

d) 

    $$ \begin{bmatrix} 1 & 0 & 2 & 3 \\ 0 & 1 & 3 & 0 \\ 0 & 0 & 1 & -1 \\ 0 & 0 & 0 & 0 \\ \end{bmatrix} $$

ANSWER:

a) 
    Interchange the second and third rows.

b) 
    Scale the second row by $-1/2$.

c) 
    Perform interchanges among the first three rows.

d) 
    Perform row replacement operations so that the leading entry in the third row is the only nonzero entry in its column.

SOLUTION:

a) 
    Interchange the second and third rows to form

    $$ \begin{bmatrix} 1 & 0 & 2 & 3 \\ 0 & 0 & 0 & 0 \\ 0 & 1 & -2 & 1 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 & 2 & 3 \\ 0 & 1 & -2 & 1 \\ 0 & 0 & 0 & 0 \\ \end{bmatrix} $$

b) 
    Scale the second row by $-1/2$ to form

    $$ \begin{bmatrix} 1 & 0 & 0 & 2 \\ 0 & -2 & 0 & -4 \\ 0 & 0 & 1 & 1 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 & 0 & 2 \\ 0 & 1 & 0 & 2 \\ 0 & 0 & 1 & 1 \\ \end{bmatrix} $$

c) 
    Perform interchanges among the first three rows so that

    $$ \begin{bmatrix} 0 & 1 & 0 & -2 \\ 0 & 0 & 1 & 4 \\ 1 & 0 & 0 & 3 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 & 0 & 3 \\ 0 & 1 & 0 & -2 \\ 0 & 0 & 1 & 4 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{bmatrix} $$

d) 
    Perform row replacement operations so that the leading entry in the third row is the only nonzero entry in its column.

    $$ \begin{bmatrix} 1 & 0 & 2 & 3 \\ 0 & 1 & 3 & 0 \\ 0 & 0 & 1 & -1 \\ 0 & 0 & 0 & 0 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 & 0 & 5 \\ 0 & 1 & 0 & 3 \\ 0 & 0 & 1 & -1 \\ 0 & 0 & 0 & 0 \\ \end{bmatrix} $$

:::

:::exercise {exercise-1-2-005} number=1.2.5 answered=yes src=src/exercises/exercises1-2.xml:759
PROBLEM:
For each of the questions below, provide a justification for your response.

a) 
    What does the presence of a row whose entries are all zero in an augmented matrix tell us about the solution space of the linear system?

b) 
    How can you determine if a linear system has no solutions directly from its reduced row echelon matrix?

c) 
    How can you determine if a linear system has infinitely many solutions directly from its reduced row echelon matrix?

d) 
    What can you say about the solution space of a linear system if there are more variables than equations and at least one solution exists?

ANSWER:

a) 
    Nothing.

b) 
    The leading entry of some row appears in the rightmost column of the augmented matrix.

c) 
    There is a column that is not the rightmost and that does not contain the leading entry of a row. Also, the rightmost column does not contain a leading entry.

d) 
    There are infinitely many solutions.

SOLUTION:

a) 
    It doesn't tell us anything. The equation is true for any values of the variables. Therefore, it does not provide a restriction on the solution space.

b) 
    There must be an equation having the form $0=1$ so there is a row whose leading entry is in the rightmost column of the augmented matrix.

c) 
    First, we know there are solutions so no row can have its leading entry in the rightmost column of the augmented matrix. Second, there must be a free variable to have infinitely many solutions. Therefore, there must be at least one column that corresponds to a variable that does not contain the leading entry of a row.

d) 
    There must be infinitely many solutions since there will be a free variable.

:::

:::exercise {exercise-1-2-006} number=1.2.6 answered=yes src=src/exercises/exercises1-2.xml:828
PROBLEM:
Determine whether the following statements are true or false and explain your reasoning.

a) 
    If every variable is basic, then a consistent linear system has exactly one solution.

b) 
    If two augmented matrices are row equivalent to one another, then they describe two linear systems having the same solution spaces.

c) 
    The presence of a free variable indicates that there are no solutions to the linear system.

d) 
    If a linear system has exactly one solution, then it must have the same number of equations as variables.

e) 
    If a linear system has the same number of equations as variables, then it has exactly one solution.

ANSWER:

a) 
    True.

b) 
    True.

c) 
    False.

d) 
    False.

e) 
    False.

SOLUTION:

a) 
    This is true provided that there is some solution to the linear system. We have to avoid the situation when there are infinitely many solutions, and this happens only when there is a free variable.

b) 
    This is true. When two matrices are row equivalent, there is a sequence of scaling, interchange, and replacement operations that transforms one matrix into the other. These operations do not change the solution space of the matrix.

c) 
    This is false. The presence of a free variable tells us there are infinitely many solutions if the system is consistent.

d) 
    This is false. The reduced row echelon form of the augmented matrix could look like

    $$ \left[\begin{array}{rr|r} 1 & 0 & -3 \\ 0 & 1 & 4 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

    In this case, there are three equations in two variables, and the system has exactly one solution.

e) 
    This is false, and here is a reduced row echelon matrix that illustrates why.

    $$ \left[\begin{array}{rr|r} 1 & 2 & -1 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

:::
