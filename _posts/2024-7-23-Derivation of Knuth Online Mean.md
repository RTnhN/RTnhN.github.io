---
layout: post
title: Derivation of Knuth Online Mean
categories: [Blog]
---

For some of the projects I am working on, I need to calculate the mean of a stream of data. I have found that the Knuth online mean is a good way to do this. It is a simple algorithm that is easy to understand and implement. The other nice thing about the formula is that you just need to keep the last mean and the number of samples that have been used in the mean calculation. You don't need to keep a list of all of the values in the stream so far.  While I found the formula online, I was not able to find a derivation of it. It is probably in TAOCP, but I thought that it would be more interesting to derive it myself. That is all that this post is about. I also will show how it is used. 

<!--more-->

The Knuth online mean is often defined as:

$$ \bar{x}_N =  \bar{x}_{N-1} + \frac{x_N - \bar{x}_{N-1}}{N} $$

where $\bar{x}\_{N}$ is the current mean, $\bar{x}\_{N-1}$ is the previous mean, $x\_N$ is the next value in the stream, and $N$ is the number of values in the stream.

We can start this derivation by first defining mean:

$$ \bar{x}_N = \frac{x_N + x_{N-1} + \cdots + x_1}{N} $$

Basically, you sum up all the values up to and including $N$ and divide by $N$.

Let's extract the $x_N$ term and have it be part of it's own term:

$$ \bar{x}_N = \frac{x_N}{N} + \frac{x_{N-1} + \cdots + x_1}{N} $$

Let's now define the previous mean as $\bar{x}_{N-1}$:

$$ \bar{x}_{N-1} = \frac{x_{N-1} + \cdots + x_1}{N-1} $$

The mean formula for $\bar{x}\_N$ is nearly matches the formula for $\bar{x}\_{N-1}$. The only difference is that the term is divided by $N$ instead of $N-1$. We can fix that though by multiplying by $(N-1)/(N-1)$.


$$ \bar{x}_N = \frac{x_N}{N} + \frac{x_{N-1} + \cdots + x_1}{N} \cdot \frac{N-1}{N-1} $$

$$ \bar{x}_N = \frac{x_N}{N} + \frac{x_{N-1} + \cdots + x_1}{N-1} \cdot \frac{N-1}{N} $$

$$ \bar{x}_N = \frac{x_N}{N} + \bar{x}_{N-1} \cdot \frac{N-1}{N} $$

$$ \bar{x}_N = \frac{x_N}{N} + \frac{N\cdot\bar{x}_{N-1}}{N} - \frac{\bar{x}_{N-1}}{N} $$

$$ \bar{x}_N = \bar{x}_{N-1} + \frac{x_N - \bar{x}_{N-1}}{N} $$

When using this formula, $\bar{x}\_0$ is set to 0 and $N$ is set to 1. For each value in the stream, we increment $N$ by 1 and use the last $\bar{x}\_N$ value as $\bar{x}\_{N-1}$.

Let's work at a quick example. Let's say we have the following stream of values:

$$ x = \{1, 2, 3, 4, 5\}$$

We start with $\bar{x}\_0$ set to 0 and $N$ set to 1.

$$ \bar{x}_1 =  \bar{x}_{0} + \frac{x_1 - \bar{x}_{0}}{1} = 0 + \frac{1 - 0}{1} = 0 + 1 = 1 $$

$$ \bar{x}_2 =  \bar{x}_{1} + \frac{x_2 - \bar{x}_{1}}{2} = 1 + \frac{2 - 1}{2} = 1 + \frac{1}{2} = 1.5 $$

$$ \bar{x}_3 =  \bar{x}_{2} + \frac{x_3 - \bar{x}_{2}}{3} = 1.5 + \frac{3 - 1.5}{3} = 1.5 + \frac{1.5}{3} = 2 $$

$$ \bar{x}_4 =  \bar{x}_{3} + \frac{x_4 - \bar{x}_{3}}{4} = 2 + \frac{4 - 2}{4} = 2 + \frac{2}{4} = 2.5 $$

$$ \bar{x}_5 =  \bar{x}_{4} + \frac{x_5 - \bar{x}_{4}}{5} = 2.5 + \frac{5 - 2.5}{3} = 2.5 + \frac{2.5}{5} = 3 $$

If we average the five values in the stream, we get the same result as the last mean value calculated using the online mean formula. 

$$ \bar{x}_5 =   \frac{1+2+3+4+5}{5} = \frac{15}{5} = 3 $$

Here is a Python implementation. You can initialize the class then call the update method with each new value. The update method will return the current mean. You can also use the mean property to get the current mean.

``` python
class KnuthRunningMean:
    def __init__(self):
        self.n = 0
        self.mean = 0.0

    def update(self, x):
        self.n += 1
        self.mean += (x - self.mean) / self.n
        return self.mean

running_mean = KnuthRunningMean()
running_mean.update(1)
print(running_mean.mean)
# 1.0
running_mean.update(2)
print(running_mean.mean)
# 1.5
running_mean.update(3)
print(running_mean.mean)
# 2.0
running_mean.update(4)
print(running_mean.mean)
# 2.5
running_mean.update(5)
print(running_mean.mean)
# 3.0
```


