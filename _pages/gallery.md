---
layout: page
permalink: /gallery/
title: Photo Gallery
---

<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
<script src= "https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.js"></script>
<script src="https://unpkg.com/imagesloaded@4/imagesloaded.pkgd.js"></script>


<div class="gallery-header">
Here are some of my favorite photos I have taken over the years.
</div>
<div id="gallery" class="grid">
  <div class="grid-sizer"></div>
  {% assign photos = site.static_files | where_exp: "file", "file.path contains 'images/gallery'" %}
  {% for photo in photos %}
  <div class="grid-item">
      <a href="{{ photo.path | prepend: site.baseurl }}">
      <img src="{{ photo.path }}" alt="Gallery Image">
      </a>
    </div>
  {% endfor %}
</div>
<div id="image-modal" class="modal">
  <span class="close">&times;</span>
  <img class="modal-content" id="modal-img">
</div>

<style>
  .gallery-header {
    text-align: center;
    font-size: 1em;
    margin-bottom: 1em;
    margin-top: 1em;
    }
.grid-sizer,
.grid-item {
  width: 33.333%; /* Adjust width to account for margins */
}

.grid-item {
  float: left;
  width: calc(33.333% - 5px);
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

<script>
  var grid = document.querySelector('.grid');
var msnry;
imagesLoaded( grid, function() {
  msnry = new Masonry( grid, {
    itemSelector: '.grid-item',
    columnWidth: '.grid-sizer',
    percentPosition: true
  });
});
document.addEventListener("DOMContentLoaded", function () {
  var modal = document.getElementById("image-modal");
  var modalImg = document.getElementById("modal-img");
  var closeBtn = document.querySelector(".close");

  // Attach event listeners to each image
  document.querySelectorAll(".grid-item img").forEach(function (img) {
    img.addEventListener("click", function (event) {
      event.preventDefault(); 
      modal.style.display = "block";
      modalImg.src = this.src;
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