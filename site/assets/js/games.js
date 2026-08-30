document.addEventListener("alpine:init", () => {
  Alpine.data("gamesPage", () => ({
    platform: "all",
    page: 1,
    perPage: 10,
    feed: [],
    init() {
      const param = new URLSearchParams(window.location.search).get("platform");
      if (["psn", "steam", "xbox"].includes(param)) this.platform = param;
      const el = document.getElementById("feed-data");
      if (el) {
        try {
          this.feed = JSON.parse(el.textContent);
        } catch {
          this.feed = [];
        }
      }
    },
    setPlatform(value) {
      this.page = 1;
      const url = new URL(window.location);
      if (value === "all") url.searchParams.delete("platform");
      else url.searchParams.set("platform", value);
      history.replaceState(null, "", url);
    },
    matches(p) {
      return this.platform === "all" || this.platform === p;
    },
    get filteredFeed() {
      return this.feed.filter((t) => this.matches(t.platform));
    },
    get pageCount() {
      return Math.max(1, Math.ceil(this.filteredFeed.length / this.perPage));
    },
    get pagedFeed() {
      const start = (this.page - 1) * this.perPage;
      return this.filteredFeed.slice(start, start + this.perPage);
    },
    prev() {
      if (this.page > 1) this.page -= 1;
    },
    next() {
      if (this.page < this.pageCount) this.page += 1;
    },
    formatDate(iso) {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },
  }));
});
