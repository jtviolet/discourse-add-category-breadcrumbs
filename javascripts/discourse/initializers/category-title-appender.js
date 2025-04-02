// File: settings.yml
category_title_appendages:
  type: list
  default: ""
  description: "List of category ID and text to append pairs. Format: category_id,text_to_append (e.g., 19,Formerly Enterprise Auditor)"

// File: javascripts/discourse/initializers/category-title-appender.js
import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "category-title-appender",
  initialize() {
    withPluginApi("0.8.31", api => {
      // Parse settings into a map for quick lookup
      const appendageMap = new Map();
      
      // In theme components, settings are automatically injected globally
      // Convert the string setting to an array if it exists
      const appendagesList = settings.category_title_appendages ? 
                             settings.category_title_appendages.split("|") : 
                             [];
      
      appendagesList.forEach(item => {
        const [categoryId, textToAppend] = item.split(",").map(part => part.trim());
        
        if (categoryId && textToAppend) {
          appendageMap.set(categoryId, textToAppend);
        }
      });
      
      // Skip if no valid settings
      if (appendageMap.size === 0) return;
      
      // Use onPageChange to modify category titles
      api.onPageChange(() => {
        if (document.body.classList.contains("categories-list")) {
          // Process both category boxes and category rows
          updateCategoryElements();
        }
      });
      
      function updateCategoryElements() {
        // Handle category boxes (grid view)
        document.querySelectorAll(".category-box").forEach(categoryBox => {
          const categoryId = categoryBox.dataset.categoryId;
          
          if (categoryId && appendageMap.has(categoryId)) {
            const titleElement = categoryBox.querySelector(".category-box-heading");
            
            if (titleElement && !titleElement.querySelector(".category-title-appendage")) {
              const textToAppend = appendageMap.get(categoryId);
              appendTextToElement(titleElement, textToAppend);
            }
          }
        });
        
        // Handle category rows (list view)
        document.querySelectorAll(".category-list tbody tr.category").forEach(categoryRow => {
          const categoryId = categoryRow.dataset.categoryId;
          
          if (categoryId && appendageMap.has(categoryId)) {
            const titleElement = categoryRow.querySelector(".category-name");
            
            if (titleElement && !titleElement.querySelector(".category-title-appendage")) {
              const textToAppend = appendageMap.get(categoryId);
              appendTextToElement(titleElement, textToAppend);
            }
          }
        });
        
        // Handle subcategories
        document.querySelectorAll("[data-category-id]").forEach(element => {
          const categoryId = element.dataset.categoryId;
          
          if (categoryId && appendageMap.has(categoryId)) {
            // For subcategories in grid view
            const nameElement = element.querySelector(".category-name, .category-text-title");
            
            if (nameElement && !nameElement.querySelector(".category-title-appendage")) {
              const textToAppend = appendageMap.get(categoryId);
              appendTextToElement(nameElement, textToAppend);
            }
          }
        });
      }
      
      function appendTextToElement(element, text) {
        const appendageElement = document.createElement("div");
        appendageElement.className = "category-title-appendage";
        appendageElement.textContent = text;
        element.appendChild(appendageElement);
      }
      
      // Also run once on initialization with a slight delay
      // to ensure the DOM is fully loaded
      setTimeout(updateCategoryElements, 500);
    });
  }
};

// File: common/common.scss
.category-title-appendage {
  font-size: 0.8em;
  font-weight: normal;
  line-height: 1.4;
  margin-top: 5px;
  color: var(--primary-medium);
}