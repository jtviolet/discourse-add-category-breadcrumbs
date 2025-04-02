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
    try {
      // Get the current route to check if we're on the homepage or a category page
      const controller = api.container.lookup("controller:application");
      if (!controller || !controller.currentRouteName) {
        return defaultCategoryLinkRenderer(category, opts);
      }
      
      const currentRouteName = controller.currentRouteName;
      
      // Exclude specific routes where we don't want to modify category display
      const excludedRoutes = [
        "discovery.categories", // Homepage with categories
        "discovery.latest",     // Latest topics page
        "discovery.top",        // Top topics page
        "discovery.new",        // New topics page
        "discovery.unread"      // Unread topics page
      ];
      
      // If we're on an excluded route, use default renderer
      if (excludedRoutes.includes(currentRouteName)) {
        return defaultCategoryLinkRenderer(category, opts);
      }
      
      // Check if we're on a parent category page
      if (currentRouteName.startsWith("discovery.category")) {
        const topicsController = api.container.lookup("controller:discovery/topics");
        if (topicsController && topicsController.category) {
          // Get the category chain to determine if we're on a parent page
          let parentId = get(category, "parent_category_id");
          while (parentId) {
            if (topicsController.category.id === parentId) {
              // We're on a parent category page, use default renderer
              return defaultCategoryLinkRenderer(category, opts);
            }
            
            // Move up the chain
            const parent = Category.findById(parentId);
            parentId = parent ? parent.parent_category_id : null;
          }
        }
      }
      
      // Check for special cases where we'd use the default
      if (opts.hideParent || !category || !category.parent_category_id) {
        return defaultCategoryLinkRenderer(category, opts);
      }

      // Build full category breadcrumb chain
      let categoryChain = [];
      let currentCat = category;
      
      // Collect all categories in the chain
      while (currentCat) {
        categoryChain.unshift(currentCat);
        
        if (!currentCat.parent_category_id) break;
        
        currentCat = Category.findById(currentCat.parent_category_id);
        if (!currentCat) break;
      }
      
      // If only one category in chain, use default renderer
      if (categoryChain.length <= 1) {
        return defaultCategoryLinkRenderer(category, opts);
      }
      
      // Start building the HTML for the breadcrumb
      let html = "";
      const separator = " › ";
      
      // Build breadcrumb for all categories except the last one
      for (let i = 0; i < categoryChain.length - 1; i++) {
        const cat = categoryChain[i];
        
        // Get information about this category
        const descriptionText = escapeExpression(get(cat, "description_text"));
        const restricted = get(cat, "read_restricted");
        const url = getURL(`/c/${Category.slugFor(cat)}/${get(cat, "id")}`);
        const color = cat.color;
        
        // Create the category badge
        let catHtml = `<a href="${url}" class="badge-category__wrapper" style="${categoryVariables(cat)}">`;
        catHtml += `<span 
          data-category-id="${cat.id}" 
          data-drop-close="true"
          class="badge-category ${restricted ? 'restricted' : ''}"
          ${color ? `style="--category-badge-color: #${color}"` : ""}
          ${descriptionText ? `title="${descriptionText}"` : ""}
        >`;
        
        // Add lock icon if restricted
        if (restricted) {
          catHtml += iconHTML("lock");
        }
        
        // Add the category name
        const categoryName = escapeExpression(get(cat, "name"));
        const categoryDir = helperContext().siteSettings.support_mixed_text_direction ? 'dir="auto"' : '';
        catHtml += `<span class="badge-category__name" ${categoryDir}>${categoryName}</span>`;
        
        catHtml += "</span></a>";
        
        // Add to main HTML
        html += catHtml;
        
        // Add separator after each category except the last
        if (i < categoryChain.length - 1) {
          html += `<span class="breadcrumb-separator">${separator}</span>`;
        }
      }
      
      // Add the final category (using default renderer)
      html += defaultCategoryLinkRenderer(category, opts).replace("--has-parent", "");
      
      return html;
      
    } catch (error) {
      console.warn("Error in category breadcrumb component:", error);
      return defaultCategoryLinkRenderer(category, opts);
    }
  });
  
  // Add styles for the breadcrumb
  api.onPageChange(() => {
    if (!document.getElementById('category-breadcrumb-styles')) {
      const style = document.createElement('style');
      style.id = 'category-breadcrumb-styles';
      style.textContent = `
        .breadcrumb-separator {
          margin: 0 2px;
          color: var(--primary-medium);
        }
        
        .topic-list .category {
          min-width: 150px;
          width: auto;
        }
        
        /* Remove default parent indicator */
        .badge-category.--has-parent::before {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  });
});