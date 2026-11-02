# 1.3 Computation with Sage {sec-sage-introduction}

Linear algebra owes its prominence as a powerful scientific tool to the ever-growing power of computers. Carl Cowen, a former president of the Mathematical Association of America, has said, “No serious application of linear algebra happens without a computer.” Indeed, Cowen notes that, in the 1950s, working with a system of 100 equations in 100 variables was difficult. Today, scientists and mathematicians routinely work on problems that are vastly larger. This is only possible because of today's computing power.
It is therefore important for any student of linear algebra to become comfortable solving linear algebraic problems on a computer. This section will introduce you to a program called Sage that can help. While you may be able to do much of this work on a graphing calculator, you are encouraged to become comfortable with Sage as we will use increasingly powerful features as we encounter their need.

## 1.3.1 Introduction to Sage

There are several ways to access Sage.

- 
    If you are reading this book online, there will be embedded “Sage cells” at appropriate places in the text. You have the opportunity to type Sage commands into these cells and execute them, provided you are connected to the Internet. Please be aware that your work will be lost if you reload the page.

    Here is a Sage cell containing a command that asks Sage to multiply 5 and 3. You may execute the command by pressing the *Evaluate* button.

    :::sage
    ```sage
    		5 * 3

    ```
    :::

- 
    You may also go to [cocalc.com](https://cocalc.com), sign up for an account, open a new project, and create a “Sage worksheet.” Once inside the worksheet, you may enter commands as shown here, and evaluate them by pressing *Enter* on your keyboard while holding down the *Shift* key.

- 
    There is a page of Sage cells at [gsvu.edu/s/0Ng](http://gvsu.edu/s/0Ng). Any results obtained by evaluating one cell are available in other cells. However, your work will be lost when the page is reloaded.

Throughout the text, we will introduce new Sage commands that allow us to explore linear algebraic concepts. These commands are collected and summarized in the reference found in [Appendix A](ref:back#app-sage-reference).

:::activity {act:activity-1-3-1} Activity 1.3.1 (Basic Sage commands)

a) 
    Sage uses the standard operators +, -, *, /, and ^ for the usual arithmetic operations. By entering text in the cell below, ask Sage to evaluate

    $$ 3 + 4(2^4 - 1) $$

    .

    :::sage
    ```sage

    ```
    :::

b) 
    Notice that we can create new lines by pressing *Enter* and entering additional commands on them. 	What happens when you evaluate this Sage cell?

    :::sage
    ```sage
    		  5 * 3
    		  10 - 4

    ```
    :::

    Notice that we only see the result from the last command. With the `print` command, we may see earlier results, if we wish.

    :::sage
    ```sage
    		  print(5 * 3)
    		  print(10 - 4)

    ```
    :::

c) 
    We may give a name to the result of one command and refer to it in a later command.

    :::sage
    ```sage
    		  income = 1500 * 12
    		  taxes = income * 0.15
    		  print(taxes)

    ```
    :::

    Suppose you have three tests in your linear algebra class and your scores are 90, 100, and 98. In the Sage cell below, add your scores together and call the result `total`. On the next line, find the average of your test scores and print it.

    :::sage
    ```sage

    ```
    :::

d) 
    If you are not a programmer, you may ignore this part. If you are an experienced programmer, however, you should know that Sage is written in the Python programming language and that you may enter Python code into a Sage cell.

    :::sage
    ```sage
    for i in range(10):
        print(i)

    ```
    :::

ANSWER:

a) 

    ```
    3 + 4*(2^4 - 1)
    	      
    ```

b) 
    Only the results of the last line are displayed.

c) 

    ```
    total = 90 + 100 + 98
    average = total / 3
    print(average)
    	      
    ```

d) 
    This cells print the integers from 0 to 9.

SOLUTION:

a) 

    ```
    3 + 4*(2^4 - 1)
    	      
    ```

b) 
    Only the results of the last line are displayed.

c) 

    ```
    total = 90 + 100 + 98
    average = total / 3
    print(average)
    	      
    ```

d) 
    This cells print the integers from 0 to 9.

:::

## 1.3.2 Sage and matrices

