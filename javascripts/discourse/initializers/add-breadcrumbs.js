import { get } from "@ember/object";
import { defaultCategoryLinkRenderer } from "discourse/helpers/category-link";
import { apiInitializer } from "discourse/lib/api";
import Category from "discourse/models/category";
import getURL from "discourse-common/lib/get-url";

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
    
    // Apply max depth setting if configured
    const maxDepth = settings.max_breadcrumb_depth || 0;
    const startIndex = maxDepth > 0 && categoryChain.length > maxDepth 
                      ? categoryChain.length - maxDepth 
                      : 0;
    
    // Start with an empty HTML string
    let html = "";
    const separator = settings.breadcrumb_separator || " › ";
                      
    // For each category in the chain (except the last one), render a badge
    for (let i = startIndex; i < categoryChain.length - 1; i++) {
      const cat = categoryChain[i];
      
      // Skip rendering if this is somehow the same as the final category
      if (cat.id === category.id) continue;
      
      // Create a temporary copy of the options for this parent category
      const parentOpts = Object.assign({}, opts);
      
      // Force a URL to ensure links work correctly
      parentOpts.url = getURL(`/c/${Category.slugFor(cat)}/${get(cat, "id")}`);
      
      // Add a special class to identify breadcrumb categories
      if (!parentOpts.extraClasses) {
        parentOpts.extraClasses = "breadcrumb-category";
      } else {
        parentOpts.extraClasses += " breadcrumb-category";
      }
      
      // Honor the preserve_category_icons setting
      if (!settings.preserve_category_icons) {
        parentOpts.hideIcon = true;
      }
      
      // Get the default HTML for this parent category (preserving icons, colors, etc.)
      const catHtml = defaultCategoryLinkRenderer(cat, parentOpts);
      
      html += catHtml;
      
      // Add separator if this isn't the last item
      if (i < categoryChain.length - 1) {
        html += `<span class="breadcrumb-separator">${separator}</span>`;
      }
    }
    
    // Get the default HTML for the final category - preserving all formatting
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
        .breadcrumb-separator {
          margin: 0 2px;
          color: var(--primary-medium);
          font-size: 0.9em;
        }
        .breadcrumb-category {
          opacity: 0.85;
          ${settings.breadcrumb_styles || ""}
        }
        ${settings.hide_on_mobile ? `
        @media screen and (max-width: 767px) {
          .breadcrumb-category, .breadcrumb-separator {
            display: none;
          }
        }
        ` : ''}
        
        /* Adjust categories column width */
        .topic-list .category {
          width: auto;
          min-width: 150px;
          max-width: 280px;
        }
        
        /* Remove default parent category indicator since we're showing the full chain */
        .badge-category.--has-parent::before {
          display: none !important;
        }
      `;
      document.head.appendChild(styleTag);
    }
  });
});