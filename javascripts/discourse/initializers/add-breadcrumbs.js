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
    // Return default HTML for these cases:
    // 1. When explicitly told to hide parent
    // 2. When we're on a category route (to avoid breaking category pages)
    // 3. When there is no parent category
    const controller = api.container.lookup("controller:application");
    const currentRoute = controller.currentRouteName;
    
    const isCategoryPage = currentRoute === "discovery.category" || 
                          currentRoute === "discovery.categoryNone" ||
                          currentRoute === "discovery.categoryAll";
    
    // Use default renderer in these cases
    if (opts.hideParent || 
        isCategoryPage || 
        !get(category, "parent_category_id")) {
      return defaultCategoryLinkRenderer(category, opts);
    }

    // If we get here, we're in a topic list and should show the full breadcrumb
    
    // Get all category information
    const categoryChain = [];
    let currentCategory = category;
    const allCategories = Category.list();
    
    // Build the category chain
    while (currentCategory) {
      categoryChain.unshift(currentCategory);
      const parentId = get(currentCategory, "parent_category_id");
      if (!parentId) break;
      currentCategory = allCategories.find(c => c.id === parentId);
    }
    
    // Start with an empty HTML string
    let html = "";
    const separator = settings.breadcrumb_separator || " › ";
    
    // Apply max depth setting if configured
    const maxDepth = settings.max_breadcrumb_depth || 0;
    const startIndex = maxDepth > 0 && categoryChain.length > maxDepth 
                      ? categoryChain.length - maxDepth 
                      : 0;
                      
    // For each category in the chain (except the last one), render a badge
    for (let i = startIndex; i < categoryChain.length - 1; i++) {
      const cat = categoryChain[i];
      
      // Skip rendering if this is somehow the same as the final category
      if (cat.id === category.id) continue;
      
      const descriptionText = escapeExpression(get(cat, "description_text"));
      const restricted = get(cat, "read_restricted");
      const url = getURL(`/c/${Category.slugFor(cat)}/${get(cat, "id")}`);
      const tagName = "a";
      const style = `${categoryVariables(cat)}`;
      const dataAttributes = `data-category-id="${get(cat, "id")}"`;
      
      let siteSettings = helperContext().siteSettings;
      
      let classNames = `badge-category breadcrumb-category`;
      if (restricted) {
        classNames += " restricted";
      }
      
      html += `<a href="${url}" class="badge-category__wrapper" ${
        style.length > 0 ? `style="${style}"` : ""
      }>`;
      
      html += `<span
        ${dataAttributes}      
        data-drop-close="true"
        class="${classNames}"
        ${
          opts.previewColor
            ? `style="--category-badge-color: #${cat.color}"`
            : ""
        }
        ${descriptionText ? 'title="' + descriptionText + '" ' : ""}
      >`;
      
      let categoryName = escapeExpression(get(cat, "name"));
      let categoryDir = siteSettings.support_mixed_text_direction ? 'dir="auto"' : '';
      
      if (restricted) {
        html += iconHTML("lock");
      }
      
      html += `<span class="badge-category__name" ${categoryDir}>${categoryName}</span>`;
      html += "</span>";
      html += "</a>";
      
      // Add separator if this isn't the last item
      if (i < categoryChain.length - 1) {
        html += `<span class="breadcrumb-separator">${separator}</span>`;
      }
    }
    
    // Append the default HTML for the final category
    const defaultHtml = defaultCategoryLinkRenderer(category, opts);
    html += defaultHtml;
    
    return html;
  });
  
  // Add custom CSS for breadcrumb spacing
  api.onPageChange(() => {
    const style = document.getElementById("category-breadcrumb-styles");
    if (!style) {
      const styleTag = document.createElement("style");
      styleTag.id = "category-breadcrumb-styles";
      styleTag.innerHTML = `
        .badge-category__wrapper {
          margin-right: 3px;
        }
        .breadcrumb-separator {
          margin: 0 2px;
          color: var(--primary-medium);
          font-size: 0.9em;
        }
        .breadcrumb-category {
          font-size: 0.9em;
          opacity: 0.9;
          ${settings.breadcrumb_styles || ""}
        }
        ${settings.hide_on_mobile ? `
        @media screen and (max-width: 767px) {
          .breadcrumb-category, .breadcrumb-separator {
            display: none;
          }
        }
        ` : ''}
      `;
      document.head.appendChild(styleTag);
    }
  });
});