When we encounter a matrix, [Theorem 1.2.6](ref:1.2#thm-rref-is-unique) tells us that there is exactly one reduced row echelon matrix that is row equivalent to it.

In fact, the uniqueness of this reduced row echelon matrix is what motivates us to define this particular form. When solving a system of linear equations using Gaussian elimination, there are other row equivalent matrices that reveal the structure of the solution space. The reduced row echelon matrix is simply a convenience as it is an agreement we make with one another to seek the same matrix.

An added benefit is that we can ask a computer program, like Sage, to find reduced row echelon matrices for us. We will learn how to do this now that we have a little familiarity with Sage.

First, notice that a matrix has a certain number of rows and columns. For instance, the matrix

$$ \left[ \begin{array}{rrrrr} * & * & * & * & * \\ * & * & * & * & * \\ * & * & * & * & * \\ \end{array} \right] $$

has three rows and five columns. We consequently refer to this as a $3\times 5$ matrix.

We may ask Sage to create the $2\times4$ matrix

$$ \left[ \begin{array}{rrrr} -1 & 0 & 2 & 7 \\ 2 & 1 & -3 & -1 \\ \end{array} \right] $$

by entering

:::sage
```sage
	matrix(2, 4, [-1, 0, 2, 7, 2, 1, -3, -1])

```
:::

When evaluated, Sage will confirm the matrix by writing out the rows of the matrix, each inside square brackets.

Notice that there are three separate things (we call them *arguments*) inside the parentheses: the number of rows, the number of columns, and the entries of the matrix listed by row inside square brackets. These three arguments are separated by commas. Notice that there is no way of specifying whether this is an augmented or coefficient matrix so it will be up to us to interpret our results appropriately.

:::assemblage {asm:assemblage-} Sage syntax
Some common mistakes are

- 
    to forget the square brackets around the list of entries,

- 
    to omit an entry from the list or to add an extra one,

- 
    to forget to separate the rows, columns, and entries by commas, and

- 
    to omit the parentheses around the arguments after `matrix`.

If you see an error message, carefully proofread your input and try again.
:::

Alternatively, you can create a matrix by simply listing its rows, like this

```
matrix([ [-1, 0, 2, 7],	
	 [ 2, 1,-3,-1] ])
      
```

:::activity {act:activity-1-3-2} Activity 1.3.2 (Using Sage to find row reduced echelon matrices)

a) 
    Enter the following matrix into Sage.

    $$ \left[ \begin{array}{rrrr} -1 & -2 & 2 & -1 \\ 2 & 4 & -1 & 5 \\ 1 & 2 & 0 & 3 \end{array} \right] $$

    :::sage
    ```sage

    ```
    :::

b) 
    Give the matrix the name $A$ by entering

    ```
    A = matrix( ..., ..., [ ... ])
    	      
    ```

    We may then find its reduced row echelon form by entering

    ```
    A = matrix( ..., ..., [ ... ])
    A.rref()
    	      
    ```

    A common mistake is to forget the parentheses after `rref`.

    Use Sage to find the reduced row echelon form of the matrix from [Item a](ref:li-example-rref) of this activity.

    :::sage
    ```sage

    ```
    :::

c) 
    Use Sage to describe the solution space of the system of linear equations

    $$ \begin{alignedat}{5} -x_1 & & & & & {}+{} & 2x_4 & {}={} & 4 \\ & & 3x_2 & {}+{} & x_3 & {}+{} & 2x_4 & {}={} & 3 \\ 4x_1 & {}-{} & 3x_2 & & & {}+{} & x_4 & {}={} & 14 \\ & & 2x_2 & {}+{} & 2x_3 & {}+{} & x_4 & {}={} & 1 \\ \end{alignedat} $$

    :::sage
    ```sage

    ```
    :::

d) 
    Consider the two matrices:

    $$ \begin{array}{rcl} A & = & \left[ \begin{array}{rrrr} 1 & -2 & 1 & -3 \\ -2 & 4 & 1 & 1 \\ -4 & 8 & -1 & 7 \\ \end{array}\right] \\ B & = & \left[ \begin{array}{rrrrrr} 1 & -2 & 1 & -3 & 0 & 3 \\ -2 & 4 & 1 & 1 & 1 & -1 \\ -4 & 8 & -1 & 7 & 3 & 2 \\ \end{array}\right] \\ \end{array} $$

    We say that $B$ is an *augmentation* of $A$ because it is obtained from $A$ by adding some more columns.

    Using Sage, define the matrices and compare their reduced row echelon forms. What do you notice about the relationship between the two reduced row echelon forms?

    :::sage
    ```sage

    ```
    :::

e) 
    Using the system of equations in [Item c](ref:li-rref-solve), write the augmented matrix corresponding to the system of equations. What did you find for the reduced row echelon form of the augmented matrix?

    Now write the coefficient matrix of this system of equations. What does [Item d](ref:li-augmentation-principle) of this activity tell you about its reduced row echelon form?

ANSWER:

a) 

    ```
    matrix(3, 4, [-1,-2, 2,-1,
                   2, 4,-1, 5,
                   1, 2, 0, 3])
    		
    ```

b) 
    The reduced row echelon form of the matrix is

    $$ \begin{bmatrix} 1 & 2 & 0 & 3 \\ 0 & 0 & 1 & 1 \\ 0 & 0 & 0 & 0 \end{bmatrix}. $$

c) 
    There is a unique solution $(x_1,x_2,x_3,x_4) = (-2,-1,0,3)$.

d) 
    The first four columns of the reduced row echelon form of $B$ form the reduced row echelon form of $A$.

