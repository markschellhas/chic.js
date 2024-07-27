import {
  linksOnIndexPageTemplate,
  mainContentOnShowPage,
  linksOnShowPageTemplate,
  mainContentOnIndexPage,
} from "../lib/templates/page_templates.js";

describe("page_templates", () => {
  describe("linksOnIndexPageTemplate", () => {
    it("returns the expected HTML", () => {
      const resourceName = "posts";
      const expected = `
  <div class="links">
    <a href="/${resourceName}/new">Create a new post</a>
  </div>
`;
      expect(linksOnIndexPageTemplate(resourceName)).toEqual(expected);
    });
  });

  describe("mainContentOnShowPage", () => {
    it("returns the expected HTML", () => {
      const resourceName = "posts";
      const expected = `
    {#each Object.entries(data.post) as [key, val]}
      <p><b>{key}:</b> {val}</p>
    {/each}
`;
      expect(mainContentOnShowPage(resourceName)).toEqual(expected);
    });
  });

  describe("linksOnShowPageTemplate", () => {
    it("returns the expected HTML", () => {
      const resourceName = "posts";
      const expected = `
  <div class="links">
    <a href="/${resourceName}">Back to posts</a> <a href="/${resourceName}/{data.item.id}/edit">Edit post</a>
</div>
`;
      expect(linksOnShowPageTemplate(resourceName)).toEqual(expected);
    });
  });

  describe("mainContentOnIndexPage", () => {
    it("returns the expected HTML", () => {
      const resourceName = "posts";
      const firstFieldName = "title";
      const expected = `
    <ul>
    {#each data.items as item}
      <li>
          <a href={"/posts/"+item.id}>{item.title}</a>
      </li>
    {/each}
    </ul>
`;
      expect(mainContentOnIndexPage(resourceName, firstFieldName)).toEqual(
        expected
      );
    });
  });
});