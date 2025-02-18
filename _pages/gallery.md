---
layout: page
permalink: /gallery/
title: Photo Gallery
---

<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
<script src="https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.js"></script>
<script src="https://unpkg.com/imagesloaded@4/imagesloaded.pkgd.js"></script>

<style>
  .gallery-header {
    text-align: center;
    font-size: 1em;
    margin-bottom: 1em;
    margin-top: 1em;
  }
  
  .grid-sizer,
  .grid-item {
    width: 25%; /* Adjust width to account for margins */
  }

  .grid-item {
    float: left;
    width: calc(25% - 5px);
    margin-bottom: 5px;
  }

  .grid-item img {
    display: block;
    max-width: 100%;
  }

  /* Modal background */
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    padding-top: 10vh;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    text-align: center;
  }

  /* Modal close button */
  .close {
    position: absolute;
    top: 20px;
    right: 30px;
    color: white;
    font-size: 40px;
    font-weight: bold;
    cursor: pointer;
  }

  /* Fullscreen image */
  .modal-content {
    max-width: 90%;
    max-height: 80vh;
    margin: auto;
    display: block;
    border-radius: 10px;
  }

</style>

<div class="gallery-header">
  Here are some of my favorite photos I have taken over the years.
</div>

<div id="gallery" class="grid">
  <div class="grid-sizer"></div>
  {% assign photos = site.static_files | where_exp: "file", "file.path contains 'images/gallery/thumbnails'" %}
  {% for photo in photos %}
  {% assign full_image_path = photo.path | replace: 'thumbnails', 'full_res' %}
  <div class="grid-item">
    <a href="{{ full_image_path | prepend: site.baseurl }}">
      <img loading="lazy" src="{{ photo.path | prepend: site.baseurl }}" alt="{{ photo.basename }}">
    </a>
  </div>
  {% endfor %}
</div>

<div id="image-modal" class="modal">
  <span class="close">&times;</span>
  <img class="modal-content" id="modal-img">
</div>

<script>
  var grid = document.querySelector('.grid');
  var msnry;
  imagesLoaded(grid, function () {
    msnry = new Masonry(grid, {
      itemSelector: '.grid-item',
      columnWidth: '.grid-sizer',
      percentPosition: true
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    var modal = document.getElementById("image-modal");
    var modalImg = document.getElementById("modal-img");
    var closeBtn = document.querySelector(".close");

    // Attach event listeners to each thumbnail
    document.querySelectorAll(".grid-item a").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        modal.style.display = "block";
        modalImg.src = this.href;
      });
    });

    // Close modal when clicking outside image or on close button
    closeBtn.addEventListener("click", function () {
      modal.style.display = "none";
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  });
</script>