e) 
    The reduced row echelon form of the coefficient matrix is

    $$ \begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{bmatrix}. $$

SOLUTION:

a) 

    ```
    matrix(3, 4, [-1,-2, 2,-1,
                   2, 4,-1, 5,
                   1, 2, 0, 3])
    		
    ```

b) 
    The reduced row echelon form of the matrix is

    $$ \begin{bmatrix} 1 & 2 & 0 & 3 \\ 0 & 0 & 1 & 1 \\ 0 & 0 & 0 & 0 \end{bmatrix}. $$

c) 
    Sage tells us that the reduced row echelon form of the corresponding augmented matrix is

    $$ \begin{bmatrix} 1 & 0 & 0 & 0 & -2 \\ 0 & 1 & 0 & 0 & -1 \\ 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 & 3 \\ \end{bmatrix} $$

    so there is a unique solution $(x_1,x_2,x_3,x_4) = (-2,-1,0,3)$.

d) 
    The first four columns of the reduced row echelon form of $B$ form the reduced row echelon form of $A$.

e) 
    The reduced row echelon form of the coefficient matrix is

    $$ \begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{bmatrix}. $$

:::

:::assemblage {asm:assemblage-} Sage practices
Here are some practices that you may find helpful when working with matrices in Sage.

- 
    Break the matrix entries across lines, one for each row, for better readability by pressing *Enter* between rows.

    ```
    A = matrix(2, 4, [ 1, 2, -1, 0,
                      -3, 0,  4, 3 ])
    	
    ```

- 
    Print your original matrix to check that you have entered it correctly. You may want to also print a dividing line to separate matrices.

    ```
    A = matrix(2, 2, [ 1, 2,
                       2, 2])
    print (A)
    print ("---------")
    A.rref()
    	
    ```

:::

The last part of the previous activity, [Item d](ref:li-augmentation-principle), demonstrates something that will be helpful for us in the future. In that activity, we started with a matrix $A$, which we augmented by adding some columns to obtain a matrix $B$. We then noticed that the reduced row echelon form of $B$ is itself an augmentation of the reduced row echelon form of $A$.

To illustrate, we can consider the reduced row echelon form of the augmented matrix:

$$ \left[ \begin{array}{ccc|c} -2 & 3 & 0 & 2 \\ -1 & 4 & 1 & 3 \\ 3 & 0 & 2 & 2 \\ 1 & 5 & 3 & 7 \\ \end{array} \right] \sim \left[ \begin{array}{ccc|c} 1 & 0 & 0 & -4 \\ 0 & 1 & 0 & -2 \\ 0 & 0 & 1 & 7 \\ 0 & 0 & 0 & 0 \\ \end{array} \right] $$

We can then determine the reduced row echelon form of the coefficient matrix by looking inside the augmented matrix.

$$ \left[ \begin{array}{ccc} -2 & 3 & 0 \\ -1 & 4 & 1 \\ 3 & 0 & 2 \\ 1 & 5 & 3 \\ \end{array} \right] \sim \left[ \begin{array}{ccc} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ 0 & 0 & 0 \\ \end{array} \right] $$

If we trace through the steps in the Gaussian elimination algorithm carefully, we see that this is a general principle, which we now state.

:::proposition {prop:principle-augmentation-principle} Proposition 1.3.1 (Augmentation Principle)
If matrix $B$ is an augmentation of matrix $A$, then the reduced row echelon form of $B$ is an augmentation of the reduced row echelon form of $A$.
:::

## 1.3.3 Computational effort {subsec-compute-effort}

At the beginning of this section, we indicated that linear algebra has become more prominent as computers have grown more powerful. Computers, however, still have limits. Let's consider how much effort is expended when we ask to find the reduced row echelon form of a matrix. We will measure, very roughly, the effort by the number of times the algorithm requires us to multiply or add two numbers.

We will assume that our matrix has the same number of rows as columns, which we call $n$. We are mainly interested in the case when $n$ is very large, which is when we need to worry about how much effort is required.

Let's first consider the effort required for each of our row operations.

- 
    Scaling a row multiplies each of the $n$ entries in a row by some number, which requires $n$ operations.

- 
    Interchanging two rows requires no multiplications or additions so we won't worry about the effort required by an interchange.

- 
    A replacement requires us to multiply each entry in a row by some number, which takes $n$ operations, and then add the resulting entries to another row, which requires another $n$ operations. The total number of operations is $2n$.

Our goal is to transform a matrix to its reduced row echelon form, which looks something like this:

$$ \left[ \begin{array}{cccc} 1 & 0 & \ldots & 0 \\ 0 & 1 & \ldots & 0 \\ \vdots & \vdots & \ddots & 0 \\ 0 & 0 & \ldots & 1 \\ \end{array} \right] $$

