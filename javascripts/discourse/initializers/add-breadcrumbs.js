import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "append-category-rename",

  initialize() {
    withPluginApi("0.8", (api) => {
      const rawSettings = Array.isArray(category_renames)
        ? category_renames
        : (category_renames || "").split("\n");

      const parsedPairs = rawSettings
        .map((item) => {
          const [id, ...rest] = item.split(",");
          const appendText = rest.join(",").trim();
          const categoryId = parseInt(id, 10);
          if (!categoryId || !appendText) return null;
          return { id: categoryId, appendText };
        })
        .filter(Boolean);

      api.decorateWidget("category-title:after", (dec) => {
        const category = dec.getModel();
        const match = parsedPairs.find((p) => p.id === category.id);
        if (!match) return;

        return dec.h("div.appended-category-subtitle", match.appendText);
      });
    });
  },
};
