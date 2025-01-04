---
layout: post
title:  Some of my mechanical designs
categories: [Blog]
---

I realized that with [onshape](https://www.onshape.com) I could share direct links to some of my designs. Below are a few special ones:

<!--more-->

Spin bikes adjust the resistance by typically by moving some sort of brake into the spinning wheel. This could be a friction break or it could use [Lenz law](https://en.wikipedia.org/wiki/Lenz%27s_law) like the one at my gym. The bikes at my gym don't have any way to determine how much resistance there is. A simple solution to this is to have some sort of device that can measure how far up the brake is and read off how much resistance. That is exactly what this does. You can see the [spin bike resistance meter here](https://cad.onshape.com/documents/5d16c57c6138c0a3fbce8c90/w/1669e9df286c5e4f095f9a8c/e/4e7079050bc23f54e5552a50).

My dad plays disc golf, and for the course that he made and maintains, he was looking for tools that could be used to retrieve the discs if they fell in the water. There are two different types of designs that we looked at. There were first [3d printed ones that have built in springs](https://cad.onshape.com/documents/2f9751fae3ac2d1b5826f4a4/w/87534e3cfc5dd81f523cda01/e/003d765eb94ebb749e7e09e2). There were also [metal ones made out of extruded materials or sheet metal](https://cad.onshape.com/documents/af398764111f7ea83e2afedc/w/9c21e7a432d5daf8372aee4c/e/08e70fe4657d1c0ca204fac1). In the end, he decided to just use a more simple design that did not really grab the discs.   

I needed to interface with some other hardware for a project. The method of interfacing was to short a connector on the hardware. The easiest way to do this was to simply close it with a relay. This has the benefit of safety for both my system and the other system since I can't send bad currents to the other system and I can't receive bad currents from the other system. There are decent usb relays on amazon that can receive a serial hex string and either open or close the relay. While this solution was fairly elegant and easy to work with, I needed some sort of case for the relay and an easy way to connect the relay that the other system with RCA connectors. For this project, I just designed a case around a project box that I got off of amazon and some miscellaneous hardware like rca jacks and acrylic rods to act as light guides since I would like to still see the status lights on the relay module. Overall, the system worked out pretty well. You can see the [relay case here](https://cad.onshape.com/documents/dab57cb65e135d57571f717c/w/b66e6ad87daafa5a0a820c3b/e/aa3f8aa17aa3b3217e77bb4f).  

Lastly, I wanted to hang some of my bags from gaps in the table that I use for my desk. These [little hangers](https://cad.onshape.com/documents/93e0420b7315130ea5278310/w/f1cacddeae36117ab9a1a7f6/e/49320adc9ad9702ac402c989) do the trick. I did over engineer them by using some CAE tools made by Simscale that interact directly with Onshape. Simscale is great except for the fact that it does not have a safety factor mode for the results that scales the results to the yield strength of the material. You have to manually compare the yield strength to the regions on the model like on the lovely image below.    
![Alt text](/images/simscale.png)