. We roughly perform one replacement operation for every 0 entry in the reduced row echelon matrix. When $n$ is very large, most of the $n^2$ entries in the reduced row echelon form are 0 so we need roughly $n^2$ replacements. Since each replacement operation requires $2n$ operations, the number of operations resulting from the needed replacements is roughly $n^2(2n) = 2n^3$.

Each row is scaled roughly one time so there are roughly $n$ scaling operations, each of which requires $n$ operations. The number of operations due to scaling is roughly $n^2$.

Therefore, the total number of operations is roughly

$$ 2n^3 + n^2 $$

. When $n$ is very large, the $n^2$ term is much smaller than the $n^3$ term. We therefore state that

:::observation {obs:observation-1-3-2} Observation 1.3.2
The number of operations required to find the reduced row echelon form of an $n\times n$ matrix is roughly proportional to $n^3$.
:::

This is a very rough measure of the effort required to find the reduced row echelon form; a more careful accounting shows that the number of arithmetic operations is roughly $\frac23 n^3$. As we have seen, some matrices require more effort than others, but the upshot of this observation is that the effort is proportional to $n^3$. We can think of this in the following way: If the size of the matrix grows by a factor of 10, then the effort required grows by a factor of $10^3 = 1000$.

While today's computers are powerful, they cannot handle every problem we might ask of them. Eventually, we would like to be able to consider matrices that have $n=10^{12}$ (a trillion) rows and columns. In very broad terms, the effort required to find the reduced row echelon matrix will require roughly $(10^{12})^3 = 10^{36}$ operations.

To put this into context, imagine we need to solve a linear system with a trillion equations and a trillion variables and that we have a computer that can perform a trillion, $10^{12}$, operations every second. Finding the reduced row echelon form would take about $10^{16}$ years. At this time, the universe is estimated to be approximately $10^{10}$ years old. If we started the calculation when the universe was born, we'd be about one-millionth of the way through.

This may seem like an absurd situation, but we'll see in [Subsection 4.5.4](ref:4.5#subsec-google) how we use the results of such a computation every day. Clearly, we will need some better tools to deal with *really* big problems like this one.

## 1.3.4 Summary

We learned some basic features of Sage with an emphasis on finding the reduced row echelon form of a matrix.

- 
    Sage can perform basic arithmetic using standard operators. Sage can also save results from one command to be reused in a later command.

- 
    We may define matrices in Sage and find the reduced row echelon form using the `rref` command.

- 
    We saw an example of the [Augmentation Principle](ref:principle-augmentation-principle), which we then stated as a general principle.

- 
    We saw that the computational effort required to find the reduced row echelon form of an $n\times n$ matrix is proportional to $n^3$.

[Appendix A](ref:back#app-sage-reference) contains a reference outlining the Sage commands that we have encountered.

## 1.3.5 Exercises

:::exercise {exercise-1-3-001} number=1.3.1 answered=yes src=src/exercises/exercises1-3.xml:4
PROBLEM:
Consider the linear system

$$ \begin{alignedat}{4} x & {}+{} & 2y & {}-{} & z & {}={} & 1 \\ 3x & {}+{} & 2y & {}+{} & 2z & {}={} & 7 \\ -x & & & {}+{} & 4z & {}={} & -3 \\ \end{alignedat} $$

Write this system as an augmented matrix and use Sage to find a description of the solution space.
:::sage
```sage

```
:::
ANSWER:
There is exactly one solution $(3,-1,0)$.
SOLUTION:
We can use Sage to find the reduced row echelon form of the corresponding augmented matrix:

$$ \left[\begin{array}{rrr|r} 1 & 2 & -1 & 1 \\ 3 & 2 & 2 & 7 \\ -2 & 0 & 4 & -3 \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 0 & 3 \\ 0 & 1 & 0 & -1 \\ 0 & 0 & 1 & 0 \end{array}\right]\text{.} $$

This shows that there is exactly one solution $(3,-1,0)$.
:::

:::exercise {exercise-1-3-002} number=1.3.2 answered=yes src=src/exercises/exercises1-3.xml:52
PROBLEM:
Shown below are some traffic patterns in the downtown area of a large city. The figures give the number of cars per hour traveling along each road. Any car that drives into an intersection must also leave the intersection. This means that the number of cars entering an intersection in an hour is equal to the number of cars leaving the intersection.

a) 
    Let's begin with the following traffic pattern.

    a) 
        How many cars per hour enter the upper left intersection? How many cars per hour leave this intersection? Use this to form a linear equation in the variables $x$, $y$, $z$, and $w$.

        > FIGURE {fig:fig-1-3-3} number=1.3.3 src=../../media/ch01/1-3-traffic-b.svg
        > alt: A set of intersecting streets along with a measure of the rate of traffic flow on each street.
        > width: 70%
        > caption: A set of intersecting streets along with a measure of the rate of traffic flow on each street.

    b) 
        Form three more linear equations from the other three intersections to form a linear system having four equations in four variables. Then use Sage to find the solution space to this system.

        :::sage
        ```sage

        ```
        :::

    c) 
        Is there exactly one solution or infinitely many solutions? Explain why you would expect this given the information provided.

