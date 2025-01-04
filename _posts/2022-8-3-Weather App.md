---
layout: post
title:  Weather App Project
categories: [Project, App]
---

I finally got most of the features that I wanted with my weather app, so I think it is ready to be talked about here. You can go to [the app page](https://www.zachstrout.com/weather-app) or you can see [the source code](https://github.com/RTnhN/weather-app).

<!--more-->

For this project, I use vanilla JS (this project was started before the DREAD game project) which makes the DOM module really long. The APIs that I use are from a website called [open-meteo.com](https://www.open-meteo.com) which has a password free API for both weather and geocoding. The reason that having a password free API is useful since [there is no safe way to save passwords or keys to be used by the client on the client side](https://stackoverflow.com/a/47198936/11351671), and this is a client only app. The reason why both weather and geocoding is important is that the weather API requires latitude and longitude which need to be derived from a city name that the user enters. This also allows the time zone and other location based information to be collected. For the plots, I used [Observable's plot library](https://observablehq.com/plot) which is based off of [D3](https://d3js.org/) which is a neat library for modifying the DOM with data (D3 stands for Data-Driven Documents). The API was pretty easy to use instead of trying to work directly with D3.

One of the things that took me the longest time to get to work was all the date and time related things. JS is pretty bad at dates. Hopefully the [Temporal API](https://tc39.es/proposal-temporal/docs/) comes out soon so that we don't need to deal with Date anymore.

All of the really neat weather icons come from [Eric Flower's weather icon css and font library](https://erikflowers.github.io/weather-icons/). 

