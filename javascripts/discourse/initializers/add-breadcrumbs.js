import { apiInitializer } from "discourse/lib/api";
import Category from "discourse/models/category";

export default apiInitializer("0.11.1", (api) => {
  // Function to safely get categories
  const getCategories = () => {
    try {
      return api.container.lookup("site:main").categories || [];
    } catch (e) {
      console.warn("Error getting categories:", e);
      return [];
    }
  };

  // Function to build category breadcrumb
  const buildCategoryBreadcrumb = (categoryId) => {
    try {
      const allCategories = getCategories();
      if (!allCategories.length) return null;

      // Build category chain
      const chain = [];
      let currentId = categoryId;

      // Build the chain from leaf to root
      while (currentId) {
        const category = allCategories.find(c => c.id === parseInt(currentId, 10));
        if (!category) break;
        
        chain.unshift({
          id: category.id,
          name: category.name,
          color: category.color,
          slug: category.slug,
          parentId: category.parent_category_id
        });
        
        currentId = category.parent_category_id;
      }

      return chain;
    } catch (e) {
      console.warn("Error building category breadcrumb:", e);
      return null;
    }
  };

  // Function to update topic list items with breadcrumbs
  const updateTopicListItems = () => {
    try {
      // Get current route
      const currentRoute = api.container.lookup("controller:application")?.currentRouteName || "";
      
      // Skip on these routes
      const skipRoutes = [
        "discovery.categories",  // Homepage with categories
        "discovery.category"     // Category pages
      ];
      
      if (skipRoutes.some(route => currentRoute.includes(route))) {
        return;
      }
      
      // Find all category badges in topic lists
      const categoryLinks = document.querySelectorAll(
        ".topic-list .topic-list-item td.category .badge-wrapper.bullet span.badge-category, " +
        ".search-results .search-result-topic span.badge-category, " + 
        ".latest-topic-list-item .badge-category"
      );
      
      categoryLinks.forEach(badge => {
        // Skip if already processed
        if (badge.dataset.breadcrumbAdded === "true") return;
        
        // Get category ID
        const categoryId = badge.dataset.categoryId;
        if (!categoryId) return;
        
        // Get category chain
        const chain = buildCategoryBreadcrumb(parseInt(categoryId, 10));
        if (!chain || chain.length <= 1) return;
        
        // Build breadcrumb text (exclude the last category since it's already shown)
        const parentCategories = chain.slice(0, -1);
        if (!parentCategories.length) return;
        
        // Apply max depth if specified
        const maxDepth = settings.max_depth || 0;
        const categoriesToShow = maxDepth > 0 
          ? parentCategories.slice(-maxDepth) 
          : parentCategories;
        
        const separator = settings.breadcrumb_separator || " › ";
        const breadcrumbPrefix = categoriesToShow.map(cat => cat.name).join(separator);
        
        // Store original text
        const originalText = badge.textContent.trim();
        
        // Update with breadcrumb
        badge.textContent = `${breadcrumbPrefix} › ${originalText}`;
        badge.title = `${breadcrumbPrefix} › ${originalText}`;
        
        // Mark as processed
        badge.dataset.breadcrumbAdded = "true";
      });
    } catch (e) {
      console.warn("Error updating topic list items:", e);
    }
  };

  // Set up a mutation observer to catch dynamically loaded content
  const setupMutationObserver = () => {
    const observer = new MutationObserver(mutations => {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          shouldUpdate = true;
          break;
        }
      }
      
      if (shouldUpdate) {
        updateTopicListItems();
      }
    });
    
    // Observe the body for any changes to catch all dynamic updates
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Store observer reference
    window.breadcrumbObserver = observer;
  };

  // Initialize on page change
  api.onPageChange(() => {
    setTimeout(updateTopicListItems, 100);
  });

  // Set up observer
  api.onAppEvent("page:changed", () => {
    setupMutationObserver();
    setTimeout(updateTopicListItems, 100);
  });
  
  // Add mobile styles if needed
  if (settings.hide_on_mobile) {
    api.onPageChange(() => {
      if (!document.getElementById('breadcrumb-mobile-styles')) {
        const style = document.createElement('style');
        style.id = 'breadcrumb-mobile-styles';
        style.textContent = `
          @media (max-width: 767px) {
            [data-breadcrumb-added="true"] {
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        `;
        document.head.appendChild(style);
      }
    });
  }
});