b) 
    Another traffic pattern is shown below.

    > FIGURE {fig:fig-1-3-4} number=1.3.4 src=../../media/ch01/1-3-traffic-a.svg
    > alt: A set of intersecting streets along with a measure of the rate of traffic flow on each street.
    > width: 70%
    > caption: Another set of intersecting streets along with a measure of the rate of traffic flow on each street.

    a) 
        Once again, write a linear system for the quantities $x$, $y$, $z$, and $w$ and solve the system using the Sage cell below.

        :::sage
        ```sage

        ```
        :::

    b) 
        What can you say about the solution of this linear system? Is there exactly one solution or infinitely many solutions? Explain why you would expect this given the information provided.

    c) 
        What is the smallest possible amount of traffic flowing through $x$?

ANSWER:

a) 
    There is one solution: $x=400$, $y=300$, $z=550$, and $w=160$.

b) 
    There are infinitely many solutions described by

    $$ \begin{alignedat}{3} x & {}={} & 70 + w \\ y & {}={} & 580 - w \\ z & {}={} & 220 + w\text{.} \\ \end{alignedat} $$

SOLUTION:

a) 
    We will form a linear system by considering each intersection and equating the number of cars that enter the intersection to the number of cars that leave.

    1. 
        For the intersection in the upper left, the number of cars that enter is $x$ while the number of cars that leave is $y + 100$. This gives the equation $x = y + 100$ or $x-y = 100$.

    2. 
        By studying the other three intersections, we form a linear system consisting of four equations in four variables:

        $$ \begin{alignedat}{5} x & {}-{} & y & & & & & {}={} & 100 \\ & & y & {}-{} & z & & & {}={} & -250 \\ & & & & & & w & {}={} & 160 \\ & & & & z & {}-{} & w & {}={} & 390\text{.} \\ \end{alignedat} $$

        If we express these equations in terms of an augmented matrix and use Sage to find its reduced row echelon form, we find

        $$ \left[\begin{array}{rrrr|r} 1 & -1 & 0 & 0 & 100 \\ 0 & 1 & -1 & 0 & -250 \\ 0 & 0 & 0 & 1 & 160 \\ 0 & 0 & 1 & -1 & 390 \end{array}\right] \sim \left[\begin{array}{rrrrr} 1 & 0 & 0 & 0 & 400 \\ 0 & 1 & 0 & 0 & 300 \\ 0 & 0 & 1 & 0 & 550 \\ 0 & 0 & 0 & 1 & 160 \end{array}\right] $$

    3. 
        There is exactly one solution: $x=400$, $y=300$, $z=550$, and $w=160$. This is what we expect since the traffic flow $w$ is determined by the upper right intersection. From here, all the other flows are determined as well.

b) 
    Let's now look at another traffic pattern.

    1. 
        In this case, we find the equations:

        $$ \begin{alignedat}{5} x & {}+{} & y & & & & & {}={} & 650 \\ x & & & {}-{} & z & & & {}={} & -150 \\ & & y & & & {}+{} & w & {}={} & 580 \\ & & & & z & {}-{} & w & {}={} & 220\text{.} \\ \end{alignedat} $$

        This gives the augmented matrix:

        $$ \left[\begin{array}{rrrr|r} 1 & 1 & 0 & 0 & 650 \\ 1 & 0 & -1 & 0 & -150 \\ 0 & 1 & 0 & 1 & 580 \\ 0 & 0 & 1 & -1 & 220 \end{array}\right] \sim \left[\begin{array}{rrrrr} 1 & 0 & 0 & -1 & 70 \\ 0 & 1 & 0 & 1 & 580 \\ 0 & 0 & 1 & -1 & 220 \\ 0 & 0 & 0 & 0 & 0 \end{array}\right]\text{.} $$

    2. 
        Here, we may view $w$ as a free variable and write

        $$ \begin{alignedat}{3} x & {}={} & 70 + w \\ y & {}={} & 580 - w \\ z & {}={} & 220 + w\text{.} \\ \end{alignedat} $$

        This shows that there are infinitely many solutions. This makes sense since the unknown flows $x$, $y$, $z$, and $w$ form a loop. For instance, we can add one car to each of $x$, $z$, and $w$ provided we remove one from $y$.

    3. 
        Since we must have $y\geq 0$, it follows that the free variable $w$ satisfies $0\leq w \leq 580$. This means that $x$ satisfies $70 \leq x \leq 650$.

:::

