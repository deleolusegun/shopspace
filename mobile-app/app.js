(function () {
  "use strict";

  var API = "https://my-storefront-cyan.vercel.app/api/ads";
  var photo = function (id) {
    return "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=1200&q=80";
  };
  var imageOptions = [
    { label: "Retail store", value: photo("photo-1604719312566-8912e9227c6a") },
    { label: "Café", value: photo("photo-1554118811-1e0d58224f24") },
    { label: "Boutique", value: photo("photo-1441986300917-64674bd600d8") },
    { label: "Studio", value: photo("photo-1524758631624-e2822e304c36") },
    { label: "Bakery", value: photo("photo-1509440159596-0249088772ff") },
    { label: "Books", value: photo("photo-1507842217343-583bb7270b66") },
    { label: "Restaurant", value: photo("photo-1517248135467-4c7edcad34c4") },
    { label: "Office", value: photo("photo-1497366754035-f200968a6e72") },
  ];

  var state = {
    ads: [],
    filter: "All",
    search: "",
    image: imageOptions[0].value,
  };

  var $ = function (id) { return document.getElementById(id); };
  var list = $("list");
  var searchInput = $("search");
  var form = $("postForm");
  var formError = $("formError");
  var submitButton = $("submit");
  var toast = $("toast");
  var toastTimer;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  function formatDate(value) {
    try {
      return new Date(value + "T12:00:00").toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
      });
    } catch {
      return value;
    }
  }

  function renderImageOptions() {
    var holder = $("imageOptions");
    holder.innerHTML = imageOptions.map(function (option, index) {
      return '<button type="button" class="image-option' +
        (option.value === state.image ? " selected" : "") +
        '" data-index="' + index + '" title="' + escapeHtml(option.label) +
        '" aria-label="' + escapeHtml(option.label) +
        '" style="background-image:url(\'' + option.value + '\')"></button>';
    }).join("");

    holder.querySelectorAll(".image-option").forEach(function (button) {
      button.addEventListener("click", function () {
        state.image = imageOptions[Number(button.dataset.index)].value;
        renderImageOptions();
      });
    });
  }

  function render() {
    var query = state.search.trim().toLowerCase();
    var ads = state.ads.filter(function (ad) {
      var matchesCategory = state.filter === "All" || ad.category === state.filter;
      var haystack = [ad.title, ad.description, ad.location, ad.price || ""].join(" ").toLowerCase();
      return matchesCategory && (!query || haystack.indexOf(query) !== -1);
    });

    if (!ads.length) {
      list.innerHTML = '<div class="empty"><strong>No listings found</strong><br />Try another search or post the first one.</div>';
      return;
    }

    list.innerHTML = ads.map(function (ad) {
      return '<article class="listing card">' +
        '<img src="' + escapeHtml(ad.image) + '" alt="' + escapeHtml(ad.title) + '" loading="lazy" />' +
        '<div class="listing-body">' +
          '<div class="badges">' +
            '<span class="badge">' + escapeHtml(ad.category) + "</span>" +
            (ad.featured ? '<span class="badge featured">Featured</span>' : "") +
          "</div>" +
          "<h2>" + escapeHtml(ad.title) + "</h2>" +
          '<p class="meta">' + escapeHtml(ad.location) + " · " + formatDate(ad.createdAt) + "</p>" +
          '<p class="desc">' + escapeHtml(ad.description) + "</p>" +
          "<footer>" +
            '<span class="price">' + escapeHtml(ad.price || "Contact for price") + "</span>" +
            '<a class="contact" href="mailto:' + encodeURIComponent(ad.contact) +
              '?subject=' + encodeURIComponent("About: " + ad.title) + '">Contact</a>' +
          "</footer>" +
        "</div>" +
      "</article>";
    }).join("");
  }

  async function loadAds() {
    try {
      var response = await fetch(API, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load listings.");
      var data = await response.json();
      state.ads = Array.isArray(data.ads) ? data.ads : [];
      render();
    } catch {
      list.innerHTML = '<div class="empty"><strong>Could not load listings</strong><br />Check your connection and try again.</div>';
    }
  }

  function switchView(view) {
    var browsing = view === "browse";
    $("browseView").hidden = !browsing;
    $("postView").hidden = browsing;
    document.querySelectorAll(".nav").forEach(function (button) {
      button.classList.toggle("active", button.dataset.view === view);
    });
    if (browsing) loadAds();
    window.scrollTo(0, 0);
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Choose an image file."));
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        reject(new Error("Choose an image smaller than 8 MB."));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error("Could not read that image.")); };
      reader.readAsDataURL(file);
    });
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? "Publishing…" : "Publish listing";
  }

  searchInput.addEventListener("input", function () {
    state.search = searchInput.value;
    render();
  });

  document.querySelectorAll(".chip").forEach(function (button) {
    button.addEventListener("click", function () {
      state.filter = button.dataset.filter;
      document.querySelectorAll(".chip").forEach(function (chip) {
        chip.classList.toggle("active", chip === button);
      });
      render();
    });
  });

  $("topPost").addEventListener("click", function () { switchView("post"); });
  document.querySelectorAll(".nav").forEach(function (button) {
    button.addEventListener("click", function () { switchView(button.dataset.view); });
  });

  $("upload").addEventListener("change", async function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      state.image = await fileToDataUrl(file);
      renderImageOptions();
      showToast("Photo added");
    } catch (error) {
      showToast(error.message);
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    formError.hidden = true;
    setBusy(true);

    var payload = {
      category: $("category").value,
      title: $("title").value.trim(),
      description: $("description").value.trim(),
      image: state.image,
      price: $("price").value.trim(),
      location: $("location").value.trim(),
      contact: $("contact").value.trim(),
      promote: $("promote").checked,
    };

    try {
      var response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish your listing.");

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      form.reset();
      state.image = imageOptions[0].value;
      renderImageOptions();
      switchView("browse");
      showToast("Your listing is live!");
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
    } finally {
      setBusy(false);
    }
  });

  renderImageOptions();
  loadAds();
})();
