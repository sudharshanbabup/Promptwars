import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function GroceryChecklist({ 
  editableGroceryList, 
  checkedItems, 
  setCheckedItems, 
  toggleOnHand, 
  deleteGroceryItem, 
  addGroceryItem, 
  remainingCostToBuy, 
  currencySymbol 
}) {
  return (
    <section className="sidebar-card grocery-checklist-widget animate-fade-in">
      <div className="checklist-hdr-row">
        <h3>Grocery List</h3>
        <span className="cost-counter-badge">
          {currencySymbol}{remainingCostToBuy} remaining
        </span>
      </div>
      
      {/* Live Add Item */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          const nameInput = e.target.elements.gName;
          const amtInput = e.target.elements.gAmt;
          addGroceryItem(nameInput.value, amtInput.value);
          nameInput.value = '';
          amtInput.value = '';
        }}
        className="add-grocery-form"
      >
        <input name="gName" type="text" placeholder="Add ingredient..." required className="add-input" />
        <input name="gAmt" type="text" placeholder="Qty" className="add-qty-input" />
        <button type="submit" className="btn-add-item"><Plus className="add-icon" /></button>
      </form>

      {/* Categorized Grocery List */}
      <div className="grocery-categories-stack">
        {['Produce', 'Protein', 'Dairy', 'Pantry', 'Other'].map(cat => {
          const itemsInCat = editableGroceryList.filter(item => item.category === cat);
          if (itemsInCat.length === 0) return null;
          
          return (
            <div key={cat} className="grocery-category-group">
              <h4>{cat}</h4>
              <div className="category-items-list">
                {itemsInCat.map((item) => {
                  const isChecked = !!checkedItems[item.id];
                  
                  return (
                    <div key={item.id} className={`grocery-row-item ${isChecked ? 'checked' : ''} ${item.onHand ? 'pantry-have' : ''}`}>
                      {/* Strike-off Checkbox */}
                      <label className="checkbox-label-container">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => setCheckedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                          disabled={item.onHand}
                        />
                        <span className="custom-checkmark"></span>
                      </label>

                      <div className="grocery-item-details">
                        <span className="grocery-item-name">{item.item}</span>
                        <span className="grocery-item-amount">{item.amount}</span>
                      </div>

                      {/* On Hand status badge */}
                      <button 
                        onClick={() => toggleOnHand(item.id)} 
                        className={`btn-pantry-toggle ${item.onHand ? 'have' : 'need'}`}
                        title={item.onHand ? "I already have this in my pantry" : "I need to purchase this"}
                      >
                        {item.onHand ? 'have it' : 'need to buy'}
                      </button>

                      {/* Delete button */}
                      <button onClick={() => deleteGroceryItem(item.id)} className="btn-delete-grocery">
                        <Trash2 className="trash-icon" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