:::exercise {exercise-1-3-003} number=1.3.3 answered=yes src=src/exercises/exercises1-3.xml:362
PROBLEM:
A typical problem in thermodynamics is to find the steady-state temperature distribution inside a thin plate if we know the temperature around the boundary. Let $T_1, T_2, \ldots, T_6$ be the temperatures at the six nodes inside the plate as shown below.
> FIGURE {fig:fig-1-3-5} number=1.3.5 src=../../media/ch01/1-3-heat.svg
> alt: The temperature distribution of a thin plate.
> width: 55%
> caption: The temperature distribution of a thin plate.
The temperature at a node is approximately the average of the four nearest nodes: for instance,

$$ T_1 = (10 + 15 + T_2 + T_4)/4 $$

, which we may rewrite as

$$ 4T_1 - T_2 - T_4 = 25 $$

.
Set up a linear system to find the temperature at these six points inside the plate. Then use Sage to solve the linear system. If all the entries of the matrix are integers, Sage will compute the reduced row echelon form using rational numbers. To view a decimal approximation of the results, you may use

```
A.rref().numerical_approx(digits=4)
      
```

:::sage
```sage

```
:::
In the real world, the approximation becomes better as we add more and more points into the grid. This is a situation where we may want to solve a linear system having millions of equations and millions of variables.
ANSWER:

$$ \begin{array}{rrr} T_1 = 14.86, & T_2 = 20.50, & T_3 = 26.19 \\ T_4 = 13.95, & T_5 = 20.93, & T_6 = 29.28\text{.} \\ \end{array} $$

SOLUTION:
We set up the equations

$$ \begin{alignedat}{7} 4T_1 & {}-{} & T_2 & & & {}-{} & T_4 & & & & & {}={} & 25 \\ -T_1 & {}+{} & 4T_2 & {}-{} & T_3 & & &{}-{} & T_5 & & & {}={} & 20 \\ & & -T_2 & {}+{} & 4T_3 & & & & & {}-{} & T_6 & {}={} & 55 \\ -T_1 & & & & & {}{}+ & 4T_4 & {}-{} & T_5 & & & {}={} & 20 \\ & & -T_2 & & & {}-{} & T_4 & {}+{} & 4T_5 & {}-{} & T_6 & {}={} & 20 \\ & & & & -T_3 & & & {}-{} & T_5 & {}+{} & 4T_6 & {}={} & 70\text{.} \\ \end{alignedat} $$

Setting up an augmented matrix and using Sage to find its reduced row echelon form, we obtain

$$ \begin{array}{rrr} T_1 = 14.86, & T_2 = 20.50, & T_3 = 26.19 \\ T_4 = 13.95, & T_5 = 20.93, & T_6 = 29.28\text{.} \\ \end{array} $$

:::

:::exercise {exercise-1-3-004} number=1.3.4 answered=yes src=src/exercises/exercises1-3.xml:485
PROBLEM:
The fuel inside model rocket motors is a black powder mixture that ideally consists of 60% charcoal, 30% potassium nitrate, and 10% sulfur by weight.
Suppose you work at a company that makes model rocket motors. When you come into work one morning, you learn that yesterday's first shift made a perfect batch of fuel. The second shift, however, misread the recipe and used 50% charcoal, 20% potassium nitrate and 30% sulfur. Then the two batches were mixed together. A chemical analysis shows that there are 100.3 pounds of charcoal in the mixture and 46.9 pounds of potassium nitrate.

a) 
    Assuming the first shift produced $x$ pounds of fuel and the second $y$ pounds, set up a linear system in terms of $x$ and $y$. How many pounds of fuel did the first shift produce and how many did the second shift produce?

    :::sage
    ```sage

    ```
    :::

b) 
    How much sulfur would you expect to find in the mixture?

ANSWER:
The first shift produces $x=113$ pounds while the second shift produces $y=65$ pounds. There are $30.8$ pounds of sulfur.
SOLUTION:

a) 
    Writing equations for the amount of charcoal and the amount of potassium nitrate, we have

    $$ \begin{alignedat}{3} 0.6x & {}+{} & 0.5y & {}={} & 100.3 \\ 0.3x & {}+{} & 0.2y & {}={} & 46.9\text{.} \\ \end{alignedat} $$

    Solving this gives $x=113$ pounds and $y=65$ pounds.

b) 
    The amount of sulfur will be $0.1x+0.3y = 30.8$ pounds.

:::

:::exercise {exercise-1-3-005} number=1.3.5 answered=yes src=src/exercises/exercises1-3.xml:556
PROBLEM:
This exercise is about balancing chemical reactions.

