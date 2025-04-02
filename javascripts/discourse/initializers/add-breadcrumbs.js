import { get } from "@ember/object";
import { defaultCategoryLinkRenderer } from "discourse/helpers/category-link";
import categoryVariables from "discourse/helpers/category-variables";
import { apiInitializer } from "discourse/lib/api";
import { escapeExpression } from "discourse/lib/utilities";
import Category from "discourse/models/category";
import getURL from "discourse-common/lib/get-url";
import { helperContext } from "discourse-common/lib/helpers";
import { iconHTML } from "discourse-common/lib/icon-library";

export default apiInitializer("1.8.0", (api) => {
  api.replaceCategoryLinkRenderer((category, opts) => {
    // Get the default HTML first
    const defaultHtml = defaultCategoryLinkRenderer(category, opts);

    // If we should hide parent, return default HTML
    if (opts.hideParent) {
      return defaultHtml;
    }

    // Get parent category
    const parentCat = Category.findById(get(category, "parent_category_id"));

    // If no parent, return default HTML
    if (!parentCat) {
      return defaultHtml;
    }

    // Check if we're on a direct parent category view
    // We only want to disable our customization when viewing the parent category itself
    const controller = api.container.lookup("controller:application");
    const discoveryController = api.container.lookup("controller:discovery/categories");
    
    // Only check for parent category view if we're on a discovery categories route
    if (controller.currentRouteName === "discovery.categories") {
      // We're on the categories listing page
      // This is fine, we can apply our customization here
    } else if (controller.currentRouteName.startsWith("discovery.category")) {
      // We're on some kind of category page
      // Get the current category being viewed
      const currentCategory = api.container.lookup("controller:discovery/topics").category;
      
      // If the current category matches our parent category, return default HTML
      if (currentCategory && currentCategory.id === parentCat.id) {
        return defaultHtml;
      }
    }
    
    // Proceed with customization for all other pages (tag pages, search results, etc.)
    let descriptionText = escapeExpression(get(parentCat, "description_text"));
    let restricted = get(parentCat, "read_restricted");
    let url = opts.url
      ? opts.url
      : getURL(`/c/${Category.slugFor(parentCat)}/${get(parentCat, "id")}`);
    let href = opts.link === false ? "" : url;
    let tagName = opts.link === false || opts.link === "false" ? "span" : "a";
    let extraClasses = opts.extraClasses ? " " + opts.extraClasses : "";
    let style = `${categoryVariables(parentCat)}`;
    let html = "";
    let categoryDir = "";
    let dataAttributes = `data-category-id="${get(parentCat, "id")}"`;

    let siteSettings = helperContext().siteSettings;

    let classNames = `badge-category`;
    if (restricted) {
      classNames += " restricted";
    }

    html += `<span
    ${dataAttributes}      
    data-drop-close="true"
    class="${classNames}"
    ${
      opts.previewColor
        ? `style="--category-badge-color: #${parentCat.color}"`
        : ""
    }
    ${descriptionText ? 'title="' + descriptionText + '" ' : ""}
  >`;

    let categoryName = escapeExpression(get(parentCat, "name"));

    if (siteSettings.support_mixed_text_direction) {
      categoryDir = 'dir="auto"';
    }

    if (restricted) {
      html += iconHTML("lock");
    }

    html += `<span class="badge-category__name" ${categoryDir}>${categoryName}</span>`;
    html += "</span>";

    if (href) {
      href = ` href="${href}" `;
    }

    return (
      `<${tagName} class="badge-category__wrapper ${extraClasses}" ${
        style.length > 0 ? `style="${style}"` : ""
      } ${href}>${html}</${tagName}>` + defaultHtml.replace("--has-parent", "")
    );
  });
});