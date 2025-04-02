import { apiInitializer } from "discourse/lib/api";
import Category from "discourse/models/category";

export default apiInitializer("0.11.1", (api) => {
  // Debug log function with prefixed messages
  const debug = (message, data = null) => {
    console.log(`[CategoryBreadcrumb] ${message}`, data || '');
  };
  
  // Error log function
  const logError = (message, error) => {
    console.error(`[CategoryBreadcrumb] ${message}`, error);
  };

  // Function to safely get categories
  const getCategories = () => {
    try {
      return api.container.lookup("site:main").categories || [];
    } catch (e) {
      logError("Error getting categories:", e);
      return [];
    }
  };

  // Function to build category breadcrumb
  const buildCategoryBreadcrumb = (categoryId) => {
    try {
      const allCategories = getCategories();
      if (!allCategories.length) return null;

      debug(`Building breadcrumb for category ID: ${categoryId}`);
      
      // Build category chain
      const chain = [];
      let currentId = categoryId;

      // Build the chain from leaf to root
      while (currentId) {
        const category = allCategories.find(c => c.id === parseInt(currentId, 10));
        if (!category) {
          debug(`Category not found for ID: ${currentId}`);
          break;
        }
        
        chain.unshift({
          id: category.id,
          name: category.name,
          color: category.color,
          slug: category.slug,
          parentId: category.parent_category_id
        });
        
        debug(`Added to chain: ${category.name} (ID: ${category.id}, Parent: ${category.parent_category_id || 'none'})`);
        
        currentId = category.parent_category_id;
      }

      debug(`Complete category chain:`, chain);
      return chain;
    } catch (e) {
      logError("Error building category breadcrumb:", e);
      return null;
    }
  };

  // Function to update topic list items with breadcrumbs
  const updateTopicListItems = () => {
    try {
      // Get current route
      const controller = api.container.lookup("controller:application");
      const currentRoute = controller?.currentRouteName || "";
      
      debug(`Current route: ${currentRoute}`);
      
      // Skip on these routes
      const skipRoutes = [
        "discovery.categories",  // Homepage with categories
      ];
      
      if (skipRoutes.some(route => currentRoute === route)) {
        debug(`Skipping breadcrumbs on excluded route: ${currentRoute}`);
        return;
      }

      // If on a category page, check if it's a parent category
      if (currentRoute.startsWith("discovery.category")) {
        const topicsController = api.container.lookup("controller:discovery/topics");
        if (topicsController && topicsController.category) {
          const currentCategory = topicsController.category;
          debug(`On category page: ${currentCategory.name} (ID: ${currentCategory.id})`);
          
          // Skip if we're on a top-level category with no parent
          if (!currentCategory.parent_category_id) {
            debug("Skipping breadcrumbs on top-level category page");
            return;
          }
        }
      }
      
      // Find all topic list elements
      const topicListItems = document.querySelectorAll(".topic-list-item");
      debug(`Found ${topicListItems.length} topic list items`);

      // Process each topic list item
      topicListItems.forEach((item, index) => {
        try {
          // Find the category wrapper and badge
          const categoryCell = item.querySelector("td.category");
          if (!categoryCell) {
            debug(`No category cell found in topic #${index + 1}`);
            return;
          }
          
          // Check if already processed
          if (categoryCell.dataset.breadcrumbProcessed === "true") {
            debug(`Topic #${index + 1} already processed`);
            return;
          }
          
          const badgeWrapper = categoryCell.querySelector(".badge-wrapper");
          if (!badgeWrapper) {
            debug(`No badge wrapper found in topic #${index + 1}`);
            return;
          }
          
          // Find the element with category id
          const categoryElement = badgeWrapper.querySelector("[data-category-id]");
          if (!categoryElement) {
            debug(`No element with category ID found in topic #${index + 1}`);
            return;
          }
          
          const categoryId = categoryElement.dataset.categoryId;
          if (!categoryId) {
            debug(`No category ID in data attribute for topic #${index + 1}`);
            return;
          }
          
          debug(`Topic #${index + 1} has category ID: ${categoryId}`);
          
          // Find the element containing the category name
          const nameElem = badgeWrapper.querySelector(".badge-category__name");
          if (!nameElem) {
            debug(`No category name element found in topic #${index + 1}`);
            return;
          }
          
          // Get original category name
          const originalName = nameElem.textContent.trim();
          debug(`Topic #${index + 1} original category name: "${originalName}"`);
          
          // Get category chain
          const chain = buildCategoryBreadcrumb(parseInt(categoryId, 10));
          if (!chain || chain.length <= 1) {
            debug(`No parent categories found for topic #${index + 1}`);
            return;
          }
          
          // Build breadcrumb text (exclude the last category since it's already shown)
          const parentCategories = chain.slice(0, -1);
          if (!parentCategories.length) {
            debug(`No parent categories in chain for topic #${index + 1}`);
            return;
          }
          
          debug(`Parent categories for topic #${index + 1}:`, parentCategories);
          
          // Apply max depth if specified
          const maxDepth = settings.max_depth || 0;
          const categoriesToShow = maxDepth > 0 
            ? parentCategories.slice(-maxDepth) 
            : parentCategories;
          
          const separator = settings.breadcrumb_separator || " › ";
          const breadcrumbPrefix = categoriesToShow.map(cat => cat.name).join(separator);
          
          // Update with breadcrumb
          const fullBreadcrumb = `${breadcrumbPrefix}${separator}${originalName}`;
          nameElem.textContent = fullBreadcrumb;
          debug(`Updated topic #${index + 1} with breadcrumb: "${fullBreadcrumb}"`);
          
          // Mark as processed
          categoryCell.dataset.breadcrumbProcessed = "true";
          
        } catch (itemError) {
          logError(`Error processing topic #${index + 1}:`, itemError);
        }
      });

      // Process search results too
      const searchResults = document.querySelectorAll(".search-result-topic");
      debug(`Found ${searchResults.length} search results`);
      
      searchResults.forEach((result, index) => {
        try {
          // Skip if already processed
          if (result.dataset.breadcrumbProcessed === "true") return;
          
          const badgeWrapper = result.querySelector(".badge-wrapper");
          if (!badgeWrapper) return;
          
          const categoryElement = badgeWrapper.querySelector("[data-category-id]");
          if (!categoryElement) return;
          
          const categoryId = categoryElement.dataset.categoryId;
          if (!categoryId) return;
          
          // Find name element
          const nameElem = badgeWrapper.querySelector(".badge-category__name");
          if (!nameElem) return;
          
          // Get original name
          const originalName = nameElem.textContent.trim();
          
          // Build breadcrumb
          const chain = buildCategoryBreadcrumb(parseInt(categoryId, 10));
          if (!chain || chain.length <= 1) return;
          
          const parentCategories = chain.slice(0, -1);
          if (!parentCategories.length) return;
          
          // Apply max depth if specified
          const maxDepth = settings.max_depth || 0;
          const categoriesToShow = maxDepth > 0 
            ? parentCategories.slice(-maxDepth) 
            : parentCategories;
          
          const separator = settings.breadcrumb_separator || " › ";
          const breadcrumbPrefix = categoriesToShow.map(cat => cat.name).join(separator);
          
          // Update text
          nameElem.textContent = `${breadcrumbPrefix}${separator}${originalName}`;
          
          // Mark as processed
          result.dataset.breadcrumbProcessed = "true";
          
          debug(`Updated search result #${index + 1} with breadcrumb`);
        } catch (searchError) {
          logError(`Error processing search result #${index + 1}:`, searchError);
        }
      });
      
    } catch (e) {
      logError("Error updating topic list items:", e);
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
          // Check if any relevant nodes were added
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === 1 && (
                node.classList?.contains('topic-list-item') || 
                node.classList?.contains('search-result-topic') ||
                node.querySelector?.('.topic-list-item, .search-result-topic')
            )) {
              shouldUpdate = true;
              break;
            }
          }
        }
        
        if (shouldUpdate) break;
      }
      
      if (shouldUpdate) {
        debug("New content detected, updating breadcrumbs");
        setTimeout(updateTopicListItems, 50);
      }
    });
    
    // Observe the body for any changes to catch all dynamic updates
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    debug("Mutation observer set up");
    
    // Store observer reference
    window.breadcrumbObserver = observer;
    
    // Force refresh for initial load
    setTimeout(updateTopicListItems, 100);
  };

  // Initialize on page change with multiple retries for loading content
  api.onPageChange(() => {
    debug("Page changed, updating breadcrumbs");
    
    // Multiple attempts to catch content at different load stages
    setTimeout(updateTopicListItems, 100);
    setTimeout(updateTopicListItems, 500);
    setTimeout(updateTopicListItems, 1000);
    
    setupMutationObserver();
  });

  // Add debug button
  api.onPageChange(() => {
    if (!document.getElementById('debug-breadcrumbs')) {
      const button = document.createElement('button');
      button.id = 'debug-breadcrumbs';
      button.textContent = 'Apply Breadcrumbs';
      button.style = 'position: fixed; bottom: 10px; right: 10px; z-index: 9999; padding: 5px 10px;';
      button.onclick = () => {
        debug("Manual breadcrumb application triggered");
        updateTopicListItems();
      };
      document.body.appendChild(button);
    }
  });
});