a) 
    Chemists denote a molecule of water as $\text{H}_2\text{O}$, which means it is composed of two atoms of hydrogen (H) and one atom of oxygen (O). The process by which hydrogen burns is described by the chemical reaction

    $$ x\thinspace \text{H}_2 + y\thinspace\text{O}_2 \to z\thinspace \text{H}_2\text{O} $$

    This means that $x$ molecules of hydrogen $\text{H}_2$ combine with $y$ molecules of oxygen $\text{O}_2$ to produce $z$ water molecules. The number of hydrogen atoms is the same before and after the reaction; the same is true of the oxygen atoms.

    1. 
        In terms of $x$, $y$, and $z$, how many hydrogen atoms are there before the reaction? How many hydrogen atoms are there after the reaction? Find a linear equation in $x$, $y$, and $z$ by equating these quantities.

    2. 
        Find a second linear equation in $x$, $y$, and $z$ by equating the number of oxygen atoms before and after the reaction.

    3. 
        Find the solutions of this linear system. Why are there infinitely many solutions?

        :::sage
        ```sage

        ```
        :::

    4. 
        In this chemical setting, $x$, $y$, and $z$ should be positive integers. Find the solution where $x$, $y$, and $z$ are the smallest possible positive integers.

b) 
    Now consider the reaction where potassium permanganate and manganese sulfate combine with water to produce manganese dioxide, potassium sulfate, and sulfuric acid:

    $$ x_1\thinspace \text{K}\text{Mn}\text{O}_4 + x_2\thinspace \text{Mn}\text{S}\text{O}_4 + x_3\thinspace \text{H}_2\text{O} \to x_4\thinspace \text{Mn}\text{O}_2 + x_5\thinspace \text{K}_2\text{S}\text{O}_4 + x_6\thinspace \text{H}_2\text{S}\text{O}_4. $$

    As in the previous exercise, find the appropriate values for $x_1, x_2, \ldots, x_6$ to balance the chemical reaction.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    We have the reaction

    $$ 2\thinspace \text{H}_2 + \thinspace\text{O}_2 \to 2\thinspace \text{H}_2\text{O}\text{.} $$

b) 
    We have the reaction

    $$ 2\thinspace \text{K}\text{Mn}\text{O}_4 + 3\thinspace \text{Mn}\text{S}\text{O}_4 + 2\thinspace \text{H}_2\text{O} \to 5\thinspace \text{Mn}\text{O}_2 + \thinspace \text{K}_2\text{S}\text{O}_4 + 2\thinspace \text{H}_2\text{S}\text{O}_4. $$

SOLUTION:

a) 
    We will equate the number of hydrogen and oxygen atoms before and after the reaction.

    1. 
        Before the reaction, there are two hydrogen atoms for every hydrogen molecule. Since there are $x$ hydrogen molecules, we have $2x$ hydrogen atoms before the reaction.

        After the reaction, there are two hydrogen atoms for every water molecule. Since there are $z$ hydrogen molecules, we have $2z$ hydrogen atoms after the reaction. This gives the equation $2x=2z$.

    2. 
        Similarly, there are $2y$ oxygen atoms before the reaction and $z$ oxygen atoms after. This gives the equation $2y = z$.

    3. 
        We have the linear system

        $$ \begin{alignedat}{4} 2x & & & {}-{} & 2z & {}={} & 0 \\ & & 2y & {}-{} & z & {}={} & 0\text{.} \\ \end{alignedat} $$

        When we create the augmented matrix and find its reduced row echelon form, we see that $z$ is a free variable so that

        $$ \begin{alignedat}{2} x & {}={} & z \\ y & {}={} & \frac12 z\text{.} \\ \end{alignedat} $$

        We need all the quantities to be integers, and the smallest value of $z$ that makes $y$ an integer is $z=2$. Therefore, we have $x=2$, $y=1$, and $z=2$. The reaction is then

        $$ 2\thinspace \text{H}_2 + \thinspace\text{O}_2 \to 2\thinspace \text{H}_2\text{O}\text{.} $$

b) 
    Proceeding as in the previous part, we have

    $$ \begin{alignedat}{8} \text{K:} & \thinspace & x_1 & & & & & & & {}-{} & 2x_5 & & & {}={} & 0 \\ \text{Mn:} & \thinspace & x_1 & {}+{} & x_2 & & & {}-{} & x_4 & & & & & {}={} & 0 \\ \text{O:} & \thinspace & 4x_1 & {}+{} & 4x_2 & {}+{} & x_3 & {}-{} & 2x_4 & {}-{} & 4x_5 & {}-{} & 4x_6 & {}={} & 0 \\ \text{S:} & \thinspace & & & x_2 & & & & & {}-{} & x_5 & {}-{} & x_6 & {}={} & 0 \\ \text{H:} & \thinspace & & & & & 2x_3 & & & & & {}-{} & 2x_6 & {}= & 0\text{.} \\ \end{alignedat} $$

    Solving this linear system, we find

    $$ \begin{alignedat}{2} x_1 & {}={} & x_6 \\ x_2 & {}={} & \frac32 x_6 \\ x_3 & {}={} & x_6 \\ x_4 & {}={} & \frac52 x_6 \\ x_5 & {}={} & \frac12 x_6\text{.} \\ \end{alignedat} $$

    Once again, we choose $x_6$ to be the smallest positive integer that causes all of the variables to be integers. This means that $x_6 = 2$ so that we have

    $$ \begin{array}{rrr} x_1 = 2, & x_2 = 3, & x_3 = 2, \\ x_4 = 5, & x_5 = 1, & x_6 = 2\text{.} \\ \end{array} $$

    This gives the reaction:

    $$ 2\thinspace \text{K}\text{Mn}\text{O}_4 + 3\thinspace \text{Mn}\text{S}\text{O}_4 + 2\thinspace \text{H}_2\text{O} \to 5\thinspace \text{Mn}\text{O}_2 + \thinspace \text{K}_2\text{S}\text{O}_4 + 2\thinspace \text{H}_2\text{S}\text{O}_4. $$

