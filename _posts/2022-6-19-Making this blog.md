---
layout: post
title:  The making of this blog
categories: [HTML, Meta]
---

I wanted some place to talk about what I have been working on and to keep some hints or tricks that I have learned in the process, so I made this website. Feel free to just skim over anything and everything. There will be things that are more written for me to help me remember than for anyone else. 

It is made with [Jekyll](https://jekyllrb.com/) which is a static website generator that creates fast, clean websites that work great with Github pages where this is hosted. In fact, I can upload just the raw project folder to Github, and a Github Action will compile the website and deploy it. I also Jekyll installed locally (note to self: run locally with `jekyll serve` in the project folder), I can see how the page looks without needing to commit to git and push to Github. The posts themselves use [Markdown](https://www.markdownguide.org/), so I don't need to deal directly with putting content in HTML tags directly.

The template that I am using is called [Reverie](https://github.com/amitmerchant1990/reverie) which is a simple, beautiful theme that has lots of goodies added in such as comments with Disqus and built in search.  

I will try to include really interesting things on the index page. Jekyll is pretty neat that it can do this by letting me add `hidden: true` onto the pages that I don't want to feature quite yet. That being the case, if you care to see all posts, you can check the archive since that uses all posts rather than the ones that aren't hidden.   

