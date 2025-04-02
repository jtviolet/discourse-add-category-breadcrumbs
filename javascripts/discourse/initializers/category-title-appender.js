import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "category-title-appender",
  initialize() {
    withPluginApi("0.8.31", api => {
      // Parse settings into a map for quick lookup
      const appendageMap = new Map();
      
      // In theme components, settings are automatically injected globally
      (settings.category_title_appendages || []).forEach(item => {
        const [categoryId, textToAppend] = item.split(",").map(part => part.trim());
        
        if (categoryId && textToAppend) {
          appendageMap.set(categoryId, textToAppend);
        }
      });
      
      // Skip if no valid settings
      if (appendageMap.size === 0) return;
      
      // Add a decorator for category links
      api.decorateCategoryLinkTitle((element, categorySlug) => {
        // Only apply on category page
        if (!element || !categorySlug || !document.body.classList.contains("categories-list")) {
          return;
        }
        
        // Get the category ID from data attribute
        const categoryId = element.closest(".category")?.dataset.categoryId;
        
        if (categoryId && appendageMap.has(categoryId)) {
          // Get the text to append
          const textToAppend = appendageMap.get(categoryId);
          
          // Create and append a new line with the text
          const appendageElement = document.createElement("div");
          appendageElement.className = "category-title-appendage";
          appendageElement.textContent = textToAppend;
          
          // Add the appended text
          element.appendChild(appendageElement);
        }
      });
      
      // Alternative approach for category cards
      api.onPageChange(() => {
        if (document.body.classList.contains("categories-list")) {
          setTimeout(() => {
            document.querySelectorAll(".category-box").forEach(categoryBox => {
              const categoryId = categoryBox.dataset.categoryId;
              
              if (categoryId && appendageMap.has(categoryId)) {
                const titleElement = categoryBox.querySelector(".category-box-heading");
                
                if (titleElement && !titleElement.querySelector(".category-title-appendage")) {
                  const textToAppend = appendageMap.get(categoryId);
                  
                  const appendageElement = document.createElement("div");
                  appendageElement.className = "category-title-appendage";
                  appendageElement.textContent = textToAppend;
                  
                  titleElement.appendChild(appendageElement);
                }
              }
            });
          }, 100);
        }
      });
    });
  }
};