:::

:::exercise {exercise-1-3-006} number=1.3.6 answered=yes src=src/exercises/exercises1-3.xml:786
PROBLEM:
We began this section by stating that increasing computational power has helped linear algebra assume a prominent role as a scientific tool. Later, we looked at one computational limitation: once a matrix gets to be too big, it is not reasonable to apply Gaussian elimination to find its reduced row echelon form.
In this exercise, we will see another limitation: computer arithmetic with real numbers is only an approximation because computers represent real numbers with only a finite number of bits. For instance, the number pi

$$ \pi = 3.141592653589793238462643383279502884197169399\ldots $$

would be approximated inside a computer by, say,

$$ \pi\approx 3.141592653589793 $$

Most of the time, this is not a problem. However, when we perform millions or even billions of arithmetic operations, the error in these approximations starts to accumulate and can lead to results that are wildly inaccurate. Here are two examples demonstrating this.

a) 
    Let's first see an example showing that computer arithmetic really is an approximation. First, consider the linear system

    $$ \begin{alignedat}{4} x & {}+{} & \frac12y & {}+{} & \frac13z & {}={} & 1 \\ \frac12x & {}+{} & \frac13y & {}+{} & \frac14z & {}={} & 0 \\ \frac13x & {}+{} & \frac14y & {}+{} & \frac15z & {}={} & 0 \\ \end{alignedat} $$

    If the coefficients are entered into Sage as fractions, Sage will find the exact reduced row echelon form. Find the exact solution to this linear system.

    :::sage
    ```sage

    ```
    :::

    Now let's ask Sage to compute with real numbers. We can do this by representing one of the coefficients as a decimal. For instance, the same linear system can be represented as

    $$ \begin{alignedat}{4} x & {}+{} & 0.5y & {}+{} & \frac13z & {}={} & 1 \\ \frac12x & {}+{} & \frac13y & {}+{} & \frac14z & {}={} & 0 \\ \frac13x & {}+{} & \frac14y & {}+{} & \frac15z & {}={} & 0 \\ \end{alignedat} $$

    Most computers do arithmetic using either 32 or 64 bits. To magnify the problem so that we can see it better, we will ask Sage to do arithmetic using only 10 bits as follows.

    :::sage
    ```sage
    	    R = RealNumber
    	    RealNumber = RealField(10)

    	    # enter the matrix below
    	    A = matrix( ..., ..., [ ... ] )

    	    print (A.rref())
    	    RealNumber = R

    ```
    :::

    What does Sage give for the solution now? Compare this to the exact solution that you found previously.

b) 
    Some types of linear systems are particularly sensitive to errors resulting from computers' approximate arithmetic. For instance, suppose we are interested in the linear system

    $$ \begin{alignedat}{3} x & {}+{} & y & {}={} & 2 \\ x & {}+{} 1.001& y & {}={} & 2 \\ \end{alignedat} $$

    Find the solution to this linear system.

    :::sage
    ```sage

    ```
    :::

    Suppose now that the computer has accumulated some error in one of the entries of this system so that it incorrectly stores the system as

    $$ \begin{alignedat}{3} x & {}+{} & y & {}={} & 2 \\ x & {}+{} 1.001& y & {}={} & 2.001 \\ \end{alignedat} $$

    Find the solution to this linear system.

    :::sage
    ```sage

    ```
    :::

    Notice how a small error in one of the entries in the linear system leads to a solution that has a dramatically large error. Fortunately, this is an issue that has been well studied, and there are techniques that mitigate this type of behavior.

ANSWER:

a) 
    The exact solution is

    $$ x=9, y=-36, z=30 $$

    while the approximate solution is

    $$ x=8.9, y=-35, z=29\text{.} $$

b) 
    This solution to the first system is $x=2$ and $y=0$. However, with just a small change in the system, we find the solution $x=1$ and $y=1$.

SOLUTION:

a) 
    The exact solution is

    $$ x=9, y=-36, z=30\text{.} $$

    However, if we compute with only 10 bits, we find the approximate solution

    $$ x=8.9, y=-35, z=29\text{.} $$

b) 
    This solution to the first system is $x=2$ and $y=0$. However, with just a small change in the system, we find the solution $x=1$ and $y=1$.

:::
