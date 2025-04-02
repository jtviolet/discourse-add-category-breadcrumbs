import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "append-category-rename",

  initialize() {
    withPluginApi("0.8", (api) => {
      const settingPairs = settings.category_renames
        .filter(Boolean)
        .map((item) => {
          const [id, ...rest] = item.split(",");
          return { id: parseInt(id, 10), appendText: rest.join(",").trim() };
        });

      api.decorateWidget("category-title:after", (dec) => {
        const category = dec.getModel();
        const match = settingPairs.find((p) => p.id === category.id);
        if (!match) return;

        return dec.h("div.appended-category-subtitle", match.appendText);
      });
    });
  },
};
