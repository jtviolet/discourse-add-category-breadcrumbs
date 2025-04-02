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
      
      // Try multiple selector combinations to find category badges
      const selectors = [
        // Topic list selectors
        ".topic-list .topic-list-item td.category .badge-wrapper",
        ".topic-list-item .badge-wrapper",
        // Search result selectors
        ".search-results .search-result-topic .badge-wrapper",
        // Latest topics list selectors
        ".latest-topic-list-item .badge-wrapper"
      ];
      
      // Find and process all badge wrappers
      let processedAny = false;
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(wrapper => {
          // Skip if already processed
          if (wrapper.dataset.breadcrumbAdded === "true") return;
          
          // Find category ID - it might be on a child element
          const categoryBadge = wrapper.querySelector("[data-category-id]");
          if (!categoryBadge) return;
          
          const categoryId = categoryBadge.dataset.categoryId;
          if (!categoryId) return;
          
          // Get the element containing the category name
          const nameElem = wrapper.querySelector(".badge-category__name");
          if (!nameElem) return;
          
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
          const originalName = nameElem.textContent.trim();
          const fullBreadcrumb = `${breadcrumbPrefix}${separator}${originalName}`;
          
          // Update with breadcrumb - try different approaches based on badge type
          if (wrapper.classList.contains("bullet")) {
            // For bullet style badges
            nameElem.textContent = fullBreadcrumb;
          } else if (wrapper.classList.contains("bar")) {
            // For bar style badges
            nameElem.textContent = fullBreadcrumb;
          } else if (wrapper.classList.contains("box")) {
            // For box style badges
            nameElem.textContent = fullBreadcrumb;
          } else {
            // Fall back to modifying the name element directly
            nameElem.textContent = fullBreadcrumb;
          }
          
          // Update tooltip if applicable
          if (wrapper.title) {
            wrapper.title = fullBreadcrumb;
          }
          
          // Mark as processed
          wrapper.dataset.breadcrumbAdded = "true";
          processedAny = true;
        });
      });
      
      if (processedAny) {
        console.log("Category breadcrumbs added to topic list");
      }
    } catch (e) {
      console.warn("Error updating topic list items:", e);
    }
  };

  // Set up a mutation observer to catch dynamically loaded content
  const setupMutationObserver = () => {
    // Remove any existing observer
    if (window.breadcrumbObserver) {
      window.breadcrumbObserver.disconnect();
    }
    
    const observer = new MutationObserver(mutations => {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length) {
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

  // Initialize on page change with multiple retries for loading content
  api.onPageChange(() => {
    // Try multiple times to catch late-loading content
    setTimeout(updateTopicListItems, 100);
    setTimeout(updateTopicListItems, 500);
    setTimeout(updateTopicListItems, 1000);
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
            [data-breadcrumb-added="true"] .badge-category__name {
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
  
  // Add debug button in development
  if (window.location.hostname === "localhost" || window.location.hostname.includes("dev")) {
    api.onPageChange(() => {
      if (!document.getElementById('debug-breadcrumbs')) {
        const button = document.createElement('button');
        button.id = 'debug-breadcrumbs';
        button.textContent = 'Apply Breadcrumbs';
        button.style = 'position: fixed; bottom: 10px; right: 10px; z-index: 9999;';
        button.onclick = updateTopicListItems;
        document.body.appendChild(button);
      }
    });
  }
});