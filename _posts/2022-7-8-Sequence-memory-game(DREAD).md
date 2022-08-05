---
layout: post
title:  Sequence Memory Game (DREAD)
categories: [Project, Game]
---

About a month ago, I made a game for one of the [Odin Project](https://www.theodinproject.com/) assignments that I thought was a bit unique compared to other submissions for the same project. In the mean time, I made some improvements, so I think that it is about ready to to show. If you want to just go see it, you can go to [the game page](https://www.zachstrout.com/memory-game) to play it or [the github page](https://github.com/rtnhn/memory-game/) to see the source code. 

For the original assignment, the goal was to create a simple picture memory game where you had to select all the unique images. I did not want to do an asset hunt to find images to select, so I started building the app with just letters. The main problem with using letters was that it was really easy to follow the sequence if all the letters were on the board at the same time. If you have played the first round of DREAD, it is really easy since there are 9 unique letters and 9 buttons to press. You can basically hit "A" then "B" then "C" without losing track of the letters that you have already hit. Because of the ease of using a defined sequence, I thought it would be interesting if the game got progressively harder as it went along by adding letters to the sequence. Since only 9 of the letters would be available to be selected, this would force the players to "skip ahead" in the sequence and remember what they had to skip since the skipped letter was not available when it was needed. As a little hint, you can work both ends of the sequence. By working both forwards and backwards, you can insure that you don't forget any letters.  

For the game, I used javascript with React which made the development really fast. I started the project on June 1st, and the basic functionality of the game was complete the next day. Most of the other time was devoted to other things like styling it and making it a Progressive Web App. A [Progressive Web App](https://web.dev/what-are-pwas/) is like a normal website, but has a couple of benefits. First, it is typically installable. This means that it feels more like an application than a website. When you install it (for mobile devices, you can "add to home screen" to install it), it uses the web browser to run, but it is isolated to its own window so that it feels more native to the device. Another factor is that it is a lot more reliable than a normal web app since it has special code called service workers that give special instructions whenever the Progressive Web App does things that a normal web app does. For example, one of the things that these service workers do is that when the Progressive Web App tries to "fetch" (get data from some source on the internet), the service worker can check to see if that data has already been saved (cached) by the app. When the Progressive Web App is "installed", the service worker caches all the required files to run the app. With these two functions (checking the cache for data before looking on the web, and caching all the required data), the app is actually able to work offline once installed. This means that once installed, you can play the game wherever without internet access which is super neat! There are currently bugs with the app that don't allow it to fetch the most recent updates, but that probably only involves adding a menu and a button that checks for updates which is planned for the future. 

Beyond fixing that bug, there are some other things that I would like to do. First, I would like to try to add other sequences to the game. I think it would be interesting to have different alphabets like Greek or Cyrillic. I also need to add a good ending to the game. Currently, the game just continuously plays the last round of the game over and over which is not too bad. There should be some sort of good surprize though since it is really hard to go past 10 or so. I might want to add save points to the game too. For example, if the player gets beyond any multiple of 5, maybe the game should remember and let them start there. That might be more fair. Lastly, I am a bit worried that it could be easy for some people. To make it more challenging, I would make a diabolical mode. For diabolical mode, I would create a matrix where one axis would be a letter of the alphabet and the other axis would be the nth guess where n is the progress though the stage. For each stage, I would record what letters in what order the player would use. This would generally create a probability matrix. Next, I would invert this probability matrix so that I would get the least likely letters for each of the guesses in the stage. I would then serve these unlikely guesses to the player while also including the remaining letters. Below is a sample probability matrix on the left that gets more interesting further into the game when the player needs to select letters out of order and the inverted matrix on the right where $p_{x,y}' = (1- p_{x,y}) / \sum_{y}(1-p_{x,y}) $, where $x$ is the row index and $y$ is the column index. That math is probably (see what I did there) too much detail for most people, so in short, it would just make the game a lot harder by actively fighting against the player. 


<div style="display:flex; flex-direction:row; justify-content:center; flex-wrap: wrap; gap:1rem; font-size:.75rem;" align="center" markdown="1"> 

| prob matrix | A   | B   | C   | D   | ... | N |
|-----------|-----|-----|-----|-----|-----|---|
| 1st Guess | 1   | 0   | 0   | 0   | ... | 0 |
| 2nd Guess | 0   | 1   | 0   | 0   | ... | 0 |
| 3rd Guess | 0   | 0   | 1   | 0   | ... | 0 |
| 4th Guess | 0   | 0   | 0   | 1   | ... | 0 |
| ...       | ... | ... | ... | ... | ... | 0 |
| Nth Guess | 0   | 0   | 0   | 0   | 0   | 1 | 


|inv. matrix| A   | B   | C   | D   | ... | N |
|-----------|-----|-----|-----|-----|-----|-----|
| 1st Guess | 0   | $p'$|$p'$ | $p'$| ... | $p'$|
| 2nd Guess |$p'$ | 0   | $p'$| $p'$| ... |$p'$|
| 3rd Guess |$p'$ | $p'$| 0   | $p'$| ... |$p'$|
| 4th Guess |$p'$ | $p'$| $p'$| 0   | ... |$p'$|
| ...       | ... | ... | ... | ... | ... |$p'$|
| Nth Guess |$p'$ |$p'$ | $p'$|$p'$ |$p'$ | 0 | 

</div>

By the way, when I played the game the first time and forgot which letters I hit on one of the later stages, the word that best described the feeling I had was dread, so I named the game after that feeling. 
