(function () {
  var PAGE_SIZE = 20;

  // "3h ago" for recent notes; leave the absolute date for anything older than a week.
  function relativeTimes() {
    var now = Date.now();
    document.querySelectorAll('.note time[datetime]').forEach(function (el) {
      var t = Date.parse(el.getAttribute('datetime'));
      if (isNaN(t)) return;
      var s = Math.max(0, Math.round((now - t) / 1000));
      var label;
      if (s < 60) label = 'just now';
      else if (s < 3600) label = Math.floor(s / 60) + 'm ago';
      else if (s < 86400) label = Math.floor(s / 3600) + 'h ago';
      else if (s < 7 * 86400) label = Math.floor(s / 86400) + 'd ago';
      if (label) el.textContent = label;
    });
  }

  // Turn #hashtags in note text into links that search the feed for that tag.
  function linkifyHashtags() {
    var base = '/notes/?q=';
    document.querySelectorAll('.note-body').forEach(function (body) {
      var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          return n.parentNode.closest('a, code, pre') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        var re = /(^|[^\w&\/#])#([A-Za-z][\w-]*)/g;
        var text = node.nodeValue, last = 0, m, frag = null;
        while ((m = re.exec(text))) {
          frag = frag || document.createDocumentFragment();
          var start = m.index + m[1].length;
          frag.appendChild(document.createTextNode(text.slice(last, start)));
          var a = document.createElement('a');
          a.className = 'note-tag';
          a.href = base + encodeURIComponent('#' + m[2].toLowerCase());
          a.textContent = '#' + m[2];
          frag.appendChild(a);
          last = start + 1 + m[2].length;
        }
        if (frag) {
          frag.appendChild(document.createTextNode(text.slice(last)));
          node.parentNode.replaceChild(frag, node);
        }
      });
    });
  }

  function feed() {
    var list = document.getElementById('notes-list');
    if (!list) return;
    var search = document.getElementById('notes-search');
    var sort = document.getElementById('notes-sort');
    var more = document.getElementById('notes-more');
    var empty = document.getElementById('notes-empty');
    var cards = Array.prototype.slice.call(list.querySelectorAll('.note'));
    var shown = PAGE_SIZE;

    // Pre-fill the search from ?q= (used by hashtag links).
    var q0 = new URLSearchParams(location.search).get('q');
    if (q0) search.value = q0;

    cards.forEach(function (c) {
      c._text = c.textContent.toLowerCase();
      c._date = Number(c.getAttribute('data-date')) || 0;
    });

    function render() {
      var q = search.value.trim().toLowerCase();
      var terms = q ? q.split(/\s+/) : [];
      var dir = sort.value === 'oldest' ? 1 : -1;
      var matches = cards.filter(function (c) {
        return terms.every(function (t) { return c._text.indexOf(t) !== -1; });
      });
      matches.sort(function (a, b) { return dir * (a._date - b._date); });

      cards.forEach(function (c) { c.hidden = true; });
      matches.forEach(function (c, i) {
        list.appendChild(c); // reorder in place
        c.hidden = i >= shown;
      });
      more.hidden = matches.length <= shown;
      empty.hidden = matches.length > 0 || cards.length === 0;
    }

    search.addEventListener('input', function () { shown = PAGE_SIZE; render(); });
    sort.addEventListener('change', function () { shown = PAGE_SIZE; render(); });
    more.addEventListener('click', function () { shown += PAGE_SIZE; render(); });
    render();
  }

  function init() { relativeTimes(); linkifyHashtags(); feed(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
