# Chapter 5 Linear algebra and computing {chap5}

Our principal tool for finding solutions to linear systems has been Gaussian elimination, which we first met back in [Section 1.2](ref:1.2#sec-finding-solutions). When presented with a linear system, we frequently find the reduced row echelon form of the system's augmented matrix to read off the solution.

While this is a convenient approach for learning linear algebra, people rarely use the reduced row echelon form of a matrix. In fact, many linear algebra software packages do not include functions for finding the reduced row echelon form. In this chapter, we will describe why this is the case and then explore some alternatives. The intent of this chapter is to demonstrate how linear algebraic computations are handled in practice. More specifically, we will improve our techniques for solving linear systems and for finding eigenvectors through Gaussian elimination.
