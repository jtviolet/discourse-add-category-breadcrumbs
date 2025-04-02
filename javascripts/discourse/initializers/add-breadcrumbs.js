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
    // We need to be careful about accessing controllers that might not exist
    try {
      const controller = api.container.lookup("controller:application");
      if (!controller || !controller.currentRouteName) {
        return defaultHtml;
      }
      
      const currentRouteName = controller.currentRouteName;
      
      // Check if we're on a category page
      if (currentRouteName.startsWith("discovery.category")) {
        // Safely get the discovery topics controller
        const topicsController = api.container.lookup("controller:discovery/topics");
        
        // Only proceed if we can safely get the category
        if (topicsController && topicsController.category) {
          const currentCategory = topicsController.category;
          
          // If we're viewing the parent category directly, use default HTML
          if (currentCategory.id === parentCat.id) {
            return defaultHtml;
          }
        }
      }
    } catch (e) {
      // If any errors occur during route checking, fall back to default HTML
      console.warn("Error in category breadcrumb component:", e);
      return defaultHtml;
    }
    
    // Proceed with customization for all other pages
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